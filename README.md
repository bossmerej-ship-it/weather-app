# Weather Dashboard

Веб-приложение для отслеживания текущей погоды по всему миру. Поддерживает поиск по городам, определение координат через геолокацию браузера и автоматически подстраивает тему под погодные условия и время суток.

[Демо на Vercel](https://weather-app-sage-six-68.vercel.app)

[English quick start](#english-quick-start)

---

## Основной функционал

- **Поиск и геолокация:** поиск по названию любого города или определение погоды в один клик по текущему местоположению (HTML5 Geolocation API).
- **Динамический интерфейс:** градиентный фон и визуальные элементы меняются в зависимости от погоды (ясно, дождь, снег, гроза) и времени суток (день/ночь).
- **Стеклянный UI (Glassmorphism):** аккуратный интерфейс на чистом CSS с полупрозрачными карточками, блюром и плавными переходами состояний без скачков верстки.
- **Адаптивность:** корректное отображение на смартфонах, планшетах и мониторах.

---

## Стек технологий

- **Фреймворк:** React 19
- **Сборщик:** Vite
- **Стилизация:** Vanilla CSS (CSS Variables, Flexbox/Grid, Glassmorphism, Keyframe animations)
- **Иконки:** Lucide React
- **Данные:** [WeatherAPI](https://www.weatherapi.com/)

---

## Установка и запуск

### Требования
- Node.js 22.12 или новее (согласно требованиям Vite 8)
- npm
- API-ключ от [WeatherAPI](https://www.weatherapi.com/)

### Шаги

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/bossmerej-ship-it/weather-app.git
   cd weather-app
   ```

2. **Установите зависимости из lock-файла:**
   ```bash
   npm ci
   ```

3. **Скопируйте `.env.example` в `.env` в корне проекта** и укажите ключ WeatherAPI:
   ```dotenv
   VITE_WEATHER_API_KEY=your_weatherapi_key
   ```
   После изменения `.env` перезапустите сервер разработки. Переменные с префиксом `VITE_` попадают в браузерную сборку: используйте отдельный ключ с подходящими ограничениями и квотой.

4. **Запустите приложение:**
   ```bash
   npm run dev
   ```
   Откройте адрес, который Vite выведет в терминале.

### Проверка и сборка

```bash
npm run lint
npm run build
npm run preview
```

Готовая сборка находится в `dist`. Перед сборкой на Vercel задайте `VITE_WEATHER_API_KEY` в настройках окружения проекта, затем запустите новый деплой.

### Использование

- При открытии приложение загружает погоду в Астане.
- Введите название города и нажмите Enter или кнопку поиска.
- Кнопка с меткой местоположения запрашивает разрешение браузера на геолокацию. Для неё нужен HTTPS или `localhost`.

---

## English quick start

A React weather dashboard with city search, browser geolocation, and themes that follow the weather and time of day.

### Requirements

- Node.js 22.12 or newer and npm
- A [WeatherAPI](https://www.weatherapi.com/) key

### Run locally

1. Clone the repository and install the locked dependencies:
   ```bash
   git clone https://github.com/bossmerej-ship-it/weather-app.git
   cd weather-app
   npm ci
   ```

2. Copy `.env.example` to `.env` in the project root and set your key:
   ```dotenv
   VITE_WEATHER_API_KEY=your_weatherapi_key
   ```
   Restart the development server after changing `.env`. Variables prefixed with `VITE_` are included in the browser bundle, so use a dedicated key with appropriate restrictions and a quota.

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open the local URL printed by Vite. The dashboard initially shows the weather in Astana. Search for another city or use the location button; geolocation requires HTTPS or `localhost`.

### Check and build

```bash
npm run lint
npm run build
npm run preview
```

The production build is written to `dist`. For Vercel, set `VITE_WEATHER_API_KEY` in the project's environment settings before deploying.

