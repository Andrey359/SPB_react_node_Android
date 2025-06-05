// Основной JavaScript файл для фронтенда

document.addEventListener('DOMContentLoaded', function() {
    // Элементы для работы с авторизацией
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const burgerBtn = document.getElementById('burgerBtn');
  
    // Проверяем, авторизован ли пользователь
    checkAuth();
  
    // Обработчик для кнопки выхода
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  
    // Обработчик для мобильного меню
    if (burgerBtn) {
      burgerBtn.addEventListener('click', toggleMobileMenu);
    }
  
    // Проверка платежа, если есть незавершенный
    const paymentId = localStorage.getItem('paymentId');
    if (paymentId) {
      checkPaymentStatus(paymentId);
    }
  });
  
  // Функция для проверки авторизации пользователя
  function checkAuth() {
    const token = getToken();
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
  
    if (token) {
      // Проверяем токен на сервере
      fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Показываем информацию о пользователе
          if (authButtons) authButtons.classList.add('hidden');
          if (userInfo) {
            userInfo.classList.remove('hidden');
            userName.textContent = data.data.username || data.data.email;
          }
  
          // Сохраняем информацию о пользователе
          localStorage.setItem('user', JSON.stringify(data.data));
        } else {
          // Токен недействителен, удаляем его
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (authButtons) authButtons.classList.remove('hidden');
          if (userInfo) userInfo.classList.add('hidden');
        }
      })
      .catch(error => {
        console.error('Ошибка при проверке авторизации:', error);
        // При ошибке соединения используем локальные данные, 
        // чтобы обеспечить базовую работу без сети
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData && userData.username) {
          if (authButtons) authButtons.classList.add('hidden');
          if (userInfo) {
            userInfo.classList.remove('hidden');
            userName.textContent = userData.username || userData.email || 'Пользователь';
          }
        } else {
          if (authButtons) authButtons.classList.remove('hidden');
          if (userInfo) userInfo.classList.add('hidden');
        }
      });
    } else {
      // Токен отсутствует
      if (authButtons) authButtons.classList.remove('hidden');
      if (userInfo) userInfo.classList.add('hidden');
    }
  }
  
  // Получение токена из localStorage
  function getToken() {
    return localStorage.getItem('token');
  }
  
  // Выход из аккаунта
  function logout(event) {
    event.preventDefault();
  
    // Удаляем токен на сервере (если соединение доступно)
    fetch('/api/auth/logout', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(() => {
      // Удаляем токен и информацию о пользователе
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Показываем кнопки авторизации
      const authButtons = document.getElementById('authButtons');
      const userInfo = document.getElementById('userInfo');
      if (authButtons) authButtons.classList.remove('hidden');
      if (userInfo) userInfo.classList.add('hidden');
  
      // Перенаправляем на главную страницу
      window.location.href = '/';
    })
    .catch(error => {
      console.error('Ошибка при выходе из аккаунта:', error);
      
      // Даже при ошибке соединения, удаляем локальные данные
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      window.location.href = '/';
    });
  }
  
  // Переключение мобильного меню
  function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    const burgerBtn = document.getElementById('burgerBtn');
    
    if (nav.classList.contains('nav--active')) {
      nav.classList.remove('nav--active');
      burgerBtn.classList.remove('header__burger--active');
    } else {
      nav.classList.add('nav--active');
      burgerBtn.classList.add('header__burger--active');
    }
  }
  
  // Проверка статуса платежа
  function checkPaymentStatus(paymentId) {
    const token = getToken();
    if (!token || !paymentId) {
      return;
    }
    
    fetch(`/api/payments/${paymentId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const status = data.data.status;
        
        // Обработка статуса платежа
        if (status === 'completed') {
          // Платеж успешно завершен
          showSuccessMessage('Оплата успешно завершена! Лицензия активирована.');
          localStorage.removeItem('paymentId');
          
          // Перенаправляем на страницу лицензии
          setTimeout(() => {
            window.location.href = '/account/license.html?success=true';
          }, 3000);
        } else if (status === 'failed') {
          // Платеж не удался
          showErrorMessage('Оплата не была завершена. Пожалуйста, попробуйте еще раз.');
          localStorage.removeItem('paymentId');
        } else if (status === 'pending') {
          // Платеж все еще в обработке, проверяем снова через 5 секунд
          setTimeout(() => {
            checkPaymentStatus(paymentId);
          }, 5000);
        }
      } else {
        console.error('Ошибка при проверке статуса платежа:', data.error);
      }
    })
    .catch(error => {
      console.error('Ошибка при проверке статуса платежа:', error);
    });
  }
  
  // Показать сообщение об успехе
  function showSuccessMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message-box message-success';
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.left = '50%';
    messageEl.style.transform = 'translateX(-50%)';
    messageEl.style.zIndex = '9999';
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        document.body.removeChild(messageEl);
      }, 500);
    }, 3000);
  }
  
  // Показать сообщение об ошибке
  function showErrorMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message-box message-error';
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.left = '50%';
    messageEl.style.transform = 'translateX(-50%)';
    messageEl.style.zIndex = '9999';
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        document.body.removeChild(messageEl);
      }, 500);
    }, 3000);
  }