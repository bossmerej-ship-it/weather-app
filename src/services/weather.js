import { dailyData } from '../lib/forecast.js';

export class WeatherRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WeatherRequestError';
    this.code = code;
  }
}

export function mapWeatherError(code) {
  if (code === 1006) return new WeatherRequestError('not-found', 'Не нашли такой город. Проверьте название или введите его на английском.');
  if ([1002, 2006, 2008].includes(code)) return new WeatherRequestError('configuration', 'Сейчас погода недоступна. Попробуйте зайти немного позже.');
  if ([2007, 2009].includes(code)) return new WeatherRequestError('unavailable', 'Сервис погоды временно недоступен. Попробуйте позже.');
  return new WeatherRequestError('unavailable', 'Не удалось загрузить погоду. Проверьте подключение и попробуйте ещё раз.');
}

async function requestEndpoint(endpoint, query, { apiKey, signal, fetcher = fetch, parameters = {} } = {}) {
  const normalized = query.trim();
  if (!normalized) throw new WeatherRequestError('empty', 'Введите название города.');
  if (!apiKey || apiKey === 'your_weatherapi_key') throw mapWeatherError(1002);

  const params = new URLSearchParams({ key: apiKey, q: normalized, lang: 'ru', ...parameters });
  let response;
  try {
    response = await fetcher(`https://api.weatherapi.com/v1/${endpoint}.json?${params}`, { signal });
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) throw error;
    throw mapWeatherError();
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) throw error;
    throw mapWeatherError();
  }
  if (!response.ok || data?.error) throw mapWeatherError(data?.error?.code);
  const { current, location } = data || {};
  if (!location?.name || !location?.country || !current?.condition?.text ||
      ![current.temp_c, current.feelslike_c, current.humidity, current.wind_kph, current.pressure_mb, current.condition.code].every(Number.isFinite)) {
    throw mapWeatherError();
  }
  return data;
}

/** Keep the original current-weather request available for recovery and existing consumers. */
export function requestWeather(query, options) {
  return requestEndpoint('current', query, options);
}

/** One forecast request supplies current conditions, hourly weather, daily ranges and astronomy. */
export async function requestDashboardWeather(query, options = {}) {
  try {
    const data = await requestEndpoint('forecast', query, {
      ...options, parameters: { days: '3', aqi: 'no', alerts: 'no' },
    });
    const days = dailyData(data);
    if (days.length) {
      return { weather: { ...data, forecast: { ...data.forecast, forecastday: days } }, forecastUnavailable: false };
    }
  } catch (error) {
    if (options.signal?.aborted || error.name === 'AbortError' || ['empty', 'configuration', 'not-found'].includes(error.code)) throw error;
    // A plan restriction or failed forecast must not remove the existing current-weather capability.
  }
  options.signal?.throwIfAborted();
  const current = await requestWeather(query, options);
  const { forecast: _discardedForecast, ...weather } = current;
  return { weather, forecastUnavailable: true };
}
