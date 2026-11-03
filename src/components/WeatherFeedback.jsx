import { ArrowRight, CloudOff, RotateCw, X } from 'lucide-react';

export function WeatherError({ error, onRetry, onDismiss, standalone = false }) {
  return (
    <div className={`weather-error ${standalone ? 'error-standalone' : ''}`} role="alert">
      <CloudOff size={standalone ? 35 : 19} strokeWidth={1.5} aria-hidden="true" />
      <div>{standalone && <h1>Сейчас не видно погоду</h1>}<p>{error.message}</p></div>
      {onRetry && <button type="button" onClick={onRetry} className="retry-button"><RotateCw size={14} aria-hidden="true" />Попробовать снова{standalone && <ArrowRight size={14} aria-hidden="true" />}</button>}
      {onDismiss && <button type="button" className="dismiss-error" onClick={onDismiss} aria-label="Закрыть сообщение"><X size={17} aria-hidden="true" /></button>}
    </div>
  );
}

export function WeatherSkeleton() {
  return <div className="weather-skeleton" role="status" aria-label="Загружаем погоду"><span className="skeleton-line skeleton-eyebrow" /><span className="skeleton-line skeleton-title" /><span className="skeleton-line skeleton-temperature" /><div className="skeleton-instruments">{[0, 1, 2, 3].map((id) => <span key={id} className="skeleton-line" />)}</div></div>;
}
