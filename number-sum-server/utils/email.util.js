// Утилита для отправки электронной почты
const nodemailer = require('nodemailer');

// Создание транспорта для отправки email
const createTransporter = () => {
    // Создаем реальный транспорт для отправки писем через Outlook
    return nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false, // для порта 587 используем STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false // только для разработки, в продакшн установите true
      }
    });
  };
  
    // Создаем реальный транспорт
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      // Важные настройки для Outlook
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });
  

// Отправка email для верификации адреса
exports.sendVerificationEmail = async ({ email, subject, verificationUrl }) => {
    try {
      const transporter = createTransporter();
  
      // Опции email с HTML-шаблоном
      const mailOptions = {
        from: `"Number Sum App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #4A90E2;">Number Sum App</h1>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p>Спасибо за регистрацию в Number Sum App!</p>
              <p>Пожалуйста, подтвердите свой email, нажав на кнопку ниже:</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${verificationUrl}" style="display: inline-block; background-color: #4A90E2; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold;">Подтвердить Email</a>
            </div>
            
            <div style="margin-bottom: 20px; font-size: 14px; color: #666;">
              <p>Если кнопка не работает, скопируйте и вставьте следующую ссылку в ваш браузер:</p>
              <p>${verificationUrl}</p>
            </div>
            
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
              <p>Если вы не регистрировались в Number Sum App, проигнорируйте это письмо.</p>
            </div>
          </div>
        `
      };
  
      // Отправка email
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`Email для верификации отправлен на ${email}`);
      console.log('ID сообщения:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Ошибка при отправке email для верификации:', error);
      throw error;
    }
  };

// Отправка email для сброса пароля
exports.sendPasswordResetEmail = async ({ email, subject, resetUrl }) => {
  try {
    const transporter = createTransporter();

    // Опции email с HTML-шаблоном
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Number Sum App'} <${process.env.FROM_EMAIL || 'noreply@numbersum.app'}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4A90E2;">Number Sum App</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Вы запросили сброс пароля для вашей учетной записи в Number Sum App.</p>
            <p>Нажмите на кнопку ниже, чтобы сбросить пароль:</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #4A90E2; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold;">Сбросить пароль</a>
          </div>
          
          <div style="margin-bottom: 20px; font-size: 14px; color: #666;">
            <p>Если кнопка не работает, скопируйте и вставьте следующую ссылку в ваш браузер:</p>
            <p>${resetUrl}</p>
          </div>
          
          <div style="margin-bottom: 20px; font-size: 14px; color: #666;">
            <p>Ссылка действительна в течение 1 часа.</p>
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
          </div>
        </div>
      `
    };

    // Отправка email
    await transporter.sendMail(mailOptions);
    
    console.log(`Email для сброса пароля отправлен на ${email}`);
    return true;
  } catch (error) {
    console.error('Ошибка при отправке email для сброса пароля:', error);
    throw error;
  }
};

// Отправка email с подтверждением оплаты
exports.sendPaymentConfirmationEmail = async ({ email, subject, paymentDetails }) => {
  try {
    const transporter = createTransporter();

    // Форматирование суммы
    const formattedAmount = `${paymentDetails.amount} ${paymentDetails.currency}`;

    // Опции email с HTML-шаблоном
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Number Sum App'} <${process.env.FROM_EMAIL || 'noreply@numbersum.app'}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4A90E2;">Number Sum App</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Спасибо за покупку Number Sum App!</p>
            <p>Мы получили вашу оплату и активировали лицензию на использование приложения.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
            <h3 style="margin-top: 0; color: #333;">Детали платежа:</h3>
            <p><strong>Сумма:</strong> ${formattedAmount}</p>
            <p><strong>Дата:</strong> ${paymentDetails.date}</p>
            <p><strong>Статус:</strong> Оплачено</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <p>Теперь вы можете использовать все функции приложения Number Sum App.</p>
            <p>Спасибо, что выбрали нас!</p>
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p>Если у вас возникли вопросы, ответьте на это письмо.</p>
          </div>
        </div>
      `
    };

    // Отправка email
    await transporter.sendMail(mailOptions);
    
    console.log(`Email с подтверждением оплаты отправлен на ${email}`);
    return true;
  } catch (error) {
    console.error('Ошибка при отправке email с подтверждением оплаты:', error);
    throw error;
  }
};