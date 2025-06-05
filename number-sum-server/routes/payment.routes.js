// Маршруты для управления платежами
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Создание нового платежа (требуется аутентификация)
router.post(
  '/',
  authMiddleware.protect,
  paymentController.createPayment
);

// Получение информации о платеже (требуется аутентификация)
router.get(
  '/:id',
  authMiddleware.protect,
  paymentController.getPayment
);

// Получение всех платежей пользователя (требуется аутентификация)
router.get(
  '/',
  authMiddleware.protect,
  paymentController.getUserPayments
);

// Проверка статуса платежа (требуется аутентификация)
router.get(
  '/:id/status',
  authMiddleware.protect,
  paymentController.checkPaymentStatus
);

// Callback для обработки уведомлений от СБП (публичный доступ)
router.post('/callback/:id', paymentController.paymentCallback);

// Проверка наличия недавних платежей
router.get('/check-recent', authMiddleware.protect, paymentController.checkRecentPayments);

module.exports = router;