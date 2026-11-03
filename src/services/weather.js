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

/** Keep WeatherAPI's existing current-weather contract at one boundary. */
export async function requestWeather(query, { apiKey, signal, fetcher = fetch } = {}) {
  const normalized = query.trim();
  if (!normalized) throw new WeatherRequestError('empty', 'Введите название города.');
  if (!apiKey || apiKey === 'your_weatherapi_key') throw mapWeatherError(1002);

  const params = new URLSearchParams({ key: apiKey, q: normalized, lang: 'ru' });
  let response;
  try {
    response = await fetcher(`https://api.weatherapi.com/v1/current.json?${params}`, { signal });
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
  if (!response.ok || data.error) throw mapWeatherError(data.error?.code);
  const { current, location } = data;
  if (!location?.name || !location?.country || !current?.condition?.text ||
      ![current.temp_c, current.feelslike_c, current.humidity, current.wind_kph, current.pressure_mb, current.condition.code].every(Number.isFinite)) {
    throw mapWeatherError();
  }
  return data;
}
