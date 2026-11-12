import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cityName, countryName, getWeatherKind, locationClock, temperature } from '../lib/weather';
import { WeatherIcon } from './WeatherIcon';

export function CurrentWeather({ weather, unit, onChooseCity, loading }) {
  const { current, location } = weather;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;

    function updateClock() {
      clearTimeout(timer);
      const time = new Date();
      setNow(time);
      timer = setTimeout(updateClock, 60_000 - time.getTime() % 60_000);
    }

    updateClock();
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);
  const clock = location.tz_id ? locationClock(location.tz_id, now) : null;
  const reading = temperature(current.temp_c, unit);
  const unitLabel = '°' + unit.toUpperCase();
  const kind = getWeatherKind(current.condition.code);
  const icon = [1006, 1009].includes(current.condition.code) ? 'overcast' : current.is_day === 0 && kind === 'clear' ? 'night' : current.is_day === 0 && kind === 'clouds' ? 'night-clouds' : kind;
  return <section className={'current-weather ' + (loading ? 'current-updating' : '')} aria-labelledby="city-title" aria-busy={loading}>
    <p className="current-kicker">{countryName(location.country)}{clock && <span> · {clock.time}</span>}</p>
    <h1 id="city-title"><button className="city-trigger" type="button" onClick={onChooseCity} aria-haspopup="dialog" aria-label={cityName(location.name) + ' — выбрать город'}>
      {cityName(location.name)}<ChevronDown size={23} aria-hidden="true" />
    </button></h1>
    <div className="current-data" key={location.name + ':' + location.lat + ':' + location.lon}>
      <div className="current-reading">
        <p className="current-temperature" aria-label={'Температура ' + reading + ' по шкале ' + (unit === 'c' ? 'Цельсия' : 'Фаренгейта')}>{reading}<span>{unitLabel}</span></p>
        <WeatherIcon kind={icon} size={39} />
      </div>
      <p className="current-condition">{current.condition.text}</p>
      <p className="current-feels">Ощущается как {temperature(current.feelslike_c, unit)}{unitLabel}</p>
    </div>
  </section>;
}
