import { CloudOff, RotateCw } from 'lucide-react';

export function WeatherError({ error, onRetry }) {
  return (
    <div className="weather-error" role="alert">
      <CloudOff size={19} strokeWidth={1.5} aria-hidden="true" />
      <div><p>{error.message}</p></div>
      {onRetry && <button type="button" onClick={onRetry} className="retry-button"><RotateCw size={14} aria-hidden="true" />Попробовать снова</button>}
    </div>
  );
}
