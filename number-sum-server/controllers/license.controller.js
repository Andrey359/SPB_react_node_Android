// Контроллер для управления лицензиями
const License = require('../models/license.model');

// Проверка статуса лицензии пользователя
exports.checkLicense = async (req, res, next) => {
  try {
    // Поиск лицензии по ID пользователя из объекта req.user (добавлен middleware auth.protect)
    const license = await License.findByUserId(req.user.id);

    // Если лицензия не найдена, возвращаем соответствующий ответ
    if (!license) {
      return res.status(200).json({
        success: true,
        data: {
          hasLicense: false,
          message: 'У вас нет лицензии на использование приложения'
        }
      });
    }

    // Проверка действительности лицензии
    const isValid = license.isValid();

    // Формируем ответ на основе статуса лицензии
    res.status(200).json({
      success: true,
      data: {
        hasLicense: isValid,
        message: isValid 
          ? 'У вас есть действующая лицензия на использование приложения' 
          : 'Ваша лицензия недействительна или истекла',
        licenseDetails: {
          id: license.id,
          is_active: license.активна,
          activation_date: license.дата_активации,
          expiration_date: license.дата_окончания
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Получение информации о лицензии (для мобильного приложения)
exports.getLicense = async (req, res, next) => {
  try {
    // Поиск лицензии по ID пользователя
    const license = await License.findByUserId(req.user.id);

    // Если лицензия не найдена, возвращаем ошибку 404
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'Лицензия не найдена'
      });
    }

    // Проверка действительности лицензии
    const isValid = license.isValid();

    // Формируем детальный ответ о лицензии
    res.status(200).json({
      success: true,
      data: {
        id: license.id,
        is_active: license.активна,
        activation_date: license.дата_активации,
        expiration_date: license.дата_окончания,
        is_valid: isValid
      }
    });
  } catch (error) {
    next(error);
  }
};

// Активация лицензии (для тестирования или администраторских целей)
exports.activateLicense = async (req, res, next) => {
  try {
    // Проверка прав доступа (только администратор)
    if (req.user.роль !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'У вас нет прав на выполнение этого действия'
      });
    }

    const { userId } = req.body;

    // Поиск лицензии по ID пользователя
    let license = await License.findByUserId(userId);

    if (!license) {
      // Создание новой лицензии, если она не существует
      license = new License({
        пользователь_id: userId,
        активна: true,
        дата_активации: new Date()
      });

      await license.save();
    } else {
      // Активация существующей лицензии
      await license.activate();
    }

    // Возвращаем информацию об активированной лицензии
    res.status(200).json({
      success: true,
      data: {
        id: license.id,
        user_id: license.пользователь_id,
        is_active: license.активна,
        activation_date: license.дата_активации,
        expiration_date: license.дата_окончания
      }
    });
  } catch (error) {
    next(error);
  }
};

// Деактивация лицензии (для администраторских целей)
exports.deactivateLicense = async (req, res, next) => {
  try {
    // Проверка прав доступа (только администратор)
    if (req.user.роль !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'У вас нет прав на выполнение этого действия'
      });
    }

    const { userId } = req.body;

    // Поиск лицензии по ID пользователя
    const license = await License.findByUserId(userId);

    // Если лицензия не найдена, возвращаем ошибку 404
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'Лицензия не найдена'
      });
    }

    // Деактивация лицензии
    await license.deactivate();

    // Возвращаем обновленную информацию о лицензии
    res.status(200).json({
      success: true,
      data: {
        id: license.id,
        user_id: license.пользователь_id,
        is_active: license.активна,
        activation_date: license.дата_активации,
        expiration_date: license.дата_окончания
      }
    });
  } catch (error) {
    next(error);
  }
};