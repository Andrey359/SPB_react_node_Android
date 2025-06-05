// Маршруты для управления лицензиями
const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/license.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Проверка статуса лицензии пользователя (защищенный маршрут)
router.get(
  '/check',
  authMiddleware.protect,
  licenseController.checkLicense
);

// Получение информации о лицензии (защищенный маршрут)
router.get(
  '/',
  authMiddleware.protect,
  licenseController.getLicense
);

// Активация лицензии (только для администраторов)
router.post(
  '/activate',
  authMiddleware.protect,
  authMiddleware.authorize('admin'),
  licenseController.activateLicense
);

// Деактивация лицензии (только для администраторов)
router.post(
  '/deactivate',
  authMiddleware.protect,
  authMiddleware.authorize('admin'),
  licenseController.deactivateLicense
);

module.exports = router;