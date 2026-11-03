import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyData, forecastDayLabel, formatForecastTime, precipitationChance, precipitationType, time24, todaySun, upcomingHours, weatherObservation } from '../src/lib/forecast.js';

const condition = { code: 1000, text: 'Ясно' };
const hour = (time, temp_c, offset = '+05:00', extra = {}) => ({ time, time_epoch: Date.parse(`${time.replace(' ', 'T')}:00${offset}`) / 1000, temp_c, condition, ...extra });
const day = (date, hours = [], extra = {}) => ({ date, day: { mintemp_c: -3, maxtemp_c: 7, condition }, hour: hours, ...extra });
const weather = (days, localtime = '2026-11-03 23:45', offset = '+05:00') => ({
  location: { localtime, localtime_epoch: Date.parse(`${localtime.replace(' ', 'T')}:20${offset}`) / 1000 },
  current: { temp_c: 5 }, forecast: { forecastday: days },
});

test('upcoming hours include the current local hour and cross midnight in chronological order', () => {
  const first = hour('2026-11-03 23:00', 1);
  const second = hour('2026-11-04 00:00', 0);
  const payload = weather([day('2026-11-04', [second]), day('2026-11-03', [first, hour('2026-11-03 22:00', 2)])]);
  assert.deepEqual(upcomingHours(payload).map((item) => item.time), [first.time, second.time]);
  assert.equal(upcomingHours(payload, 1).length, 1);
});

test('quarter-hour timezones retain the current hour instead of flooring a UTC hour', () => {
  const payload = weather([day('2026-11-03', [hour('2026-11-03 16:00', 1, '+05:45'), hour('2026-11-03 17:00', 2, '+05:45'), hour('2026-11-03 18:00', 3, '+05:45')])], '2026-11-03 17:57', '+05:45');
  assert.deepEqual(upcomingHours(payload).map((item) => formatForecastTime(item)), ['17:00', '18:00']);
});

test('hour selection falls back only to a reported current epoch and never to the browser clock', () => {
  const payload = { current: { last_updated_epoch: Date.parse('2026-11-03T20:15:00+05:00') / 1000, last_updated: '2026-11-03 20:15' }, forecast: { forecastday: [day('2026-11-03', [hour('2026-11-03 20:00', 1)])] } };
  assert.equal(upcomingHours(payload).length, 1);
  assert.deepEqual(upcomingHours({ forecast: payload.forecast }), []);
  assert.deepEqual(upcomingHours(null), []);
});

test('invalid days, malformed hours and duplicate timestamps do not pollute forecast displays', () => {
  const good = hour('2026-11-03 23:00', 1);
  const payload = weather([day('2026-11-03', [good, good, { ...good, time: 123 }, { ...good, time_epoch: undefined }]), day('2026-02-30'), { date: '2026-11-04', day: { mintemp_c: 5, maxtemp_c: -5, condition } }]);
  assert.equal(dailyData(payload).length, 1);
  assert.equal(upcomingHours(payload).length, 1);
  assert.equal(formatForecastTime('bad'), null);
});

test('precipitation preserves reported zeros, missing values and separate rain/snow meanings', () => {
  assert.equal(precipitationChance({ chance_of_rain: 0, chance_of_snow: 0 }), 0);
  assert.equal(precipitationType({ chance_of_rain: 12, chance_of_snow: 80 }), 'snow');
  assert.equal(precipitationChance({ chance_of_rain: 12, chance_of_snow: 80 }), 80);
  assert.equal(precipitationChance({ daily_chance_of_rain: 70 }, true), 70);
  assert.equal(precipitationChance({ chance_of_rain: '40', chance_of_snow: -2 }), null);
  assert.equal(precipitationChance({}), null);
});

test('astronomy handles noon/midnight and does not invent polar sun times', () => {
  assert.equal(time24('12:00 AM'), '00:00');
  assert.equal(time24('12:00 PM'), '12:00');
  assert.equal(time24('04:44 PM'), '16:44');
  assert.equal(time24('Does not rise today'), null);
  assert.equal(time24('00:15 PM'), null);
  const payload = weather([day('2026-11-03', [], { astro: { sunrise: '06:00 AM', sunset: '06:00 PM' } })], '2026-11-03 12:00');
  const sun = todaySun(payload);
  assert.equal(sun.daylightMinutes, 720);
  assert.equal(sun.progress, .5);
  assert.equal(sun.isDaylight, true);
  payload.location.localtime = '2026-11-03 22:00';
  assert.equal(todaySun(payload).progress, 1);
  assert.equal(todaySun(payload).isDaylight, false);
  payload.forecast.forecastday[0].astro.sunrise = 'Does not rise today';
  assert.equal(todaySun(payload), null);
});

test('day names compare the forecast city date rather than the device date', () => {
  const payload = weather([]);
  assert.equal(forecastDayLabel('2026-11-03', payload), 'Сегодня');
  assert.equal(forecastDayLabel('2026-11-04', payload), 'Завтра');
  assert.equal(forecastDayLabel('2026-11-05', payload), 'четверг');
  assert.equal(forecastDayLabel('2026-02-30', payload), null);
});

test('weather observations are derived from actual forecasts and disappear without supporting data', () => {
  const payload = weather([day('2026-11-03', [hour('2026-11-03 17:00', 5), hour('2026-11-03 18:00', 4), hour('2026-11-03 19:00', 1)])], '2026-11-03 17:27');
  assert.equal(weatherObservation(payload), 'К 19:00 похолодает до 1°C.');
  assert.equal(weatherObservation(payload, 'f'), 'К 19:00 похолодает до 34°F.');
  payload.forecast.forecastday[0].hour = [hour('2026-11-03 17:00', 5, '+05:00', { chance_of_rain: 10, chance_of_snow: 70 })];
  assert.equal(weatherObservation(payload), 'В ближайшие часы вероятность снега — до 70%.');
  assert.equal(weatherObservation({}), null);
  assert.equal(weatherObservation(weather([day('2026-11-03', [hour('2026-11-03 17:00', 5)])], '2026-11-03 17:27')), null);
});
