import { Droplets, Gauge, Navigation, Wind } from 'lucide-react';
import { pressureInMm, windDirection } from '../lib/weather';

export function WeatherMetrics({ current }) {
  const from = {С:'севера',СВ:'северо-востока',В:'востока',ЮВ:'юго-востока',Ю:'юга',ЮЗ:'юго-запада',З:'запада',СЗ:'северо-запада'};
  const bearing = current.wind_degree;
  const degrees = Number.isFinite(bearing) && bearing >= 0 && bearing <= 360 ? bearing : null;
  return <section className="weather-details" aria-labelledby="details-title">
    <div className="section-heading"><h2 id="details-title">Подробности</h2><span>Сейчас</span></div>
    <div className="wind-instrument"><div className="wind-copy"><span className="instrument-label"><Wind size={17} />Ветер</span><p className="wind-value">{Math.round(current.wind_kph / 3.6)} <span>м/с</span></p><p>{degrees !== null ? `С ${from[windDirection(degrees)]} · ${Math.round(degrees)}°` : 'Направление недоступно'}</p>{Number.isFinite(current.gust_kph) && <small>Порывы до {Math.round(current.gust_kph / 3.6)} м/с</small>}</div>
      {degrees !== null && <div className="wind-compass" aria-hidden="true"><span className="north">С</span><span className="east">В</span><span className="south">Ю</span><span className="west">З</span><Navigation size={32} style={{transform:`rotate(${degrees - 45}deg)`}} /><i /></div>}
    </div>
    <div className="detail-pair"><div><span className="instrument-label"><Droplets size={16} />Влажность</span><p>{current.humidity}<span>%</span></p><progress value={current.humidity} max="100" aria-label="Относительная влажность" /><div className="scale-labels"><span>0</span><span>100%</span></div></div><div><span className="instrument-label"><Gauge size={16} />Давление</span><p>{pressureInMm(current.pressure_mb)}<span>мм рт. ст.</span></p><small>{Math.round(current.pressure_mb)} гПа</small></div></div>
  </section>;
}
