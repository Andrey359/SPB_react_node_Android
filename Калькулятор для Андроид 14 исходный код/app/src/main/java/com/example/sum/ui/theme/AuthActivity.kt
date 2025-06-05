// Файл: /app/src/main/java/com/example/sum/AuthActivity.kt
package com.example.sum

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.android.volley.Request
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import org.json.JSONObject

class AuthActivity : AppCompatActivity() {

    private lateinit var emailEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var loginButton: Button
    private lateinit var registerLink: TextView

    companion object {
        // URL сервера для авторизации
        private const val SERVER_URL = "http://192.168.8.128:3000/api"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auth)

        // Инициализация UI элементов
        emailEditText = findViewById(R.id.email_edit_text)
        passwordEditText = findViewById(R.id.password_edit_text)
        loginButton = findViewById(R.id.login_button)
        registerLink = findViewById(R.id.register_link)

        // Обработчик клика на кнопку входа
        loginButton.setOnClickListener {
            val email = emailEditText.text.toString().trim()
            val password = passwordEditText.text.toString()

            if (validateInput(email, password)) {
                login(email, password)
            }
        }

        // Обработчик клика на ссылку регистрации
        registerLink.setOnClickListener {
            openRegisterPage()
        }
    }

    // Проверка введенных данных
    private fun validateInput(email: String, password: String): Boolean {
        if (email.isEmpty()) {
            emailEditText.error = "Введите email"
            return false
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            emailEditText.error = "Введите корректный email"
            return false
        }

        if (password.isEmpty()) {
            passwordEditText.error = "Введите пароль"
            return false
        }

        if (password.length < 6) {
            passwordEditText.error = "Пароль должен содержать не менее 6 символов"
            return false
        }

        return true
    }

    // Функция для выполнения входа
    private fun login(email: String, password: String) {
        val requestQueue = Volley.newRequestQueue(this)
        val url = "$SERVER_URL/auth/login"

        // Создаем JSON объект с данными для входа
        val jsonBody = JSONObject()
        jsonBody.put("email", email)
        jsonBody.put("password", password)

        try {
            val jsonRequest = JsonObjectRequest(
                Request.Method.POST, url, jsonBody,
                { response ->
                    try {
                        // Проверяем, есть ли поле success в ответе
                        if (response.has("success")) {
                            val success = response.getBoolean("success")
                            if (success) {
                                // Стандартный ответ от сервера
                                Log.d("AuthActivity", "Успешный ответ от сервера: $response")

                                // Получаем токен и информацию о пользователе
                                val token = response.getString("token")
                                val user = response.getJSONObject("user")

                                // Возвращаем данные в основную активность
                                val intent = Intent()
                                intent.putExtra("token", token)
                                intent.putExtra("user_id", user.optString("id", "1"))
                                intent.putExtra("email", user.optString("email", email))
                                intent.putExtra("username", user.optString("username", email.split("@")[0]))

                                setResult(Activity.RESULT_OK, intent)
                                finish()
                            } else {
                                // Ошибка, описанная сервером
                                val error = response.optString("error", "Неизвестная ошибка")
                                showToast("Ошибка: $error")
                            }
                        } else {
                            // Если response не содержит поле success, используем демо-режим
                            Log.d("AuthActivity", "Неожиданный формат ответа, использую демо-режим")
                            useDemoLogin(email)
                        }
                    } catch (e: Exception) {
                        Log.e("AuthActivity", "Ошибка при обработке ответа: ${e.message}")
                        // При ошибке обработки используем демо-режим
                        useDemoLogin(email)
                    }
                },
                { error ->
                    // Если произошла ошибка сети, используем демо-режим
                    Log.e("AuthActivity", "Ошибка сети: ${error.message}")

                    // Определяем сообщение об ошибке
                    val errorMessage = when (error.networkResponse?.statusCode) {
                        401 -> "Неверный email или пароль"
                        403 -> "Доступ запрещен"
                        404 -> "Пользователь не найден"
                        500 -> "Ошибка сервера"
                        else -> "Ошибка соединения с сервером"
                    }

                    showToast("$errorMessage. Используем демо-режим.")
                    useDemoLogin(email)
                })

            // Добавляем запрос в очередь
            requestQueue.add(jsonRequest)

        } catch (e: Exception) {
            Log.e("AuthActivity", "Ошибка при создании запроса: ${e.message}")
            // При любой ошибке используем демо-режим
            useDemoLogin(email)
        }
    }

    // Функция для демо-авторизации
    private fun useDemoLogin(email: String) {
        // Генерируем простой токен на основе email
        val token = "demo_token_${email.hashCode()}"

        // Показываем сообщение о демо-режиме
        showToast("Выполнен вход в демо-режиме")

        // Возвращаем токен в основную активность
        val intent = Intent()
        intent.putExtra("token", token)
        intent.putExtra("user_id", "1")
        intent.putExtra("email", email)
        intent.putExtra("username", email.split("@")[0])

        setResult(Activity.RESULT_OK, intent)
        finish()
    }

    // Открытие страницы регистрации в браузере
    private fun openRegisterPage() {
        val intent = Intent(Intent.ACTION_VIEW)
        intent.data = android.net.Uri.parse("http://192.168.8.128:3000/auth/register.html")
        startActivity(intent)
    }

    // Отображение сообщения
    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}