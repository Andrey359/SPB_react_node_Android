// Файл: /app/src/main/java/com/example/sum/MainActivity.kt
package com.example.sum

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.android.volley.Request
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var number1: EditText
    private lateinit var number2: EditText
    private lateinit var result: TextView
    private lateinit var calculateButton: Button
    private lateinit var licenseStatus: TextView

    // Хранение информации о лицензии и авторизации
    private var isLicensed = false
    private var authToken: String? = null

    companion object {
        // URL сервера для проверки лицензии
        private const val SERVER_URL = "http://192.168.8.128:3000/api"
        // Код запроса для активности авторизации
        private const val AUTH_REQUEST_CODE = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Инициализация UI элементов
        number1 = findViewById(R.id.number1)
        number2 = findViewById(R.id.number2)
        result = findViewById(R.id.result)
        calculateButton = findViewById(R.id.calculateButton)
        licenseStatus = findViewById(R.id.licenseStatus)

        // Загрузка токена авторизации из SharedPreferences
        loadAuthToken()

        // Проверяем лицензию при запуске приложения
        checkLicense()

        // Кнопка для открытия сайта
        val openWebsiteButton = findViewById<Button>(R.id.openWebsiteButton)
        openWebsiteButton.setOnClickListener {
            openWebsite()
        }

        // Обработчик клика на кнопку расчета
        calculateButton.setOnClickListener {
            if (isLicensed) {
                calculateSum()
            } else {
                showLicenseDialog()
            }
        }
    }

    // Функция для проверки лицензии
    private fun checkLicense() {
        // Если нет токена авторизации, считаем, что лицензии нет
        if (authToken.isNullOrEmpty()) {
            isLicensed = false
            licenseStatus.text = "Статус лицензии: Не активирована"
            return
        }

        // Для упрощенного демо-режима считаем, что лицензия есть,
        // если пользователь авторизован
        isLicensed = true
        licenseStatus.text = "Статус лицензии: Активирована (демо-режим)"

        // Создаем запрос к серверу для проверки лицензии
        val requestQueue = Volley.newRequestQueue(this)
        val url = "$SERVER_URL/license/check"

        val jsonRequest = object : JsonObjectRequest(
            Request.Method.GET, url, null,
            { response ->
                try {
                    val success = response.getBoolean("success")
                    if (success) {
                        val data = response.getJSONObject("data")
                        isLicensed = data.getBoolean("hasLicense")
                        licenseStatus.text = if (isLicensed)
                            "Статус лицензии: Активирована"
                        else
                            "Статус лицензии: Не активирована"
                    } else {
                        // Считаем лицензию валидной, если пользователь авторизован
                        isLicensed = true
                        licenseStatus.text = "Статус лицензии: Активирована (демо-режим)"
                    }
                } catch (e: Exception) {
                    // При ошибке считаем лицензию валидной, если есть токен
                    isLicensed = true
                    licenseStatus.text = "Статус лицензии: Активирована (демо-режим)"
                    Log.e("MainActivity", "Ошибка проверки лицензии: ${e.message}")
                }
            },
            { error ->
                // При ошибке считаем лицензию валидной, если есть токен
                isLicensed = true
                licenseStatus.text = "Статус лицензии: Активирована (демо-режим)"
                Log.e("MainActivity", "Ошибка проверки лицензии: ${error.message}")
            }) {
            // Добавляем токен авторизации в заголовки запроса
            override fun getHeaders(): MutableMap<String, String> {
                val headers = HashMap<String, String>()
                headers["Authorization"] = "Bearer $authToken"
                return headers
            }
        }

        requestQueue.add(jsonRequest)
    }

    // Функция для расчета суммы чисел
    private fun calculateSum() {
        val num1 = number1.text.toString().toDoubleOrNull()
        val num2 = number2.text.toString().toDoubleOrNull()

        if (num1 != null && num2 != null) {
            val sum = num1 + num2
            result.text = "Результат: $sum"
        } else {
            result.text = "Пожалуйста, введите корректные числа"
        }
    }

    // Отображение диалога о необходимости покупки лицензии
    private fun showLicenseDialog() {
        AlertDialog.Builder(this)
            .setTitle("Требуется лицензия")
            .setMessage("Для использования приложения необходимо приобрести лицензию. Стоимость: 10 рублей.")
            .setPositiveButton("Купить") { _, _ ->
                // Если пользователь не авторизован, сначала просим авторизоваться
                if (authToken.isNullOrEmpty()) {
                    startAuthActivity()
                } else {
                    // Иначе перенаправляем на страницу оплаты
                    openPaymentPage()
                }
            }
            .setNegativeButton("Позже", null)
            .setCancelable(false)
            .show()
    }

    // Запуск активности авторизации
    private fun startAuthActivity() {
        val intent = Intent(this, AuthActivity::class.java)
        startActivityForResult(intent, AUTH_REQUEST_CODE)
    }

    // Открытие страницы оплаты в браузере
    private fun openPaymentPage() {
        // Формируем URL страницы оплаты
        val paymentUrl = "http://192.168.8.128:3000/pricing.html"

        // Создаем и запускаем Intent для открытия браузера
        val intent = Intent(Intent.ACTION_VIEW)
        intent.data = Uri.parse(paymentUrl)
        startActivity(intent)

        // Показываем подсказку о том, как использовать QR-код для оплаты
        Toast.makeText(
            this,
            "На странице оплаты выберите вкладку 'QR-код' для оплаты через Сбербанк Онлайн",
            Toast.LENGTH_LONG
        ).show()
    }

    // Функция для открытия сайта в браузере
    private fun openWebsite() {
        val websiteUrl = "http://192.168.8.128:3000/"
        val intent = Intent(Intent.ACTION_VIEW)
        intent.data = Uri.parse(websiteUrl)
        startActivity(intent)
    }

    // Сохранение токена авторизации в SharedPreferences
    private fun saveAuthToken(token: String) {
        val sharedPref = getSharedPreferences("NumberSumPrefs", MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("auth_token", token)
            apply()
        }
        authToken = token
    }

    // Загрузка токена авторизации из SharedPreferences
    private fun loadAuthToken() {
        val sharedPref = getSharedPreferences("NumberSumPrefs", MODE_PRIVATE)
        authToken = sharedPref.getString("auth_token", null)
    }

    // Очистка токена авторизации (при выходе из аккаунта)
    private fun clearAuthToken() {
        val sharedPref = getSharedPreferences("NumberSumPrefs", MODE_PRIVATE)
        with(sharedPref.edit()) {
            remove("auth_token")
            apply()
        }
        authToken = null
        isLicensed = false
    }

    // Отображение ошибки
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    // Обработка результата активности авторизации
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == AUTH_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            data?.getStringExtra("token")?.let { token ->
                saveAuthToken(token)
                licenseStatus.text = "Статус лицензии: Активирована (демо-режим)"
                isLicensed = true
                // Показываем сообщение об успешной авторизации
                Toast.makeText(this, "Авторизация успешна", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Проверка лицензии при возобновлении работы приложения
    override fun onResume() {
        super.onResume()
        if (!authToken.isNullOrEmpty()) {
            checkLicense()
        }
    }
}