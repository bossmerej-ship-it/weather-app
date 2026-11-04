import { RotateCw } from 'lucide-react';
import { SCENES } from '../lib/scenes';
import { WeatherIcon } from './WeatherIcon';
import './AtmosphereControls.css';

export function AtmosphereControls({ selected, setSelected, paused, setPaused, reducedMotion }) {
  const moving = !paused && !reducedMotion;
  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <div className="appearance-heading">
        <div className="appearance-copy"><h2 id="appearance-title">Оформление</h2>
          <p>{selected === 'auto' ? 'Фон следует погоде и времени города.' : 'Фон выбран вручную. Прогноз не меняется.'}</p>
        </div>
        <button className="appearance-motion" type="button" role="switch" aria-label="Анимация неба"
          aria-checked={moving} disabled={reducedMotion} onClick={() => setPaused(!paused)}
          aria-describedby={reducedMotion ? 'appearance-motion-hint' : undefined}
          title={reducedMotion ? 'Движение отключено в настройках устройства' : undefined}>
          <span>Анимация</span><span className="appearance-switch" aria-hidden="true"><span /></span>
        </button>
      </div>
      <div className="appearance-scenes" role="group" aria-label="Атмосфера фона">
        {SCENES.map(({ id, label }) => <button className="appearance-scene" key={id} type="button" onClick={() => setSelected(id)} aria-pressed={selected === id}>
          {id === 'auto' ? <RotateCw size={21} strokeWidth={1.7} aria-hidden="true" /> : <WeatherIcon kind={id} size={23} />}<span>{label}</span>
        </button>)}
      </div>
      {reducedMotion && <p className="appearance-motion-hint" id="appearance-motion-hint">Движение отключено в настройках устройства.</p>}
    </section>
  );
}
