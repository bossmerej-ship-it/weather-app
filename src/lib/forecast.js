import { locationClock, temperature } from './weather.js';

const validChance = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const validCondition = (condition) => Number.isFinite(condition?.code) && typeof condition?.text === 'string' && condition.text.length > 0;
const localDate = (weather) => typeof weather?.location?.localtime === 'string' ? weather.location.localtime.slice(0, 10) : null;
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
  Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

export function dailyData(weather) {
  const days = weather?.forecast?.forecastday;
  return Array.isArray(days) ? days.filter((item) => validDate(item?.date) &&
    Number.isFinite(item.day?.mintemp_c) && Number.isFinite(item.day?.maxtemp_c) &&
    item.day.mintemp_c <= item.day.maxtemp_c && validCondition(item.day?.condition))
    .toSorted((a, b) => a.date.localeCompare(b.date)) : [];
}

export function formatForecastTime(value) {
  const time = typeof value === 'string' ? value : value?.time;
  const match = typeof time === 'string' && time.trim().match(/(?:^|[ T])(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  return match && Number(match[1]) < 24 ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

/** Use the API's epoch and local minute, including half-hour/quarter-hour timezones. */
export function forecastHourStart(weather) {
  const fromLocation = Number.isFinite(weather?.location?.localtime_epoch);
  const epoch = fromLocation ? weather.location.localtime_epoch : weather?.current?.last_updated_epoch;
  if (!Number.isFinite(epoch)) return null;
  const timeZone = weather?.location?.tz_id;
  const reportedTime = fromLocation ? weather.location.localtime : weather.current?.last_updated;
  const wallTime = formatForecastTime(reportedTime) ??
    (timeZone ? locationClock(timeZone, new Date(epoch * 1000))?.time : null);
  const minute = wallTime ? Number(wallTime.slice(3)) : 0;
  return wallTime ? epoch - minute * 60 - epoch % 60 : Math.floor(epoch / 3600) * 3600;
}

export function upcomingHours(weather, count = 8) {
  if (!Number.isFinite(count) || count < 1) return [];
  const hourStart = forecastHourStart(weather);
  if (hourStart === null) return [];
  const unique = new Map();
  for (const day of dailyData(weather)) {
    for (const hour of Array.isArray(day.hour) ? day.hour : []) {
      if (Number.isFinite(hour?.time_epoch) && hour.time_epoch >= hourStart && Number.isFinite(hour.temp_c) &&
          formatForecastTime(hour) && validCondition(hour.condition)) unique.set(hour.time_epoch, hour);
    }
  }
  return [...unique.values()].toSorted((a, b) => a.time_epoch - b.time_epoch).slice(0, Math.floor(count));
}

/** The larger *reported channel*, not an invented probability of the union of rain and snow. */
export function precipitationType(record, daily = false) {
  const prefix = daily ? 'daily_' : '';
  const rain = record?.[`${prefix}chance_of_rain`];
  const snow = record?.[`${prefix}chance_of_snow`];
  if (!validChance(rain) && !validChance(snow)) return null;
  return validChance(snow) && (!validChance(rain) || snow > rain) ? 'snow' : 'rain';
}

export function precipitationChance(record, daily = false) {
  const kind = precipitationType(record, daily);
  return kind ? record[`${daily ? 'daily_' : ''}chance_of_${kind}`] : null;
}

/** Convert WeatherAPI's local 12-hour astronomy strings without Date/browser timezone parsing. */
export function time24(value) {
  const match = typeof value === 'string' && value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) > 59) return null;
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export function todaySun(weather) {
  const date = localDate(weather);
  const today = dailyData(weather).find((day) => day.date === date);
  const sunrise = time24(today?.astro?.sunrise);
  const sunset = time24(today?.astro?.sunset);
  if (!sunrise && !sunset) return null;
  const times = { sunrise, sunset };
  if (!sunrise || !sunset) return times;

  const sunriseMinutes = minutes(sunrise);
  const sunsetMinutes = minutes(sunset);
  if (sunsetMinutes <= sunriseMinutes) return times;
  const daylightMinutes = sunsetMinutes - sunriseMinutes;
  const localTime = formatForecastTime(weather?.location?.localtime);
  if (!localTime) return { ...times, daylightMinutes };

  const localMinutes = minutes(localTime);
  return {
    ...times, sunriseMinutes, sunsetMinutes, localMinutes, daylightMinutes,
    progress: Math.max(0, Math.min(1, (localMinutes - sunriseMinutes) / daylightMinutes)),
    isDaylight: localMinutes >= sunriseMinutes && localMinutes < sunsetMinutes,
  };
}

export function forecastDayLabel(day, weather) {
  const date = typeof day === 'string' ? day : day?.date;
  if (!validDate(date)) return null;
  if (date === localDate(weather)) return 'Сегодня';
  const reference = localDate(weather);
  if (validDate(reference) &&
      Date.parse(`${date}T12:00:00Z`) - Date.parse(`${reference}T12:00:00Z`) === 86400000) return 'Завтра';
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function weatherObservation(weather, unit = 'c') {
  const hours = upcomingHours(weather, 7);
  if (!hours.length) return null;
  const last = hours.at(-1);
  const current = weather.current?.temp_c;
  if (hours.length > 2 && Number.isFinite(current) && Math.abs(last.temp_c - current) >= 2) {
    return `К ${formatForecastTime(last)} ${last.temp_c < current ? 'похолодает' : 'потеплеет'} до ${temperature(last.temp_c, unit)}°${unit.toUpperCase()}.`;
  }
  const wet = hours.filter((hour) => precipitationChance(hour) !== null)
    .toSorted((a, b) => precipitationChance(b) - precipitationChance(a))[0];
  if (wet && precipitationChance(wet) > 0) {
    return `В ближайшие часы вероятность ${precipitationType(wet) === 'snow' ? 'снега' : 'дождя'} — до ${precipitationChance(wet)}%.`;
  }
  if (hours.every((hour) => hour.precip_mm === 0 && hour.chance_of_rain === 0 && hour.chance_of_snow === 0)) {
    return 'В прогнозе на ближайшие часы осадков нет.';
  }
  return null;
}
