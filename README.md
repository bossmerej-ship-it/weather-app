# NEBO — погода в моменте

Погода в своём ритме: приложение с живыми пейзажами, поиском городов и текущими погодными показателями.

**[Открыть приложение](https://weather-app-sage-six-68.vercel.app)**

## Возможности

- Поиск города на русском и английском, быстрый переход в Астану, Алматы, Лондон и Токио.
- Определение местоположения по кнопке «Где я» с разрешения браузера.
- Температура, ощущаемая температура, влажность, ветер и давление из WeatherAPI.
- Переключение °C / °F с сохранением выбора на устройстве.
- Автоматическая атмосфера по погоде и времени суток: ясное небо, облака, дождь, снег, гроза, туман и ночь.
- Ручной выбор шести сцен: «Авто», «Ясно», «Облака», «Дождь», «Снег», «Ночь». Меняется только фон; реальные погодные показатели остаются прежними.
- Плавные переходы между сценами, движение облаков, дождь, снег и звёзды.
- Параллакс от движения мыши и световые круги с частицами по клику на пейзаж. Кнопка фона доступна с клавиатуры.
- Приостановка декоративной анимации и поддержка `prefers-reduced-motion`.
- Адаптивный интерфейс от 320px; русские подписи, видимый фокус, доступные названия и сообщения об ошибках.

Пейзажи иллюстрируют настроение, а не конкретный город. Звука нет. Приложение показывает текущую погоду, без выдуманных прогнозов и демонстрационных значений.

## Локальный запуск

Требуются **Node.js 22.12+** и npm. Для деплоя используется Node.js 24.

```bash
git clone https://github.com/bossmerej-ship-it/weather-app.git
cd weather-app
npm ci
```

Скопируйте `.env.example` в `.env.local` и укажите собственный ключ [WeatherAPI](https://www.weatherapi.com/):

```dotenv
VITE_WEATHER_API_KEY=your_weatherapi_key
```

```bash
npm run dev
```

Начальный город — Астана. После изменения переменных окружения перезапустите сервер. Геолокация работает через HTTPS или на localhost. Координаты запрашиваются только по нажатию кнопки и отправляются в WeatherAPI для определения погоды; приложение не сохраняет их в localStorage.

`VITE_`-переменные включаются в браузерную сборку. Используйте отдельный WeatherAPI-ключ с подходящими ограничениями и квотой. Не коммитьте `.env` и `.env.local`.

## Проверка

```bash
npm test
npm run lint
npm run build
npm run preview
```

Тесты на встроенном `node:test` покрывают кодирование запросов, ошибки и отмену, проверку ответов, единицы, погодные группы и часовые пояса. GitHub Actions запускает тесты, lint и сборку при push и в pull request. Для сборки в CI ключ не требуется; работающий сайт требует настроенного ключа.

Старые запросы отменяются при новом поиске. Запрос ограничен 15 секундами, определение местоположения — 10 секундами. При неудаче сохраняется предыдущая погода и показывается причина с возможностью повтора. При первоначальной ошибке приложение показывает экран восстановления.

## Структура

```text
src/components/   интерфейс, погодные инструменты и живой фон
src/hooks/        загрузка, геолокация, настройки и реакция фона
src/lib/          форматы, погодные группы и описания сцен
src/services/     WeatherAPI current.json и проверка ответов
tests/            проверки данных и ошибок без сетевых запросов
public/scenes/    локальные изображения и их источники
```

Стек: React 19, Vite 8, обычный CSS, Lucide React и локально установленный вариативный Manrope с кириллицей (OFL-1.1). Дополнительных анимационных или UI-фреймворков нет. Декоративные эффекты ограничены по количеству; слоёв сцены не больше двух, видимых реакций на клики — не больше шести.

## Деплой на Vercel

Существующий проект `weather-app` собирает `main` из этого репозитория:

- Framework: Vite; Build Command: `npm run build`; Output Directory: `dist`.
- Node.js: 24.
- `VITE_WEATHER_API_KEY` должна быть задана в окружении Production, а для тестовых деплоев — в Preview.
- После изменения ключа нужен новый деплой.
- `vercel.json` задаёт кеширование пейзажей и неизменяемых ресурсов сборки.

Изображения размещены локально, без запросов к Unsplash во время использования. Источники и лицензия — в [public/scenes/README.md](public/scenes/README.md). Шрифт также загружается с того же сайта.

## English quick start

A Russian-language weather app with city search, browser geolocation, Celsius/Fahrenheit, and interactive landscapes. Scene previews change presentation only; the measurements always come from WeatherAPI.

Use Node.js 22.12+ (24 on Vercel), run `npm ci`, copy `.env.example` to `.env.local`, and set `VITE_WEATHER_API_KEY`. Then run `npm run dev`. Check with `npm test`, `npm run lint`, and `npm run build`. Production output is `dist`.

The default city is Astana. Geolocation needs HTTPS or localhost and is requested only after pressing the location button. Animation can be paused and respects reduced-motion settings. Landscape images are atmospheric illustrations, not location photographs. No audio, sample weather, or invented forecast is included.
