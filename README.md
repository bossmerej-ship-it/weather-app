# NEBO — прогноз погоды

Текущая погода, почасовой график и прогноз на три дня. Интерактивное небо меняется вместе с погодой и временем суток в выбранном городе.

[Открыть NEBO](https://weather-app-sage-six-68.vercel.app/) · [English quick start](#english-quick-start)

## Возможности

- **Города.** Нажмите на название города, чтобы открыть поиск, выбрать один из предложенных городов или определить своё местоположение.
- **Прогноз.** График температуры на восемь ближайших часов, вероятность осадков и дневные минимумы и максимумы. Температуру можно переключать между °C и °F.
- **Подробности.** Ветер, влажность, давление, восход и закат.
- **Живое небо.** Облака реагируют на движение мыши и нажатия. Дождь падает двумя слоями с разной скоростью. В разделе «Оформление» можно сменить фон или остановить анимацию. NEBO учитывает системную настройку уменьшения движения.

## Данные прогноза

NEBO получает данные из [WeatherAPI](https://www.weatherapi.com/). Время на графике, восход и закат показаны по часовому поясу выбранного города. При недоступном прогнозе приложение запрашивает текущую погоду.

Под каждым часом и в дневных строках указан больший из доступных шансов дождя и снега. Значок показывает вид осадков, а тире означает, что вероятность недоступна.

## Запуск

Требуются Node.js 22.12+ и npm (на Vercel — Node 24).

```bash
npm ci
```

Скопируйте `.env.example` в `.env.local` и задайте `VITE_WEATHER_API_KEY` от [WeatherAPI](https://www.weatherapi.com/). `VITE_`-переменные включаются в браузерную сборку: используйте ключ с подходящими ограничениями и квотой. Файлы окружения не коммитятся.

```bash
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Начальный город — Астана. Геолокация работает через HTTPS/localhost и отправляет координаты в WeatherAPI для определения погоды. Запросы отменяются при новом поиске; таймаут погоды — 15 секунд, геолокации — 10 секунд.

## Стек и структура

React 19, Vite 8, Recharts, Lucide, CSS. Шрифт Manrope размещается локально через Fontsource (OFL). График загружается отдельным модулем после появления данных.

- `src/components/` — небо, текущая погода, диалог выбора города, часы, дни, подробности, световой день и оформление.
- `src/lib/forecast.js` — проверенные значения прогноза, локальное время, наблюдения и астрономия.
- `src/services/weather.js` — прогноз и восстановление текущей погоды.
- `src/hooks/` — запросы, геолокация, настройки и ограниченные эффекты.
- `tests/` — 44 теста: границы API, часовые пояса, вероятности, астрономия, настройки движения, геолокация и жесты. Координаты и разрешения геолокации в тестах синтетические. Отдельно проверяются координаты и исчезновение следов и всплесков, ограничения их количества, затухание и повтор порыва, отличия касания от прокрутки, пауза, небольшой параллакс, исключение кнопок, очистка таймеров и кадров анимации.
- `public/scenes/README.md` — источники локальных изображений.

Сборка Vercel: `npm run build`, результат `dist`, ключ задан в Production/Preview. GitHub Actions запускает lint, тесты и сборку при push/PR. Для сборки в CI ключ не нужен, для погодных запросов на сайте — нужен.

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
