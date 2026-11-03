import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AtmosphereControls } from './components/AtmosphereControls';
import { CurrentWeather } from './components/CurrentWeather';
import { DailyForecast, HourlyForecast } from './components/ForecastPanels';
import { Header } from './components/Header';
import { SunWindow } from './components/SunWindow';
import { WeatherError, WeatherSkeleton } from './components/WeatherFeedback';
import { WeatherMetrics } from './components/WeatherMetrics';
import { useGeolocation } from './hooks/useGeolocation';
import { usePreference, validBoolean, validUnit } from './hooks/usePreferences';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useWeather } from './hooks/useWeather';
import { cityName, getWeatherScene, temperature } from './lib/weather';
import './App.css';

export default function App() {
  const { weather, loading, error, load, retry, forecastUnavailable } = useWeather();
  const geo = useGeolocation();
  const [unit, setUnit] = usePreference('unit', 'c', validUnit);
  const [paused, setPaused] = usePreference('paused', false, validBoolean);
  const [selected, setSelected] = useState('auto');
  const reducedMotion = useReducedMotion();
  const motion = !paused && !reducedMotion;
  const actualScene = weather ? getWeatherScene(weather.current.condition.code, weather.current.is_day) : 'clear';
  const scene = selected === 'auto' ? actualScene : selected;
  const feedback = geo.error || error;
  const intensity = selected === 'auto' ? Math.min(1,Math.max(.12,(weather?.current.precip_mm || 0)/4)) : .45;
  function search(query) { geo.cancel(); load(query); }
  useEffect(() => { document.title = weather ? `${cityName(weather.location.name)} ${temperature(weather.current.temp_c, unit)}°${unit.toUpperCase()} — NEBO` : 'NEBO — погода по часам и дням'; }, [weather, unit]);
  return <div className={`weather-app ${motion ? '' : 'app-motion-paused'}`}>
    <a className="skip-link" href="#weather-main">Перейти к погоде</a>
    <div className="app-content">
      <Header onSearch={search} onGeolocation={() => geo.locate(load)} loading={loading} locating={geo.locating} unit={unit} setUnit={setUnit} activeCity={weather?.location.name} />
      <main id="weather-main" tabIndex={-1}>
        <div className="sr-only" role="status">{loading ? 'Загружаем погоду' : geo.locating ? 'Определяем местоположение' : weather ? `Погода в городе ${cityName(weather.location.name)}: ${temperature(weather.current.temp_c, unit)}°${unit.toUpperCase()}, ${weather.current.condition.text}` : ''}</div>
        {feedback && weather && <WeatherError error={feedback} onRetry={geo.error ? () => geo.locate(load) : retry} />}
        {weather ? <div className={`weather-content ${loading?'weather-refreshing':''}`} aria-busy={loading}>
          <div className="now-layout" key={`${weather.location.name}-${weather.location.country}`}>
            <CurrentWeather weather={weather} unit={unit} />
            <SunWindow weather={weather} scene={scene} motion={motion} intensity={intensity} />
          </div>
          {forecastUnavailable && <div className="forecast-unavailable" role="status">Прогноз пока недоступен. Текущая погода показана выше.<button onClick={retry} type="button">Повторить</button></div>}
          <HourlyForecast weather={weather} unit={unit} motion={motion} />
          <div className="outlook-layout"><DailyForecast weather={weather} unit={unit} /><WeatherMetrics current={weather.current} /></div>
        </div> : loading ? <WeatherSkeleton /> : feedback ? <WeatherError error={feedback} onRetry={geo.error ? () => geo.locate(load) : retry} standalone /> : null}
        <AtmosphereControls selected={selected} setSelected={setSelected} paused={paused} setPaused={setPaused} reducedMotion={reducedMotion} />
      </main>
      <footer className="site-footer"><span className="footer-brand">nebo.</span><p>Текущая погода и прогноз по местному времени города.</p><a href="https://github.com/bossmerej-ship-it/weather-app" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={13} /></a></footer>
    </div>
  </div>;
}
