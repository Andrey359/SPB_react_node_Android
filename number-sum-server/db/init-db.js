// Скрипт для инициализации базы данных
const db = require('../config/db.config');

// Функция для создания таблиц
function initDatabase() {
  console.log('Инициализация базы данных...');

  // Создание таблицы пользователей
  db.run(`CREATE TABLE IF NOT EXISTS пользователи (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    логин TEXT UNIQUE NOT NULL,
    пароль TEXT NOT NULL,
    подтвержден BOOLEAN DEFAULT FALSE,
    токен_подтверждения TEXT,
    токен_сброса TEXT,
    срок_токена_сброса DATETIME,
    роль TEXT DEFAULT 'user',
    создан_в DATETIME DEFAULT CURRENT_TIMESTAMP,
    обновлен_в DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы пользователи:', err.message);
    } else {
      console.log('Таблица пользователи успешно создана или уже существует');
    }
  });

  // Создание таблицы платежей
  db.run(`CREATE TABLE IF NOT EXISTS платежи (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    пользователь_id INTEGER NOT NULL,
    сумма REAL DEFAULT 10.00,
    валюта TEXT DEFAULT 'RUB',
    способ_оплаты TEXT DEFAULT 'SBP',
    транзакция_id TEXT,
    статус TEXT DEFAULT 'pending',
    создан_в DATETIME DEFAULT CURRENT_TIMESTAMP,
    обновлен_в DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (пользователь_id) REFERENCES пользователи (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы платежи:', err.message);
    } else {
      console.log('Таблица платежи успешно создана или уже существует');
    }
  });

  // Создание таблицы лицензий
  db.run(`CREATE TABLE IF NOT EXISTS лицензии (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    пользователь_id INTEGER UNIQUE NOT NULL,
    активна BOOLEAN DEFAULT FALSE,
    дата_активации DATETIME,
    дата_окончания DATETIME,
    создан_в DATETIME DEFAULT CURRENT_TIMESTAMP,
    обновлен_в DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (пользователь_id) REFERENCES пользователи (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы лицензии:', err.message);
    } else {
      console.log('Таблица лицензии успешно создана или уже существует');
    }
  });
}

// Запуск инициализации при прямом вызове скрипта
if (require.main === module) {
  initDatabase();
  
  // Закрываем соединение после инициализации
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Ошибка при закрытии соединения с базой данных:', err.message);
      } else {
        console.log('Соединение с базой данных закрыто');
      }
      process.exit(0);
    });
  }, 1000);
}

module.exports = { initDatabase };