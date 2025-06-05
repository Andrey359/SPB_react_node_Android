// Глобальный обработчик ошибок для приложения
const errorHandler = (err, req, res, next) => {
    console.error('Ошибка:', err);
  
    // Копируем объект ошибки, чтобы не изменять оригинал
    let error = { ...err };
    error.message = err.message;
  
    // Логирование полной трассировки ошибки для отладки
    console.error(err.stack);
  
    // Обработка специфичных ошибок SQLite
    if (err.code === 'SQLITE_CONSTRAINT') {
      const message = 'Запись с такими данными уже существует';
      error = new Error(message);
      error.statusCode = 400;
    }
  
    // Обработка ошибки "ресурс не найден"
    if (err.message.includes('not found')) {
      const message = 'Ресурс не найден';
      error = new Error(message);
      error.statusCode = 404;
    }
  
    // Обработка ошибок JWT токена
    if (err.name === 'JsonWebTokenError') {
      const message = 'Не авторизован для доступа к этому ресурсу';
      error = new Error(message);
      error.statusCode = 401;
    }
  
    // Обработка ошибки истечения срока действия токена
    if (err.name === 'TokenExpiredError') {
      const message = 'Сессия истекла, пожалуйста, войдите снова';
      error = new Error(message);
      error.statusCode = 401;
    }
  
    // Отправка ответа с ошибкой
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Ошибка сервера',
      // Включаем стек ошибки только в режиме разработки
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };
  
  module.exports = errorHandler;