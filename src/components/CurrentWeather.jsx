import { MapPin, ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cityName, countryName, getWeatherKind, locationClock, temperature } from '../lib/weather';
import { dailyData, weatherObservation } from '../lib/forecast';
import { WeatherIcon } from './WeatherIcon';

export function CurrentWeather({ weather, unit }) {
  const { current, location } = weather;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const interval = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(interval); }, []);
  const clock = location.tz_id ? locationClock(location.tz_id, now) : null;
  const kind = getWeatherKind(current.condition.code);
  const icon = [1006, 1009].includes(current.condition.code) ? 'overcast' : current.is_day === 0 && kind === 'clear' ? 'night' : current.is_day === 0 && kind === 'clouds' ? 'night-clouds' : kind;
  const today = dailyData(weather).find(day => day.date === location.localtime?.slice(0,10))?.day;
  const observation = weatherObservation(weather, unit);
  return <section className="current-weather" aria-labelledby="city-title">
    <div className="current-kicker"><span><MapPin size={14} aria-hidden="true" />{countryName(location.country)}</span>{clock && <span>{clock.date} <b>· {clock.time}</b></span>}</div>
    <h1 id="city-title">{cityName(location.name)}</h1>
    <div className="current-reading">
      <p className="current-temperature" aria-label={`Температура ${temperature(current.temp_c, unit)} по шкале ${unit === 'c' ? 'Цельсия' : 'Фаренгейта'}`}>{temperature(current.temp_c, unit)}<span>°{unit.toUpperCase()}</span></p>
      <div className="current-condition"><WeatherIcon kind={icon} size={42} /><div><h2>{current.condition.text}</h2><p>Ощущается как {temperature(current.feelslike_c, unit)}°</p></div></div>
    </div>
    {today && <div className="today-range"><span>Сегодня</span><span><ArrowDown size={14} aria-hidden="true" />{temperature(today.mintemp_c, unit)}°</span><span><ArrowUp size={14} aria-hidden="true" />{temperature(today.maxtemp_c, unit)}°</span><span className="range-label">минимум / максимум</span></div>}
    {observation && <p className="weather-observation"><span aria-hidden="true" />{observation}</p>}
  </section>;
}
