import test from 'node:test';
import assert from 'node:assert/strict';
import { requestWeather } from '../src/services/weather.js';

const data = {
  location: { name: 'Astana', country: 'Kazakhstan' },
  current: { temp_c: 0, feelslike_c: -3, humidity: 80, wind_kph: 12, pressure_mb: 1013, is_day: 1, condition: { code: 1000, text: 'Солнечно' } },
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('city queries are trimmed, encoded and keep the existing Russian API contract', async () => {
  let requested;
  const result = await requestWeather('  São Paulo & район?  ', { apiKey: 'test-key', fetcher: async (url) => { requested = new URL(url); return response(data); } });
  assert.deepEqual(result, data);
  assert.equal(requested.origin, 'https://api.weatherapi.com');
  assert.equal(requested.pathname, '/v1/current.json');
  assert.equal(requested.searchParams.get('q'), 'São Paulo & район?');
  assert.equal(requested.searchParams.get('lang'), 'ru');
  assert.equal(requested.searchParams.get('key'), 'test-key');
});

test('empty city and missing configuration fail before a network request', async () => {
  let calls = 0;
  const fetcher = () => { calls += 1; };
  await assert.rejects(requestWeather('   ', { apiKey: 'test-key', fetcher }), { code: 'empty' });
  await assert.rejects(requestWeather('Astana', { fetcher }), { code: 'configuration' });
  await assert.rejects(requestWeather('Astana', { apiKey: 'your_weatherapi_key', fetcher }), { code: 'configuration' });
  assert.equal(calls, 0);
});

test('provider errors distinguish missing cities from quota and key failures without leaking provider messages', async () => {
  for (const [code, expected] of [[1006, 'not-found'], [2007, 'unavailable'], [2006, 'configuration'], [9999, 'unavailable']]) {
    await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher: async () => response({ error: { code, message: 'PRIVATE PROVIDER DETAIL' } }, 400) }), (error) => {
      assert.equal(error.code, expected);
      assert.ok(!error.message.includes('PRIVATE'));
      return true;
    });
  }
});

test('malformed and non-JSON responses never become weather data', async () => {
  for (const body of [{}, { ...data, current: { ...data.current, temp_c: '0' } }, { ...data, current: { ...data.current, pressure_mb: null } }]) {
    await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher: async () => response(body) }), { code: 'unavailable' });
  }
  await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher: async () => new Response('<html>server error</html>', { status: 502 }) }), { code: 'unavailable' });
});

test('network failures are actionable and cancellation remains cancellation', async () => {
  await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher: async () => { throw new TypeError('Failed to fetch'); } }), { code: 'unavailable' });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', signal: controller.signal, fetcher: async (_, { signal }) => { signal.throwIfAborted(); } }), { name: 'AbortError' });
});
