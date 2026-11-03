import { Droplets, Gauge, Navigation, Thermometer, Wind } from 'lucide-react';
import { pressureInMm, temperature, windDirection } from '../lib/weather';

export function WeatherMetrics({ current, unit }) {
  const wind = Math.round(current.wind_kph / 3.6);
  const difference = Math.round(current.feelslike_c - current.temp_c);
  const feelsDescription = Math.abs(difference) < 1 ? 'Как на термометре' : difference < 0 ? 'Прохладнее, чем кажется' : 'Теплее, чем кажется';
  return (
    <section className="instruments" aria-label="Подробности погоды">
      <article className="metric metric-feels">
        <div className="metric-label"><Thermometer size={16} aria-hidden="true" /><h2>Ощущается</h2></div>
        <p className="metric-value">{temperature(current.feelslike_c, unit)}<span>°{unit.toUpperCase()}</span></p>
        <p className="metric-description">{feelsDescription}</p>
        <div className="thermometer-track" aria-hidden="true"><span style={{ width: `${Math.max(8, Math.min(92, (current.feelslike_c + 30) / 75 * 100))}%` }} /></div>
      </article>
      <article className="metric metric-humidity">
        <div className="metric-label"><Droplets size={16} aria-hidden="true" /><h2>Влажность</h2></div>
        <p className="metric-value">{current.humidity}<span>%</span></p>
        <p className="metric-description">Относительная влажность</p>
        <div className="humidity-dots" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} className={i < current.humidity / 5 ? 'filled' : ''} />)}</div>
      </article>
      <article className="metric metric-wind">
        <div className="metric-label"><Wind size={16} aria-hidden="true" /><h2>Ветер</h2></div>
        <p className="metric-value">{wind}<span>м/с</span></p>
        <p className="metric-description">{wind === 0 ? 'Штиль' : <>Скорость ветра <span className="wind-direction"><Navigation size={11} style={{ transform: `rotate(${current.wind_degree || 0}deg)` }} aria-hidden="true" />{windDirection(current.wind_degree)}</span></>}</p>
        <div className="wind-lines" aria-hidden="true"><span /><span /><span /></div>
      </article>
      <article className="metric metric-pressure">
        <div className="metric-label"><Gauge size={16} aria-hidden="true" /><h2>Давление</h2></div>
        <p className="metric-value">{pressureInMm(current.pressure_mb)}<span>мм</span></p>
        <p className="metric-description">Миллиметров ртутного столба</p>
        <div className="pressure-scale" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}<span style={{ left: `${Math.max(3, Math.min(97, (current.pressure_mb - 960) / 100 * 100))}%` }} /></div>
      </article>
    </section>
  );
}
