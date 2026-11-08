# NEBO — прогноз погоды

Текущая погода, почасовой график и прогноз на три дня. Интерактивное небо меняется вместе с погодой и временем суток в выбранном городе.

[Открыть NEBO](https://weather-app-sage-six-68.vercel.app/) · [Быстрый запуск](#быстрый-запуск) · [English quick start](#english-quick-start)

## Возможности

- **Города.** Нажмите на название города, чтобы открыть поиск, выбрать один из предложенных городов или определить своё местоположение.
- **Прогноз.** График температуры на восемь ближайших часов, вероятность осадков и дневные минимумы и максимумы. Температуру можно переключать между °C и °F.
- **Подробности.** Ветер, влажность, давление, восход и закат.
- **Живое небо.** Облака реагируют на движение мыши и нажатия. Дождь падает двумя слоями с разной скоростью. В разделе «Оформление» можно сменить фон или остановить анимацию. NEBO учитывает системную настройку уменьшения движения.

## Быстрый запуск

Понадобятся Git, Node.js 24.15 или новее из ветки 24.x, npm и ключ [WeatherAPI](https://www.weatherapi.com/).

1. Клонируйте репозиторий и установите зависимости.

   ```bash
   git clone https://github.com/bossmerej-ship-it/weather-app.git
   cd weather-app
   npm ci
   ```

2. Скопируйте [`.env.example`](.env.example) в `.env.local` в корне проекта и укажите свой ключ.

   ```dotenv
   VITE_WEATHER_API_KEY=your_weatherapi_key
   ```

   Файл `.env.local` игнорируется Git. Vite включает переменные `VITE_` в браузерную сборку.

3. Запустите сервер разработки.

   ```bash
   npm run dev
   ```

   Откройте адрес, который выведет Vite. По умолчанию загрузится погода в Астане.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Запустить сервер разработки Vite. |
| `npm run lint` | Проверить код через Oxlint. |
| `npm test` | Запустить тесты API, прогноза и браузерных взаимодействий. |
| `npm run build` | Собрать приложение в `dist`. |
| `npm run preview` | Открыть локально готовую сборку после `npm run build`. |

## Данные прогноза

NEBO получает данные из [WeatherAPI](https://www.weatherapi.com/). Время на графике, восход и закат показаны по часовому поясу выбранного города. При недоступном прогнозе приложение запрашивает текущую погоду.

Под каждым часом и в дневных строках указан больший из доступных шансов дождя и снега. Значок показывает вид осадков, а тире означает, что вероятность недоступна.

Геолокация работает по HTTPS и на `localhost`. После разрешения браузера координаты используются для запроса погоды в WeatherAPI.

## Структура проекта

NEBO написан на React и Vite. Почасовой график построен на Recharts. В интерфейсе используются Lucide, собственные погодные SVG и локальный шрифт Manrope.

| Путь | Что там |
| --- | --- |
| [`src/App.jsx`](src/App.jsx) | Главный экран, настройки и подключение прогноза. |
| [`src/components/`](src/components/) | Небо, поиск города, график и панели прогноза. |
| [`src/services/weather.js`](src/services/weather.js) | Запросы к WeatherAPI и обработка ответов. |
| [`src/lib/`](src/lib/) | Подготовка прогноза, погодные форматы и расчёты. |
| [`src/hooks/`](src/hooks/) | Загрузка данных, геолокация, настройки и анимация. |
| [`tests/`](tests/) | Проверки данных, времени и взаимодействий в браузере. |

Авторы фотографий и условия использования указаны в [описании ресурсов неба](public/scenes/README.md).

## Публикация и CI

Для Vercel в [`vercel.json`](vercel.json) задана сборка `npm run build` с выходным каталогом `dist`. Укажите `VITE_WEATHER_API_KEY` в настройках окружений Production и Preview, где должен загружаться прогноз.

[GitHub Actions](.github/workflows/ci.yml) на Node.js 24 проверяет пул-реквесты и изменения в `main`: устанавливает зависимости, запускает линтер, тесты и сборку.

## English quick start

NEBO shows current conditions, hourly weather, and a three-day forecast. Select the city name to search for another location or use browser geolocation.

### Requirements

- Node.js 22.12 or newer and npm
- A [WeatherAPI](https://www.weatherapi.com/) key

### Run locally

1. Clone the repository and install the locked dependencies.

   ```bash
   git clone https://github.com/bossmerej-ship-it/weather-app.git
   cd weather-app
   npm ci
   ```

2. Copy `.env.example` to `.env.local` in the project root and set your key.

   ```dotenv
   VITE_WEATHER_API_KEY=your_weatherapi_key
   ```

   Restart the development server after changing `.env.local`. Vite includes variables prefixed with `VITE_` in the browser bundle. Use a dedicated key with appropriate restrictions and a quota.

3. Start the development server.

   ```bash
   npm run dev
   ```

   Open the local URL printed by Vite. NEBO opens with Astana selected. Browser geolocation requires HTTPS or `localhost`.

### Check and build

```bash
npm test
npm run lint
npm run build
npm run preview
```

The production build is written to `dist`. For Vercel, set `VITE_WEATHER_API_KEY` in the project's environment settings.
