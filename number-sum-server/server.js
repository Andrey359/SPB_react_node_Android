// Основной файл сервера
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');

// Загрузка переменных окружения из файла .env
dotenv.config();

// Создаем приложение Express
const app = express();

// Для доверия прокси (Ngrok)
app.set('trust proxy', 1);

// Инициализация базы данных
const { initDatabase } = require('./db/init-db');
initDatabase();

// Настройка безопасности
app.use(
  helmet({
    contentSecurityPolicy: false, // Отключаем CSP для упрощения разработки
    hsts: false, // Отключаем HSTS для локальной разработки
    xssFilter: true, // Включаем фильтр XSS атак
    noSniff: true, // Запрещаем MIME-сниффинг
    ieNoOpen: true, // Запрещаем IE открывать вложения
    frameguard: true // Защита от clickjacking
  })
);

//Комплекс защиты
app.use(xss()); // Защита от XSS атак
app.use(hpp()); // Защита от HTTP Parameter Pollution
app.use(compression());

// Настройка CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: '*', // Разрешаем запросы от любого источника
  credentials: true // Разрешаем передачу учетных данных (cookies, headers и т.д.)
}));

// Настройка парсеров данных
app.use(express.json()); // Парсинг JSON
app.use(express.urlencoded({ extended: true })); // Парсинг URL-encoded данных

// Лимитирование запросов для защиты от DDoS атак
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 1000, // лимит 1000 запросов в минуту
    message: {
      error: 'Превышено количество запросов. Пожалуйста, попробуйте позже.'
    }
  });
// Применять лимит только к определенным маршрутам, не включая аутентификацию
app.use('/api/payments/', limiter); // Лимит только на платежи

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Кэширование на 1 день
  setHeaders: (res, path) => {
    // Особые настройки для APK файлов
    if (path.endsWith('.apk')) {
      // Кэшируем APK на 7 дней
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

 //машруты
app.get('/verification-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verification-success.html'));
  });

// Настройка маршрутов API
const authRoutes = require('./routes/auth.routes');
const paymentRoutes = require('./routes/payment.routes');
const licenseRoutes = require('./routes/license.routes');

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
// Публичный маршрут для проверки статуса платежа
app.get('/api/payment-status/:id', (req, res) => {
  const { id } = req.params;
  const sbpUtil = require('./utils/sbp.util');
  
  // Используем утилиту sbp для проверки статуса платежа
  sbpUtil.checkPaymentStatus(id)
    .then(status => {
      res.json({
        success: true,
        status: status
      });
    })
    .catch(error => {
      console.error(`Ошибка при проверке статуса платежа ${id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Не удалось проверить статус платежа'
      });
    });
});

app.use('/api/license', licenseRoutes);

// Специальный маршрут для скачивания APK
app.get('/downloads/number-sum.apk', (req, res) => {
  const apkPath = path.join(__dirname, 'public', 'downloads', 'number-sum.apk');
  const stat = fs.statSync(apkPath);
  
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename=number-sum.apk');
  
  // Поддержка возобновления загрузки
  if (req.headers.range) {
    const range = req.headers.range;
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0]);
    const end = parts[1] ? parseInt(parts[1]) : stat.size - 1;
    
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    res.status(206);
    
    fs.createReadStream(apkPath, { start, end }).pipe(res);
  } else {
    res.setHeader('Accept-Ranges', 'bytes');
    fs.createReadStream(apkPath).pipe(res);
  }
});

// Обработка демо-запросов СБП
app.get('/demo-sbp/pay/:transactionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo-sbp', 'pay.html'));
});

// Обработка запросов для QR-кодов
app.get('/api/payments/qr/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const amount = req.query.amount || '10.00';
    
    // Генерируем QR-код для оплаты
    const sbpUtil = require('./utils/sbp.util');
    const qrData = await sbpUtil.createQRCode({
      amount,
      currency: 'RUB',
      description: 'Оплата приложения Number Sum',
      orderId
    });
    
    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    console.error('Ошибка при создании QR-кода:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось создать QR-код для оплаты'
    });
  }
});

// Обработка колбэков от СБП (упрощенная версия)
app.post('/api/payments/callback/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`[СБП] Получен callback для транзакции ${id}, статус=${status}`);
  
  // В реальном приложении здесь будет обновление статуса платежа в базе данных
  
  res.json({
    success: true,
    message: 'Статус платежа обновлен'
  });
});

// Обработчик ошибок
const errorHandler = require('./middleware/error.middleware');
app.use(errorHandler);

// Маршрут для всех остальных запросов - отправляем index.html (для SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Определение порта для сервера
const PORT = process.env.PORT || 3000;

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Режим: ${process.env.NODE_ENV || 'development'}`);
});

//таймаут для более стабильной работы через VPN
server.timeout = 120000;

// Обработка необработанных исключений
process.on('unhandledRejection', (err) => {
  console.log(`Необработанное отклонение промиса: ${err.message}`);
  console.error(err.stack);
  // При необходимости, можно закрыть сервер в случае критической ошибки
  // server.close(() => process.exit(1));
});

// Обработка прерываний процесса
process.on('SIGINT', () => {
  console.log('Получен сигнал SIGINT. Завершение работы сервера...');
  server.close(() => {
    console.log('Сервер остановлен.');
    process.exit(0);
  });
});

// Экспорт для тестирования
module.exports = app;

setInterval(() => {
  console.log(new Date().toISOString() + ': Проверка активности соединения');
}, 60000); // Проверка каждую минуту