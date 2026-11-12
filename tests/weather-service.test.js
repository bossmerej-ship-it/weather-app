import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDashboardWeather, requestWeather } from '../src/services/weather.js';

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
  for (const [code, expected] of [[1006, 'not-found'], [2007, 'quota'], [2006, 'configuration'], [9999, 'unavailable']]) {
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

test('invalid display strings are rejected before they reach the dashboard', async () => {
  const invalidPayloads = [
    { ...data, location: { ...data.location, name: '  ' } },
    { ...data, location: { ...data.location, country: { label: 'Kazakhstan' } } },
    { ...data, current: { ...data.current, condition: { ...data.current.condition, text: ['Солнечно'] } } },
  ];
  for (const payload of invalidPayloads) {
    const fetcher = async () => response(payload);
    await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher }), { code: 'unavailable' });
  }
});

test('network failures are actionable and cancellation remains cancellation', async () => {
  await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher: async () => { throw new TypeError('Failed to fetch'); } }), { code: 'unavailable' });
  await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', fetcher: async () => { throw new DOMException('Cancelled', 'AbortError'); } }), { name: 'AbortError' });
});

test('a cancelled weather request never starts another network operation', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const fetcher = async () => { calls += 1; return response(data); };
  await assert.rejects(requestWeather('Astana', { apiKey: 'test-key', signal: controller.signal, fetcher }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('a forecast cancelled while reading JSON cannot be returned or retried', async () => {
  const controller = new AbortController();
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return {
      ok: true,
      async json() {
        controller.abort();
        return forecast;
      },
    };
  };
  await assert.rejects(requestDashboardWeather('Astana', { apiKey: 'test-key', signal: controller.signal, fetcher }), { name: 'AbortError' });
  assert.equal(calls, 1);
});

const forecast = {
  ...data,
  forecast: { forecastday: [{
    date: '2026-11-03',
    day: { mintemp_c: -2, maxtemp_c: 5, condition: { code: 1000, text: 'Солнечно' } },
    astro: { sunrise: '07:10 AM', sunset: '04:44 PM' },
    hour: [],
  }] },
};

test('dashboard uses the real three-day forecast endpoint without a redundant current request', async () => {
  const requests = [];
  const result = await requestDashboardWeather('Astana', { apiKey: 'test-key', fetcher: async (url) => { requests.push(new URL(url)); return response(forecast); } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].pathname, '/v1/forecast.json');
  assert.equal(requests[0].searchParams.get('days'), '3');
  assert.equal(result.forecastUnavailable, false);
  assert.deepEqual(result.weather.forecast.forecastday[0].day, forecast.forecast.forecastday[0].day);
});

test('forecast plan restrictions fall back to real current conditions and expose forecast unavailability', async () => {
  const paths = [];
  const result = await requestDashboardWeather('Astana', { apiKey: 'test-key', fetcher: async (url) => {
    paths.push(new URL(url).pathname);
    return paths.length === 1 ? response({ error: { code: 2009, message: 'Plan restriction' } }, 403) : response(data);
  } });
  assert.deepEqual(paths, ['/v1/forecast.json', '/v1/current.json']);
  assert.equal(result.forecastUnavailable, true);
  assert.deepEqual(result.weather, data);
  assert.ok(!('forecast' in result.weather));
});

test('an exhausted API key quota does not trigger a fallback request', async () => {
  const paths = [];
  const fetcher = async (url) => {
    paths.push(new URL(url).pathname);
    return response({ error: { code: 2007 } }, 403);
  };
  await assert.rejects(requestDashboardWeather('Astana', { apiKey: 'test-key', fetcher }), { code: 'quota' });
  assert.deepEqual(paths, ['/v1/forecast.json']);
});

test('missing or malformed forecasts never become invented days and recover through current.json', async () => {
  for (const broken of [data, { ...forecast, forecast: { forecastday: [] } }, { ...forecast, forecast: { forecastday: [{ ...forecast.forecast.forecastday[0], day: { ...forecast.forecast.forecastday[0].day, mintemp_c: '0' } }] } }]) {
    let calls = 0;
    const result = await requestDashboardWeather('Astana', { apiKey: 'test-key', fetcher: async () => response(++calls === 1 ? broken : data) });
    assert.equal(calls, 2);
    assert.equal(result.forecastUnavailable, true);
    assert.ok(!('forecast' in result.weather));
  }
});

test('partially available forecasts omit invalid days and leave missing optional values missing', async () => {
  const payload = { ...forecast, forecast: { forecastday: [forecast.forecast.forecastday[0], { ...forecast.forecast.forecastday[0], date: '2026-11-04', day: { mintemp_c: 2, maxtemp_c: -2 } }] } };
  const result = await requestDashboardWeather('Astana', { apiKey: 'test-key', fetcher: async () => response(payload) });
  assert.equal(result.forecastUnavailable, false);
  assert.equal(result.weather.forecast.forecastday.length, 1);
  assert.equal(result.weather.forecast.forecastday[0].day.daily_chance_of_rain, undefined);
});

test('a cancelled or terminally invalid forecast request does not start a fallback request', async () => {
  let calls = 0;
  const controller = new AbortController();
  await assert.rejects(requestDashboardWeather('Astana', { apiKey: 'test-key', signal: controller.signal, fetcher: async () => { calls += 1; controller.abort(); controller.signal.throwIfAborted(); } }), { name: 'AbortError' });
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(requestDashboardWeather('zzzz', { apiKey: 'test-key', fetcher: async () => { calls += 1; return response({ error: { code: 1006 } }, 400); } }), { code: 'not-found' });
  assert.equal(calls, 1);
});
