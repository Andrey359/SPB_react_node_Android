// Контроллер для управления аутентификацией пользователей
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const emailUtil = require('../utils/email.util');

// Регистрация нового пользователя
exports.register = async (req, res, next) => {
    try {
      const { email, password, username } = req.body;
  
      // Проверка, существует ли пользователь с таким email
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Пользователь с таким email уже существует'
        });
      }
  
      // Генерируем имя пользователя из email, если не предоставлено
      let autoUsername = username || email.split('@')[0];
  
      // Проверка, существует ли пользователь с таким именем пользователя
      const existingUsername = await User.findByUsername(autoUsername);
      if (existingUsername) {
        // Если имя занято, добавляем случайный номер
        const randomSuffix = Math.floor(Math.random() * 10000);
        autoUsername = `${autoUsername}${randomSuffix}`;
      }
  
      // Создание нового пользователя (сразу с подтвержденным статусом)
      const user = new User({
        email,
        логин: autoUsername,
        пароль: password,
        подтвержден: true // Пользователь сразу подтвержден
      });
  
      // Сохранение пользователя в базу данных
      await user.save();
  
      // Отправляем JWT токен для авторизации
      sendTokenResponse(user, 201, res);
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      next(error);
    }
  };

// Верификация email пользователя
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Поиск пользователя по токену верификации
    const user = await User.findByVerificationToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Недействительный токен верификации'
      });
    }

    // Обновление статуса верификации пользователя
    user.подтвержден = true;
    user.токен_подтверждения = null;
    await user.save();

    // Перенаправление на страницу успешной верификации
    return res.redirect('/verification-success');
  } catch (error) {
    next(error);
  }
};

// Вход пользователя
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Проверка ввода email и пароля
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Пожалуйста, введите email и пароль'
      });
    }

    // Поиск пользователя в базе данных
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверные учетные данные'
      });
    }

    // Проверка совпадения пароля
    const isMatch = await User.comparePassword(password, user.пароль);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Неверные учетные данные'
      });
    }

    // Создание и отправка JWT токена
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Выход пользователя (очистка куки с токеном)
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};

// Получение данных текущего пользователя
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.логин,
        is_verified: user.подтвержден,
        created_at: user.создан_в
      }
    });
  } catch (error) {
    next(error);
  }
};

// Запрос на сброс пароля
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Поиск пользователя по email
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователя с таким email не существует'
      });
    }

    // Генерация токена для сброса пароля
    const resetToken = user.generateResetToken();
    await user.save();

    // Отправка email со ссылкой для сброса пароля
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    try {
      await emailUtil.sendPasswordResetEmail({
        email: user.email,
        subject: 'Сброс пароля в Number Sum App',
        resetUrl
      });
    } catch (emailError) {
      console.error('Ошибка при отправке email для сброса пароля:', emailError);
      
      // Если email не отправлен, сбрасываем токен
      user.токен_сброса = null;
      user.срок_токена_сброса = null;
      await user.save();
      
      return res.status(500).json({
        success: false,
        error: 'Не удалось отправить email для сброса пароля'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email для сброса пароля отправлен'
    });
  } catch (error) {
    next(error);
  }
};

// Сброс пароля
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Поиск пользователя по токену сброса пароля
    const user = await User.findByResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Недействительный токен для сброса пароля'
      });
    }

    // Установка нового пароля
    user.пароль = password;
    user.токен_сброса = null;
    user.срок_токена_сброса = null;
    
    await user.save();

    // Отправка JWT токена для авторизации
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Функция для генерации JWT токена и отправки ответа
const sendTokenResponse = (user, statusCode, res) => {
  // Создание JWT токена
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.логин },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  // Добавление флага secure в продакшн режиме
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.логин,
        is_verified: user.подтвержден
      }
    });
};

// Повторная отправка письма с подтверждением
exports.resendVerification = async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      
      if (user.подтвержден) {
        return res.status(400).json({
          success: false,
          error: 'Email уже подтвержден'
        });
      }
      
      // Генерируем новый токен верификации
      const verificationToken = user.generateVerificationToken();
      await user.save();
      
      // Формируем URL для верификации
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
      
      // Отправляем email
      await emailUtil.sendVerificationEmail({
        email: user.email,
        subject: 'Подтверждение регистрации в Number Sum App',
        verificationUrl
      });
      
      res.status(200).json({
        success: true,
        message: 'Письмо для подтверждения успешно отправлено'
      });
    } catch (error) {
      console.error('Ошибка при повторной отправке письма:', error);
      next(error);
    }
  };