import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, ChevronDown, LoaderCircle } from 'lucide-react';
import { AtmosphereControls } from './components/AtmosphereControls';
import { CurrentWeather } from './components/CurrentWeather';
import { CitySearchDialog } from './components/CitySearchDialog';
import { DailyForecast, HourlyForecast } from './components/ForecastPanels';
import { Reveal } from './components/Reveal';
import { SceneBackground } from './components/SceneBackground';
import { SunDetails } from './components/SunDetails';
import { WeatherError } from './components/WeatherFeedback';
import { WeatherMetrics } from './components/WeatherMetrics';
import { useGeolocation } from './hooks/useGeolocation';
import { usePreference, validBoolean, validUnit } from './hooks/usePreferences';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useWeather } from './hooks/useWeather';
import { weatherObservation } from './lib/forecast';
import { cityName, getWeatherScene, temperature } from './lib/weather';
import './WeatherPalette.css';
import './App.css';

export default function App() {
  const { weather, loading, error, load, retry, forecastUnavailable } = useWeather();
  const geo = useGeolocation();
  const [unit, setUnit] = usePreference('unit', 'c', validUnit);
  const [paused, setPaused] = usePreference('paused', false, validBoolean);
  const [selected, setSelected] = useState('auto');
  const [searchOpen, setSearchOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const motion = !paused && !reducedMotion;
  const actualScene = weather ? getWeatherScene(weather.current.condition.code, weather.current.is_day) : 'clear';
  const scene = selected === 'auto' ? actualScene : selected;
  const isDay = selected === 'auto' ? weather?.current.is_day !== 0 : selected !== 'night';
  const feedback = geo.error || error;
  const intensity = selected === 'auto' ? Math.min(1, Math.max(.12, (weather?.current.precip_mm || 0) / 4)) : .45;
  const observation = weather ? weatherObservation(weather, unit) : null;

  async function loadAndClose(query) {
    const result = await load(query);
    if (result) setSearchOpen(false);
    return result;
  }
  function search(query) { geo.cancel(); return loadAndClose(query); }
  function locate() { geo.locate(loadAndClose); }
  async function retryAndClose() {
    if (geo.error) { locate(); return; }
    const result = await retry();
    if (result) setSearchOpen(false);
  }

  function goToForecast(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = document.getElementById('forecast');
    if (!target) return;
    event.preventDefault();
    if (window.location.hash !== '#forecast') window.history.pushState(null, '', '#forecast');
    target.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
    target.focus({ preventScroll: true });
  }

  useEffect(() => {
    document.title = weather ? cityName(weather.location.name) + ' ' + temperature(weather.current.temp_c, unit) + '°' + unit.toUpperCase() + ' — NEBO' : 'NEBO — погода по часам и дням';
  }, [weather, unit]);

  return <div className={'weather-app ' + (!motion ? 'app-motion-paused' : '')} data-scene={scene} data-day={isDay}>
    <a className="skip-link" href="#forecast">Перейти к прогнозу</a>
    <SceneBackground scene={scene} motion={motion} intensity={intensity} isDay={isDay} />
    <main id="weather-main">
      <section className="sky-hero" aria-label="Погода сейчас">
        <header className="hero-header"><a href="/" className="brand" aria-label="NEBO — на главную">NEBO<span aria-hidden="true">.</span></a>
        </header>
        <div className="hero-weather">
          {weather ? <CurrentWeather weather={weather} unit={unit} loading={loading} onChooseCity={() => setSearchOpen(true)} /> :
            <div className="hero-empty">{loading ? <><LoaderCircle size={24} className="spin" aria-hidden="true" /><p role="status">Загружаем погоду…</p></> : <>
              {!searchOpen && feedback && <WeatherError error={feedback} onRetry={retryAndClose} />}
              <button className="empty-city-button" type="button" onClick={() => setSearchOpen(true)}>Выбрать город<ChevronDown size={20} /></button>
            </>}</div>}
          {weather && loading && <p className="hero-loading" role="status">Обновляем погоду…</p>}
          {weather && feedback && !searchOpen && <WeatherError error={feedback} onRetry={retryAndClose} />}
        </div>
        <a className="forecast-cue" href="#forecast" onClick={goToForecast} aria-label="Перейти к прогнозу"><ArrowDown size={20} aria-hidden="true" /></a>
      </section>
      <div className="forecast-shell" id="forecast" tabIndex={-1}>
        <div className="forecast-container">
          <Reveal motion={motion}><div className="forecast-intro"><div><p className="eyebrow">Прогноз</p><h2>{weather ? cityName(weather.location.name) : 'Погода по часам и дням'}</h2>{observation && <p className="forecast-observation">{observation}</p>}</div>
            <div className="forecast-tools"><button type="button" className="change-city" onClick={() => setSearchOpen(true)}>Другой город<ChevronDown size={15} /></button>
              <div className="unit-switch" role="group" aria-label="Единицы температуры">{['c','f'].map(value => <button key={value} type="button" onClick={() => setUnit(value)} aria-pressed={unit === value} aria-label={value === 'c' ? 'Градусы Цельсия' : 'Градусы Фаренгейта'}>°{value.toUpperCase()}</button>)}</div>
            </div></div></Reveal>
          {forecastUnavailable && <div className="forecast-unavailable" role="status">Прогноз пока недоступен. Текущая погода показана выше.<button onClick={retryAndClose} type="button">Повторить</button></div>}
          {weather && <div className="forecast-content" aria-busy={loading}>
            <Reveal motion={motion}><HourlyForecast weather={weather} unit={unit} motion={motion} /></Reveal>
            <Reveal motion={motion}>
              <div className="forecast-matte">
                <DailyForecast weather={weather} unit={unit} />
                <div className="details-layout">
                  <WeatherMetrics current={weather.current} />
                  <SunDetails weather={weather} />
                </div>
              </div>
            </Reveal>
          </div>}
          <Reveal motion={motion}><AtmosphereControls selected={selected} setSelected={setSelected} paused={paused} setPaused={setPaused} reducedMotion={reducedMotion} /></Reveal>
          <footer className="site-footer"><span>NEBO</span><p>Погода по местному времени города.</p><a href="https://github.com/bossmerej-ship-it/weather-app" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={14} aria-hidden="true" /></a></footer>
        </div>
      </div>
    </main>
    <CitySearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onSearch={search} onGeolocation={locate} loading={loading} locating={geo.locating} activeCity={weather?.location.name} feedback={feedback} onRetry={retryAndClose} />
  </div>;
}
