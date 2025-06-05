// Простой HTTP-сервер для запуска приложения
const app = require('./server');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`HTTP сервер запущен на порту ${PORT}`);
  console.log(`Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Адрес: http://localhost:${PORT}`);
});