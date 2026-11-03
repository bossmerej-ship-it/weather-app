import test from 'node:test';
import assert from 'node:assert/strict';
import { cityName, getWeatherKind, getWeatherScene, locationClock, pressureInMm, temperature, windDirection } from '../src/lib/weather.js';

test('weather groups cover freezing rain, sleet, thunderstorms and fog', () => {
  assert.equal(getWeatherKind(1000), 'clear');
  assert.equal(getWeatherKind(1006), 'clouds');
  assert.equal(getWeatherKind(1198), 'rain');
  assert.equal(getWeatherKind(1207), 'snow');
  assert.equal(getWeatherKind(1279), 'storm');
  assert.equal(getWeatherKind(1147), 'fog');
  assert.equal(getWeatherKind(-1), 'clouds');
});

test('automatic night atmosphere preserves the original day/night behavior', () => {
  assert.equal(getWeatherScene(1000, 0), 'night');
  assert.equal(getWeatherScene(1183, 0), 'night');
  assert.equal(getWeatherScene(1183, 1), 'rain');
});

test('temperature units preserve freezing, negative and zero values', () => {
  assert.equal(temperature(0), 0);
  assert.equal(temperature(0, 'f'), 32);
  assert.equal(temperature(-40, 'f'), -40);
  assert.equal(temperature(37.1, 'f'), 99);
  assert.equal(temperature(-7.4), -7);
});

test('wind cardinal directions wrap at north and pressure uses mmHg', () => {
  assert.equal(windDirection(0), 'С');
  assert.equal(windDirection(90), 'В');
  assert.equal(windDirection(270), 'З');
  assert.equal(windDirection(359), 'С');
  assert.equal(pressureInMm(1013.25), 760);
});

test('local clocks use the city timezone rather than the browser timezone', () => {
  const now = new Date('2026-11-03T12:00:00Z');
  assert.equal(locationClock('Asia/Tokyo', now).time, '21:00');
  assert.equal(locationClock('Europe/London', now).time, '12:00');
  assert.equal(locationClock('Invalid/Zone', now), null);
  assert.equal(cityName('Astana'), 'Астана');
  assert.equal(cityName('São Paulo'), 'São Paulo');
});
