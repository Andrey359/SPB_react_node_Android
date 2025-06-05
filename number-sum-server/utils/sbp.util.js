// Утилита для работы с Системой Быстрых Платежей (СБП)
// УЧЕБНАЯ ИМИТАЦИЯ - для демонстрационных целей
const crypto = require('crypto');
const qrcode = require('qrcode');

// Генерация QR-кода для демонстрационных целей
async function generateQRCode(data) {
  try {
    return await qrcode.toDataURL(data);
  } catch (error) {
    console.error('Ошибка при генерации QR-кода:', error);
    // Возвращаем пустой пиксель в качестве запасного варианта
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }
}

// Создание демонстрационной ссылки на оплату через СБП
exports.createPaymentLink = async ({ amount, currency, description, orderId, callbackUrl }) => {
  try {
    // Генерация уникального идентификатора транзакции
    const transactionId = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Создаем данные для QR-кода в формате, похожем на СБП
    const paymentData = {
      version: "01",
      bankName: "DEMO-BANK",
      bankPaymentUrl: "https://demo-sbp.ru/payment",
      merchantId: "DEMO000000000",
      amount: amount,
      currency: currency,
      description: description,
      orderId: orderId,
      transactionId: transactionId
    };
    
    // Генерируем URL для оплаты (для учебных целей)
    const paymentUrl = `/demo-sbp/pay/${transactionId}?amount=${amount}&currency=${currency}`;
    
    // Генерируем QR-код на основе JSON данных
    const qrCodeData = await generateQRCode(JSON.stringify(paymentData));
    
    console.log(`[ДЕМО] Создана учебная ссылка на оплату через СБП: ${paymentUrl}`);
    
    return {
      transactionId: transactionId,
      url: paymentUrl,
      qrCode: qrCodeData
    };
  } catch (error) {
    console.error('Ошибка при создании демонстрационной ссылки на оплату:', error);
    throw new Error('Не удалось создать ссылку на оплату');
  }
};

// Имитация проверки статуса платежа 
exports.checkPaymentStatus = async (transactionId) => {
  try {
    // В учебных целях мы делаем вид, что проверяем статус платежа
    console.log(`[ДЕМО] Проверка статуса платежа ${transactionId}`);
    
    // Для учебных целей используем локальное хранилище статусов в памяти
    // или полагаемся на время жизни транзакции для определения статуса
    
    // Извлекаем временную метку из transactionId (формат T{timestamp}{random})
    const timestampStr = transactionId.substring(1, 14); // Предполагаем, что timestamp - это 13 символов после T
    const timestamp = parseInt(timestampStr);
    const currentTime = Date.now();
    
    // Если прошло меньше 30 секунд - платеж в обработке
    if (currentTime - timestamp < 30000) {
      return 'pending';
    }
    // Если прошло от 30 секунд до 1 минуты - 80% шанс завершения, 20% отказа
    else if (currentTime - timestamp < 60000) {
      return Math.random() < 0.8 ? 'completed' : 'failed';
    }
    // Если прошло больше 1 минуты - платеж завершен успешно
    else {
      return 'completed';
    }
  } catch (error) {
    console.error('Ошибка при проверке демонстрационного статуса платежа:', error);
    throw new Error('Не удалось проверить статус платежа');
  }
};

// Имитация проверки подписи запроса
exports.verifySignature = (req) => {
  try {
    // Для учебных целей всегда считаем подпись верной
    console.log('[ДЕМО] Проверка подписи запроса');
    return true;
  } catch (error) {
    console.error('Ошибка при проверке подписи:', error);
    return false;
  }
};

// Создание QR-кода для оплаты 
exports.createQRCode = async ({ amount, currency, description, orderId }) => {
  try {
    // Генерация уникального идентификатора транзакции
    const transactionId = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Создаем данные для QR-кода (для учебных целей)
    const qrData = {
      sbpMerchantId: "DEMO000000000",
      order: orderId,
      amount: amount,
      currency: currency,
      description: description,
      paymentPurpose: "Оплата приложения Number Sum",
      qrType: "02"
    };
    
    // Генерируем QR-код с данными
    const qrCodeImage = await generateQRCode(JSON.stringify(qrData));
    
    console.log(`[ДЕМО] Создан учебный QR-код для оплаты через СБП`);
    
    return {
      transactionId: transactionId,
      qrCode: qrCodeImage,
      qrCodeUrl: `/demo-sbp/qr/${transactionId}`
    };
  } catch (error) {
    console.error('Ошибка при создании учебного QR-кода для оплаты:', error);
    throw new Error('Не удалось создать QR-код для оплаты');
  }
};

// Получение информации о транзакции (для учебных целей)
exports.getTransactionInfo = async (transactionId) => {
  // Эта функция возвращает фиктивную информацию о транзакции для учебных целей
  return {
    transactionId: transactionId,
    status: await this.checkPaymentStatus(transactionId),
    createdAt: new Date(parseInt(transactionId.substring(1, 14))),
    bankName: "ДЕМО БАНК",
    payerName: "Тестовый Пользователь",
    payerPhone: "+7XXXXXXXXXX"
  };
};