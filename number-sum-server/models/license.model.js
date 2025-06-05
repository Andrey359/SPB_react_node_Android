// Модель лицензии для работы с базой данных
const db = require('../config/db.config');

// Класс для работы с лицензиями в базе данных
class License {
  constructor(licenseData) {
    this.id = licenseData.id || null;
    this.пользователь_id = licenseData.пользователь_id || licenseData.user_id;
    this.активна = licenseData.активна || licenseData.is_active || false;
    this.дата_активации = licenseData.дата_активации || licenseData.activation_date || null;
    this.дата_окончания = licenseData.дата_окончания || licenseData.expiration_date || null; // NULL для бессрочной лицензии
    this.создан_в = licenseData.создан_в || licenseData.created_at || new Date();
    this.обновлен_в = licenseData.обновлен_в || licenseData.updated_at || new Date();
  }

  // Сохранение лицензии в базу данных
  async save() {
    return new Promise((resolve, reject) => {
      try {
        if (this.id) {
          // Обновление существующей лицензии
          const query = `UPDATE лицензии 
                       SET пользователь_id = ?, активна = ?, дата_активации = ?, 
                           дата_окончания = ?, обновлен_в = CURRENT_TIMESTAMP
                       WHERE id = ?`;
          
          db.run(query, [
            this.пользователь_id,
            this.активна ? 1 : 0,
            this.дата_активации,
            this.дата_окончания,
            this.id
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          });
        } else {
          // Создание новой лицензии
          const query = `INSERT INTO лицензии 
                       (пользователь_id, активна, дата_активации, дата_окончания) 
                       VALUES (?, ?, ?, ?)`;
          
          db.run(query, [
            this.пользователь_id,
            this.активна ? 1 : 0,
            this.дата_активации,
            this.дата_окончания
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              this.id = this.lastID;
              resolve(this);
            }
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Поиск лицензии по ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM лицензии WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new License(row));
        }
      });
    });
  }

  // Поиск лицензии по ID пользователя
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM лицензии WHERE пользователь_id = ?', [userId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new License(row));
        }
      });
    });
  }

  // Проверка действительности лицензии
  isValid() {
    if (!this.активна) return false;
    
    // Если срок действия не указан, лицензия бессрочная
    if (!this.дата_окончания) return true;
    
    // Проверяем, не истекла ли лицензия
    const currentDate = new Date();
    const expirationDate = new Date(this.дата_окончания);
    
    return currentDate <= expirationDate;
  }

  // Активация лицензии
  async activate() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.id) {
          throw new Error('ID лицензии обязателен');
        }

        this.активна = true;
        this.дата_активации = new Date();
        this.обновлен_в = new Date();

        db.run(
          'UPDATE лицензии SET активна = 1, дата_активации = CURRENT_TIMESTAMP, обновлен_в = CURRENT_TIMESTAMP WHERE id = ?',
          [this.id],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Деактивация лицензии
  async deactivate() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.id) {
          throw new Error('ID лицензии обязателен');
        }

        this.активна = false;
        this.обновлен_в = new Date();

        db.run(
          'UPDATE лицензии SET активна = 0, обновлен_в = CURRENT_TIMESTAMP WHERE id = ?',
          [this.id],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = License;