const SNOW = new Set([1066, 1069, 1072, 1114, 1117, 1168, 1171, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264]);
const RAIN = new Set([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246]);
const THUNDER = new Set([1087, 1273, 1276, 1279, 1282]);
const FOG = new Set([1030, 1135, 1147]);

export function getWeatherKind(code) {
  if (THUNDER.has(code)) return 'storm';
  if (SNOW.has(code)) return 'snow';
  if (RAIN.has(code)) return 'rain';
  if (FOG.has(code)) return 'fog';
  if (code === 1000) return 'clear';
  return 'clouds';
}

export function getWeatherScene(code, isDay) {
  const kind = getWeatherKind(code);
  return isDay === 0 && kind === 'clear' ? 'night' : kind;
}

export function temperature(value, unit = 'c') {
  return Math.round(unit === 'f' ? value * 9 / 5 + 32 : value);
}

export function windDirection(degrees = 0) {
  return ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'][Math.round(degrees / 45) % 8];
}

export function pressureInMm(millibars) {
  return Math.round(millibars * 0.750061683);
}

const CITY_NAMES = { Astana: 'Астана', Almaty: 'Алматы', London: 'Лондон', Tokyo: 'Токио', Moscow: 'Москва', Paris: 'Париж', 'New York': 'Нью-Йорк', Dubai: 'Дубай', Istanbul: 'Стамбул' };
const COUNTRY_NAMES = { Kazakhstan: 'Казахстан', Russia: 'Россия', 'United Kingdom': 'Великобритания', Japan: 'Япония', France: 'Франция', 'United States of America': 'США', 'United Arab Emirates': 'ОАЭ', Turkey: 'Турция', Turkiye: 'Турция' };

export const cityName = (name) => Object.hasOwn(CITY_NAMES, name) ? CITY_NAMES[name] : name;
export const countryName = (name) => Object.hasOwn(COUNTRY_NAMES, name) ? COUNTRY_NAMES[name] : name;

export function locationClock(timeZone, now = new Date()) {
  try {
    return {
      time: new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }).format(now),
      date: new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'long', weekday: 'long' }).format(now),
    };
  } catch {
    return null;
  }
}
