// Модель пользователя для работы с базой данных
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db.config');

// Класс для работы с пользователями в базе данных
class User {
  constructor(userData) {
    this.id = userData.id || null;
    this.email = userData.email;
    this.логин = userData.логин || userData.username; // Поддержка обоих вариантов
    this.пароль = userData.пароль || userData.password; // Поддержка обоих вариантов
    this.подтвержден = userData.подтвержден || userData.is_verified || false;
    this.токен_подтверждения = userData.токен_подтверждения || userData.verification_token || null;
    this.токен_сброса = userData.токен_сброса || userData.reset_token || null;
    this.срок_токена_сброса = userData.срок_токена_сброса || userData.reset_token_expire || null;
    this.роль = userData.роль || userData.role || 'user';
    this.создан_в = userData.создан_в || userData.created_at || new Date();
    this.обновлен_в = userData.обновлен_в || userData.updated_at || new Date();
  }

  // Хеширование пароля перед сохранением
  async hashPassword() {
    const salt = await bcrypt.genSalt(10);
    this.пароль = await bcrypt.hash(this.пароль, salt);
    return this.пароль;
  }

  // Сравнение пароля с хешем
  static async comparePassword(enteredPassword, hashedPassword) {
    return await bcrypt.compare(enteredPassword, hashedPassword);
  }

  // Генерация токена для подтверждения email
  generateVerificationToken() {
    const token = crypto.randomBytes(20).toString('hex');
    this.токен_подтверждения = token;
    return token;
  }

  // Генерация токена для сброса пароля
  generateResetToken() {
    const token = crypto.randomBytes(20).toString('hex');
    this.токен_сброса = token;
    
    // Срок действия токена - 1 час
    const now = new Date();
    now.setHours(now.getHours() + 1);
    this.срок_токена_сброса = now.toISOString();
    
    return token;
  }

  // Сохранение пользователя в базу данных
  async save() {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.id) {
          // Обновление существующего пользователя
          const query = `UPDATE пользователи 
                        SET email = ?, логин = ?, пароль = ?, подтвержден = ?, 
                            токен_подтверждения = ?, токен_сброса = ?, срок_токена_сброса = ?,
                            роль = ?, обновлен_в = CURRENT_TIMESTAMP
                        WHERE id = ?`;
          
          db.run(query, [
            this.email, 
            this.логин, 
            this.пароль, 
            this.подтвержден ? 1 : 0, 
            this.токен_подтверждения, 
            this.токен_сброса, 
            this.срок_токена_сброса,
            this.роль,
            this.id
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          });
        } else {
          // Создание нового пользователя
          await this.hashPassword(); // Хешируем пароль перед сохранением
          
          const query = `INSERT INTO пользователи 
                        (email, логин, пароль, подтвержден, токен_подтверждения, роль) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
          
          db.run(query, [
            this.email, 
            this.логин, 
            this.пароль, 
            this.подтвержден ? 1 : 0, 
            this.токен_подтверждения,
            this.роль
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              this.id = this.lastID; // Получаем ID вставленной записи
              resolve(this);
            }
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Поиск пользователя по ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM пользователи WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new User(row));
        }
      });
    });
  }

  // Поиск пользователя по email
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM пользователи WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new User(row));
        }
      });
    });
  }

  // Поиск пользователя по имени пользователя
  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM пользователи WHERE логин = ?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new User(row));
        }
      });
    });
  }

  // Поиск пользователя по токену верификации
  static findByVerificationToken(token) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM пользователи WHERE токен_подтверждения = ?', [token], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new User(row));
        }
      });
    });
  }

  // Поиск пользователя по токену сброса пароля
  static findByResetToken(token) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.get(
        'SELECT * FROM пользователи WHERE токен_сброса = ? AND срок_токена_сброса > ?',
        [token, now],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            resolve(new User(row));
          }
        }
      );
    });
  }
}

module.exports = User;