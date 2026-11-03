import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cityName, countryName, getWeatherKind, locationClock, temperature } from '../lib/weather';
import { WeatherIcon } from './WeatherIcon';

export function CurrentWeather({ weather, unit }) {
  const { current, location } = weather;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  const clock = location.tz_id ? locationClock(location.tz_id, now) : null;
  const kind = getWeatherKind(current.condition.code);
  const iconKind = [1006, 1009].includes(current.condition.code) ? 'overcast'
    : current.is_day === 0 && kind === 'clear' ? 'night'
      : current.is_day === 0 && kind === 'clouds' ? 'night-clouds' : kind;
  const degrees = temperature(current.temp_c, unit);

  return (
    <section className="weather-hero" aria-labelledby="city-title">
      <div className="hero-copy" key={`${location.name}-${location.country}`}>
        <div className="place-eyebrow"><MapPin size={13} aria-hidden="true" /><span>{countryName(location.country)}</span><span className="eyebrow-line" /><span>Сейчас</span></div>
        <h1 id="city-title">{cityName(location.name)}</h1>
        <div className="temperature-composition">
          <p className={`current-temperature ${String(degrees).length > 2 ? 'temperature-compact' : ''}`} aria-label={`${degrees} градусов ${unit === 'c' ? 'Цельсия' : 'Фаренгейта'}`}>
            {degrees}<span className="degree">°</span><span className="temperature-unit">{unit.toUpperCase()}</span>
          </p>
          <div className="condition-composition">
            <span className={`condition-symbol condition-${kind}`}><WeatherIcon kind={iconKind} size={47} /></span>
            <p className="current-condition">{current.condition.text}</p>
            <p className="hero-note">Почувствуйте этот момент.</p>
          </div>
        </div>
      </div>
      {clock && <div className="local-clock"><span className="clock-label">Местное время</span><span className="clock-value">{clock.time}</span><span className="clock-date">{clock.date}</span></div>}
      <div className="landscape-caption" aria-hidden="true"><span className="caption-line" />Немного ближе к природе</div>
    </section>
  );
}
