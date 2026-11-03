import { Droplets, Snowflake, ArrowRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
const HourlyChart = lazy(() => import('./HourlyChart'));
import { dailyData, forecastDayLabel, formatForecastTime, precipitationChance, precipitationType, upcomingHours } from '../lib/forecast';
import { getWeatherKind, temperature } from '../lib/weather';
import { WeatherIcon } from './WeatherIcon';

function iconKind(record) {
  const kind = getWeatherKind(record.condition.code);
  if ([1006, 1009].includes(record.condition.code)) return 'overcast';
  if (record.is_day === 0 && kind === 'clear') return 'night';
  if (record.is_day === 0 && kind === 'clouds') return 'night-clouds';
  return kind;
}

export function HourlyForecast({ weather, unit, motion }) {
  const hours = upcomingHours(weather, 8);
  if (!hours.length) return null;
  const points = hours.map(hour => ({ ...hour, timeLabel: formatForecastTime(hour), degrees: temperature(hour.temp_c, unit) }));
  return <section className="hourly-panel" aria-labelledby="hourly-title">
    <div className="section-heading"><h2 id="hourly-title">Ближайшие часы</h2><span>Температура, °{unit.toUpperCase()}</span></div>
    <div className="hourly-scroll" tabIndex={0} role="region" aria-label="Почасовой прогноз, прокручивается по горизонтали">
      <div className="hourly-content">
        <div className="hourly-times">{points.map((hour) => <div key={hour.time_epoch}><span>{hour.time.slice(0,13) === weather.location.localtime.slice(0,13) ? 'Этот час' : hour.timeLabel}</span><WeatherIcon kind={iconKind(hour)} size={26} /></div>)}</div>
        <div className="temperature-chart"><Suspense fallback={<span className="sr-only">Температура по часам</span>}><HourlyChart points={points} unit={unit} motion={motion} /></Suspense></div>
        <div className="hourly-rain">{points.map(hour => { const chance=precipitationChance(hour); const snow=precipitationType(hour)==='snow'; return <div key={hour.time_epoch} title={chance===null?'Вероятность недоступна':`${snow?'Снег':'Дождь'}: ${chance}%`}>{snow?<Snowflake size={13} aria-hidden="true" />:<Droplets size={13} aria-hidden="true" />}<span>{chance===null?'—':`${chance}%`}</span></div>; })}</div>
      </div>
    </div>
    <div className="forecast-key"><p><Droplets size={12} />Вероятность дождя или снега — под каждым часом</p><span className="scroll-hint">Листайте часы<ArrowRight size={13} /></span></div>
    <div className="sr-only"><table><caption>Почасовой прогноз</caption><thead><tr><th>Время</th><th>Температура °{unit.toUpperCase()}</th><th>Погода</th><th>Вероятность дождя или снега</th></tr></thead><tbody>{points.map(hour=><tr key={hour.time_epoch}><th>{hour.timeLabel}</th><td>{hour.degrees}</td><td>{hour.condition.text}</td><td>{precipitationChance(hour)===null?'Нет данных':`${precipitationType(hour)==='snow'?'Снег':'Дождь'}: ${precipitationChance(hour)}%`}</td></tr>)}</tbody></table></div>
  </section>;
}

export function DailyForecast({ weather, unit }) {
  const days = dailyData(weather);
  if (!days.length) return null;
  const low = Math.min(...days.map(day=>day.day.mintemp_c));
  const high = Math.max(...days.map(day=>day.day.maxtemp_c));
  const range = high-low || 1;
  return <section className="daily-panel" aria-labelledby="daily-title">
    <div className="section-heading"><h2 id="daily-title">По дням</h2><span>Дней: {days.length} · °{unit.toUpperCase()}</span></div>
    <div className="daily-legend"><span>День / погода</span><span>Мин.</span><span className="range-legend">Диапазон за сутки</span><span>Макс.</span><span>Дождь / снег</span></div>
    <div className="daily-rows">{days.map(day=>{ const chance=precipitationChance(day.day,true); const snow=precipitationType(day.day,true)==='snow'; return <div className="daily-row" key={day.date}>
      <div className="daily-day"><strong>{forecastDayLabel(day,weather)}</strong><span>{day.date.slice(8)}.{day.date.slice(5,7)}</span></div>
      <div className="daily-condition"><WeatherIcon kind={iconKind(day.day)} size={25} /><span>{day.day.condition.text}</span></div>
      <span className="daily-low">{temperature(day.day.mintemp_c,unit)}°</span>
      <div className="daily-range" aria-label={`От ${temperature(day.day.mintemp_c,unit)} до ${temperature(day.day.maxtemp_c,unit)} градусов`}><span style={{left:`${(day.day.mintemp_c-low)/range*100}%`,width:`${(day.day.maxtemp_c-day.day.mintemp_c)/range*100}%`}} /></div>
      <strong className="daily-high">{temperature(day.day.maxtemp_c,unit)}°</strong>
      <span className="daily-chance" aria-label={`${snow?'Снег':'Дождь'}: ${chance===null?'нет данных':`${chance}%`}`}>{snow?<Snowflake size={14} />:<Droplets size={14} />}{chance===null?'—':`${chance}%`}</span>
    </div>; })}</div>
    <p className="daily-note">Полоса показывает минимум и максимум каждого дня в общей температурной шкале.</p>
  </section>;
}
