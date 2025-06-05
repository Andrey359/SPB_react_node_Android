// Маршруты для аутентификации пользователей
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Регистрация нового пользователя
router.post('/register', authController.register);

// Верификация email
router.get('/verify/:token', authController.verifyEmail);

// Вход пользователя
router.post('/login', authController.login);

// Выход пользователя
router.get('/logout', authController.logout);

// Получение данных текущего пользователя (защищенный маршрут)
router.get('/me', authMiddleware.protect, authController.getMe);

// Запрос на сброс пароля
router.post('/forgot-password', authController.forgotPassword);

// Сброс пароля
router.post('/reset-password/:token', authController.resetPassword);

// Повторная отправка письма с подтверждением
router.post('/resend-verification', authMiddleware.protect, authController.resendVerification);

module.exports = router;