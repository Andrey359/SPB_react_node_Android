// Модель платежа для работы с базой данных
const db = require('../config/db.config');

// Класс для работы с платежами в базе данных
class Payment {
  constructor(paymentData) {
    this.id = paymentData.id || null;
    this.пользователь_id = paymentData.пользователь_id || paymentData.user_id;
    this.сумма = paymentData.сумма || paymentData.amount || 10.00;
    this.валюта = paymentData.валюта || paymentData.currency || 'RUB';
    this.способ_оплаты = paymentData.способ_оплаты || paymentData.payment_method || 'SBP';
    this.транзакция_id = paymentData.транзакция_id || paymentData.transaction_id || null;
    this.статус = paymentData.статус || paymentData.status || 'pending';
    this.создан_в = paymentData.создан_в || paymentData.created_at || new Date();
    this.обновлен_в = paymentData.обновлен_в || paymentData.updated_at || new Date();
  }

  // Сохранение платежа в базу данных
  async save() {
    return new Promise((resolve, reject) => {
      try {
        if (this.id) {
          // Обновление существующего платежа
          const query = `UPDATE платежи 
                       SET пользователь_id = ?, сумма = ?, валюта = ?, 
                           способ_оплаты = ?, транзакция_id = ?, статус = ?,
                           обновлен_в = CURRENT_TIMESTAMP
                       WHERE id = ?`;
          
          db.run(query, [
            this.пользователь_id,
            this.сумма,
            this.валюта,
            this.способ_оплаты,
            this.транзакция_id,
            this.статус,
            this.id
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          });
        } else {
          // Создание нового платежа
          const query = `INSERT INTO платежи 
                       (пользователь_id, сумма, валюта, способ_оплаты, транзакция_id, статус) 
                       VALUES (?, ?, ?, ?, ?, ?)`;
          
          db.run(query, [
            this.пользователь_id,
            this.сумма,
            this.валюта,
            this.способ_оплаты,
            this.транзакция_id,
            this.статус
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

  // Поиск платежа по ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM платежи WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new Payment(row));
        }
      });
    });
  }

  // Поиск платежа по ID транзакции
  static async findByTransactionId(transactionId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM платежи WHERE транзакция_id = ?', [transactionId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(new Payment(row));
        }
      });
    });
  }

  // Получение всех платежей пользователя
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM платежи WHERE пользователь_id = ? ORDER BY создан_в DESC',
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => new Payment(row)));
          }
        }
      );
    });
  }

  // Обновление статуса платежа
  async updateStatus(status) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.id) {
          throw new Error('ID платежа обязателен');
        }

        this.статус = status;
        this.обновлен_в = new Date();

        db.run(
          'UPDATE платежи SET статус = ?, обновлен_в = CURRENT_TIMESTAMP WHERE id = ?',
          [status, this.id],
          async (err) => {
            if (err) {
              reject(err);
            } else {
              // Если статус "завершен", активируем лицензию пользователя
              if (status === 'completed') {
                try {
                  await this.activateLicense();
                } catch (licenseErr) {
                  console.error('Ошибка при активации лицензии:', licenseErr);
                  // Продолжаем выполнение, даже если активация лицензии не удалась
                }
              }
              resolve(true);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Активация лицензии после успешного платежа
  async activateLicense() {
    return new Promise((resolve, reject) => {
      try {
        // Проверяем, есть ли уже лицензия у пользователя
        db.get(
          'SELECT * FROM лицензии WHERE пользователь_id = ?',
          [this.пользователь_id],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (row) {
              // Обновляем существующую лицензию
              db.run(
                'UPDATE лицензии SET активна = 1, дата_активации = CURRENT_TIMESTAMP, обновлен_в = CURRENT_TIMESTAMP WHERE пользователь_id = ?',
                [this.пользователь_id],
                (updateErr) => {
                  if (updateErr) {
                    reject(updateErr);
                  } else {
                    resolve(true);
                  }
                }
              );
            } else {
              // Создаем новую лицензию
              db.run(
                'INSERT INTO лицензии (пользователь_id, активна, дата_активации) VALUES (?, 1, CURRENT_TIMESTAMP)',
                [this.пользователь_id],
                (insertErr) => {
                  if (insertErr) {
                    reject(insertErr);
                  } else {
                    resolve(true);
                  }
                }
              );
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = Payment;