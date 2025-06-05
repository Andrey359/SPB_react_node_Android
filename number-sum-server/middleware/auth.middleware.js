// Модуль middleware для аутентификации и авторизации
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware для защиты маршрутов (проверка токена)
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Получение токена из заголовка Authorization или из cookie
    if (
      req.headers && 
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Извлекаем токен из заголовка авторизации (Bearer {token})
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2) {
        token = parts[1];
      }
    } else if (req.cookies && req.cookies.token) {
      // Извлекаем токен из cookie, если он там есть
      token = req.cookies.token;
    }

    // Если токен отсутствует, отправляем ошибку 401 (Unauthorized)
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Не авторизован для доступа к этому ресурсу'
      });
    }

    try {
      // Верификация токена с использованием секретного ключа
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Поиск пользователя по ID из токена
      const user = await User.findById(decoded.id);

      // Если пользователь не найден, отправляем ошибку
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Пользователь с этим токеном не найден'
        });
      }

      // Добавление данных пользователя в объект запроса для последующих обработчиков
      req.user = {
        id: user.id,
        email: user.email,
        логин: user.логин,
        роль: user.роль,
        подтвержден: user.подтвержден
      };

      // Передаем управление следующему middleware
      next();
    } catch (error) {
      // В случае ошибки верификации токена (истек, недействителен и т.д.)
      return res.status(401).json({
        success: false,
        error: 'Не авторизован для доступа к этому ресурсу'
      });
    }
  } catch (error) {
    // Передаем ошибку глобальному обработчику
    next(error);
  }
};

// Middleware для проверки роли пользователя
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Проверяем, имеет ли пользователь необходимую роль
    if (!roles.includes(req.user.роль)) {
      return res.status(403).json({
        success: false,
        error: 'У вас нет прав на выполнение этого действия'
      });
    }
    next();
  };
};

// Middleware для проверки, что пользователь подтвердил email
exports.verifiedOnly = (req, res, next) => {
  // Проверяем, подтвердил ли пользователь свой email
  if (!req.user.подтвержден) {
    return res.status(403).json({
      success: false,
      error: 'Для выполнения этого действия необходимо подтвердить email'
    });
  }
  next();
};