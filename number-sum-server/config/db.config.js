// Конфигурация подключения к базе данных SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Определяем путь к файлу базы данных
const dbPath = process.env.DB_PATH || path.join(__dirname, '../db/database.sqlite');

// Создаем подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к SQLite:', err.message);
    throw err;
  }
  console.log('Успешное подключение к SQLite');
});

// Включаем поддержку внешних ключей для обеспечения целостности данных
db.run('PRAGMA foreign_keys = ON');

// Экспортируем подключение для использования в других частях приложения
module.exports = db;