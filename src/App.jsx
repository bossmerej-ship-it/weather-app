import { useEffect, useState } from 'react';
import { ArrowUpRight, MoveUpRight } from 'lucide-react';
import { AtmosphereControls } from './components/AtmosphereControls';
import { CurrentWeather } from './components/CurrentWeather';
import { Header } from './components/Header';
import { SceneBackground } from './components/SceneBackground';
import { WeatherError, WeatherSkeleton } from './components/WeatherFeedback';
import { WeatherMetrics } from './components/WeatherMetrics';
import { useGeolocation } from './hooks/useGeolocation';
import { usePreference, validBoolean, validUnit } from './hooks/usePreferences';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useWeather } from './hooks/useWeather';
import { SCENE_CAPTIONS } from './lib/scenes';
import { cityName, getWeatherScene, temperature } from './lib/weather';
import './App.css';

export default function App() {
  const { weather, loading, error, load, retry } = useWeather();
  const geo = useGeolocation();
  const [unit, setUnit] = usePreference('unit', 'c', validUnit);
  const [paused, setPaused] = usePreference('paused', false, validBoolean);
  const [selected, setSelected] = useState('auto');
  const reducedMotion = useReducedMotion();
  const motion = !paused && !reducedMotion;
  const actualScene = weather ? getWeatherScene(weather.current.condition.code, weather.current.is_day) : 'clear';
  const scene = selected === 'auto' ? actualScene : selected;
  const feedback = geo.error || error;

  function search(query) {
    geo.cancel();
    load(query);
  }

  useEffect(() => {
    document.title = weather
      ? `${cityName(weather.location.name)} ${temperature(weather.current.temp_c, unit)}°${unit.toUpperCase()} — NEBO`
      : 'NEBO — погода в моменте';
  }, [weather, unit]);

  return (
    <div className={`weather-app ${motion ? '' : 'app-motion-paused'}`}>
      <a className="skip-link" href="#weather-main">Перейти к погоде</a>
      <SceneBackground scene={scene} motion={motion} />
      <div className="app-content">
        <Header onSearch={search} onGeolocation={() => geo.locate(load)} loading={loading} locating={geo.locating}
          unit={unit} setUnit={setUnit} activeCity={weather?.location.name} />
        <main id="weather-main" tabIndex={-1}>
          <div className="weather-status sr-only" role="status">{loading ? 'Загружаем погоду' : geo.locating ? 'Определяем местоположение' : weather ? `Погода: ${cityName(weather.location.name)}, ${temperature(weather.current.temp_c, unit)} градусов, ${weather.current.condition.text}` : ''}</div>
          {feedback && weather && <WeatherError error={feedback} onRetry={geo.error ? () => geo.locate(load) : retry} />}
          {weather ? <>
            <CurrentWeather weather={weather} unit={unit} />
            <div className="details-heading"><h2>В деталях</h2><span><span className="detail-line" />За окном — целый мир<MoveUpRight size={13} aria-hidden="true" /></span></div>
            <WeatherMetrics current={weather.current} unit={unit} />
          </> : loading ? <WeatherSkeleton /> : feedback ? <WeatherError error={feedback} onRetry={geo.error ? () => geo.locate(load) : retry} standalone /> : null}
          <AtmosphereControls selected={selected} setSelected={setSelected} paused={paused} setPaused={setPaused} reducedMotion={reducedMotion} />
        </main>
        <footer className="site-footer"><p><span className="footer-mark">n.</span>Погода в своём ритме.</p><span className="illustration-note">Пейзаж — иллюстрация настроения</span><a href="https://github.com/bossmerej-ship-it/weather-app" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={13} aria-hidden="true" /></a></footer>
      </div>
      <div className="scene-signature" aria-hidden="true"><span />{SCENE_CAPTIONS[scene]}</div>
    </div>
  );
}
