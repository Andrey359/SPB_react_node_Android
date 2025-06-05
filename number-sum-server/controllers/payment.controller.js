// Контроллер для управления платежами
const Payment = require('../models/payment.model');
const sbpUtil = require('../utils/sbp.util');
const emailUtil = require('../utils/email.util');

// Создание нового платежа
exports.createPayment = async (req, res, next) => {
  try {
    const { amount = 10.00 } = req.body; // По умолчанию 10 рублей

    console.log(`[Платеж] Создание платежа для пользователя ID=${req.user.id}, сумма=${amount}`);

    // Создание нового платежа в базе данных
    const payment = new Payment({
      пользователь_id: req.user.id,
      сумма: amount,
      валюта: 'RUB',
      способ_оплаты: 'SBP',
      статус: 'pending'
    });

    await payment.save();

    // Получение ссылки на оплату от СБП
    const paymentLink = await sbpUtil.createPaymentLink({
      amount: payment.сумма,
      currency: payment.валюта,
      description: `Оплата приложения Number Sum`,
      orderId: payment.id,
      callbackUrl: `http://${req.get('host')}/api/payments/callback/${payment.id}`
    });

    // Обновление платежа с ID транзакции
    payment.транзакция_id = paymentLink.transactionId;
    await payment.save();

    console.log(`[Платеж] Платеж ${payment.id} создан, транзакция=${paymentLink.transactionId}`);

    // Возвращаем информацию о платеже и ссылку на оплату
    res.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentLink: paymentLink.url,
        amount: payment.сумма,
        currency: payment.валюта,
        status: payment.статус
      }
    });
  } catch (error) {
    console.error('[Платеж] Ошибка при создании платежа:', error);
    next(error);
  }
};

// Обработка callback от СБП при изменении статуса платежа
exports.paymentCallback = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, transaction_id, user_id } = req.body;
  
      console.log(`[СБП] Получен callback для платежа ${id}, статус=${status}`);
  
      // Для статического QR создаем новую запись платежа
      if (id === 'SUCCESS' && transaction_id === 'QR_STATIC_PAYMENT') {
        // Извлекаем ID пользователя из токена или из тела запроса
        const token = req.headers.authorization?.split(' ')[1];
        let userId = user_id || 1; // Используем ID из тела запроса, или 1 по умолчанию
  
        if (token && !user_id) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id;
          } catch (err) {
            console.log('Ошибка проверки токена, используем ID по умолчанию:', err.message);
          }
        }
  
        // Создаем новый платеж для статического QR
        const payment = new Payment({
          пользователь_id: userId,
          сумма: 10.00,
          валюта: 'RUB',
          способ_оплаты: 'SBP_STATIC_QR',
          транзакция_id: `QR_STATIC_PAYMENT_${Date.now()}`, // Генерируем уникальный ID
          статус: 'completed'
        });
  
        await payment.save();
        
        // Активируем лицензию
        await payment.activateLicense();
        
        return res.status(200).json({
          success: true,
          message: 'Оплата через статический QR успешно обработана',
          data: {
            id: payment.id,
            status: payment.статус,
            userId: payment.пользователь_id
          }
        });
      }
  
      // Остальной код обработки обычных платежей остается без изменений...
    } catch (error) {
      console.error('[СБП] Ошибка при обработке callback:', error);
      next(error);
    }
  };

// Получение информации о платеже
exports.getPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск платежа по ID
    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Платеж не найден'
      });
    }
    
    // Проверка принадлежит ли платеж текущему пользователю
    if (payment.пользователь_id !== req.user.id && req.user.роль !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'У вас нет доступа к этому платежу'
      });
    }
    
    // Возвращаем информацию о платеже
    res.status(200).json({
      success: true,
      data: {
        id: payment.id,
        user_id: payment.пользователь_id,
        amount: payment.сумма,
        currency: payment.валюта,
        payment_method: payment.способ_оплаты,
        transaction_id: payment.транзакция_id,
        status: payment.статус,
        created_at: payment.создан_в,
        updated_at: payment.обновлен_в
      }
    });
  } catch (error) {
    next(error);
  }
};

// Получение всех платежей пользователя
exports.getUserPayments = async (req, res, next) => {
  try {
    // Извлекаем ID пользователя из запроса
    const userId = req.user.id;
    
    // Получаем все платежи пользователя
    const payments = await Payment.findByUserId(userId);
    
    // Преобразуем данные для ответа
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.сумма,
      currency: payment.валюта,
      status: payment.статус,
      created_at: payment.создан_в
    }));
    
    // Возвращаем список платежей
    res.status(200).json({
      success: true,
      count: formattedPayments.length,
      data: formattedPayments
    });
  } catch (error) {
    next(error);
  }
};

// Проверка статуса платежа
exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск платежа по ID
    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Платеж не найден'
      });
    }
    
    // Проверка принадлежит ли платеж текущему пользователю
    if (payment.пользователь_id !== req.user.id && req.user.роль !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'У вас нет доступа к этому платежу'
      });
    }
    
    // Для платежей в состоянии "pending" проверяем актуальный статус в СБП
    if (payment.статус === 'pending' && payment.транзакция_id) {
      const currentStatus = await sbpUtil.checkPaymentStatus(payment.транзакция_id);
      
      // Если статус изменился, обновляем его в базе
      if (currentStatus !== payment.статус) {
        await payment.updateStatus(currentStatus);
      }
    }
    
    // Возвращаем текущий статус платежа
    res.status(200).json({
      success: true,
      data: {
        id: payment.id,
        status: payment.статус
      }
    });
  } catch (error) {
    next(error);
  }
};

// Проверка наличия недавних успешных платежей
exports.checkRecentPayments = async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Находим последний успешный платеж пользователя за последние 5 минут
      const recentTimestamp = new Date();
      recentTimestamp.setMinutes(recentTimestamp.getMinutes() - 5); // 5 минут назад
      
      const query = `
        SELECT * FROM платежи 
        WHERE пользователь_id = ? 
          AND статус = 'completed' 
          AND создан_в > ?
        ORDER BY создан_в DESC
        LIMIT 1
      `;
      
      db.get(query, [userId, recentTimestamp.toISOString()], (err, row) => {
        if (err) {
          console.error('Ошибка проверки платежей:', err);
          return res.status(500).json({
            success: false,
            error: 'Ошибка сервера при проверке платежей'
          });
        }
        
        return res.status(200).json({
          success: true,
          hasRecentPayment: !!row,
          data: row || null
        });
      });
    } catch (error) {
      console.error('Ошибка при проверке недавних платежей:', error);
      next(error);
    }
  };