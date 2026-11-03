import { MousePointer2, Pause, Play, Sparkles } from 'lucide-react';
import { SCENES } from '../lib/scenes';
import { WeatherIcon } from './WeatherIcon';

export function AtmosphereControls({ selected, setSelected, paused, setPaused, reducedMotion }) {
  return (
    <section className="atmosphere" aria-labelledby="atmosphere-title">
      <div className="atmosphere-heading"><div><h2 id="atmosphere-title">Атмосфера фона</h2><p>Оформление окна с пейзажем</p></div>
        <button className="motion-toggle" type="button" onClick={() => setPaused(!paused)} disabled={reducedMotion}
          aria-label={reducedMotion ? 'Анимации отключены в настройках устройства' : paused ? 'Включить анимации' : 'Приостановить анимации'}
          title={reducedMotion ? 'Анимации отключены в настройках устройства' : paused ? 'Включить анимации' : 'Приостановить анимации'}>
          {paused || reducedMotion ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}<span>{reducedMotion ? 'Без движения' : paused ? 'Включить движение' : 'Остановить движение'}</span>
        </button>
      </div>
      <div className="scene-choices" role="group" aria-label="Атмосфера фона">
        {SCENES.map(({ id, label }) => <button key={id} type="button" onClick={() => setSelected(id)} aria-pressed={selected === id}>
          {id === 'auto' ? <Sparkles size={17} aria-hidden="true" /> : <WeatherIcon kind={id} size={18} />}<span>{label}</span>{selected === id && <span className="selection-dot" aria-hidden="true" />}
        </button>)}
      </div>
      <div className="atmosphere-footnote">
        <p>{selected === 'auto' ? 'Авто: фон следует погоде.' : 'Выбранный фон не меняет прогноз.'}</p>
        <span id="scene-hint"><MousePointer2 size={12} aria-hidden="true" />Пейзаж реагирует на курсор и касания</span>
      </div>
    </section>
  );
}
