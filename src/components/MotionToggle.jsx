import { Pause, Play } from 'lucide-react';

export function MotionToggle({ paused, setPaused, reducedMotion, compact = false }) {
  const label = reducedMotion ? 'Анимации отключены в настройках устройства' : paused ? 'Включить анимации' : 'Приостановить анимации';
  return <button className={`motion-toggle ${compact ? 'motion-toggle-compact' : ''}`} type="button"
    onClick={() => setPaused(!paused)} disabled={reducedMotion} aria-label={label} title={label} aria-pressed={paused || reducedMotion}>
    {paused || reducedMotion ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
    {!compact && <span>{reducedMotion ? 'Без движения' : paused ? 'Включить движение' : 'Остановить движение'}</span>}
  </button>;
}
