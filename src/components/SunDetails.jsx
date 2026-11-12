import { Sunrise, Sunset, Sun } from 'lucide-react';
import { todaySun } from '../lib/forecast';

function SunArc({ progress, percent }) {
  const angle = Math.PI * (1 - progress);
  const x = 150 + 125 * Math.cos(angle);
  const y = 140 - 120 * Math.sin(angle);
  return <div className="sun-arc" aria-hidden="true"><svg viewBox="0 0 300 160">
    <path d="M25 140 A125 120 0 0 1 275 140" className="sun-arc-base" />
    <path d="M25 140 A125 120 0 0 1 275 140" className="sun-arc-progress" pathLength="100" strokeDasharray={`${percent} 100`} />
    <circle cx={x} cy={y} r="6" /><path d="M15 145 H285" className="sun-horizon" />
  </svg></div>;
}

export function SunDetails({ weather }) {
  const sun = todaySun(weather);
  if (!sun) return null;
  const percent = sun.progress === undefined ? null : Math.round(sun.progress * 100);

  return <section className="sun-details" aria-labelledby="sun-title">
    <div className="section-heading"><h2 id="sun-title">Световой день</h2><Sun size={19} aria-hidden="true" /></div>
    {sun.daylightMinutes !== undefined && (
      <p className="daylight-duration">{Math.floor(sun.daylightMinutes / 60)}<span> ч </span>{sun.daylightMinutes % 60}<span> мин</span></p>
    )}
    {percent !== null && <SunArc progress={sun.progress} percent={percent} />}
    <div className="sun-times">
      {sun.sunrise && <span><Sunrise size={19} aria-hidden="true" /><span>Восход<strong>{sun.sunrise}</strong></span></span>}
      {sun.sunset && <span><Sunset size={19} aria-hidden="true" /><span>Закат<strong>{sun.sunset}</strong></span></span>}
    </div>
    {percent !== null && <>
      <progress className="sr-only" value={percent} max="100" aria-label="Пройденная часть светового дня" />
      <p className="sun-note">{sun.localMinutes < sun.sunriseMinutes ? 'Солнце ещё не взошло' : sun.localMinutes >= sun.sunsetMinutes ? 'Солнце уже зашло' : `Прошло ${percent}% светового дня`}</p>
    </>}
  </section>;
}
