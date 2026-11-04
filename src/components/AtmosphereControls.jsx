import { MousePointer2, Sparkles } from 'lucide-react';
import { MotionToggle } from './MotionToggle';
import { SCENES } from '../lib/scenes';
import { WeatherIcon } from './WeatherIcon';

export function AtmosphereControls({ selected, setSelected, paused, setPaused, reducedMotion }) {
  return (
    <section className="atmosphere" aria-labelledby="atmosphere-title">
      <div className="atmosphere-heading"><div><h2 id="atmosphere-title">Атмосфера неба</h2><p>Выберите оформление или оставьте автоматическое.</p></div>
        <MotionToggle paused={paused} setPaused={setPaused} reducedMotion={reducedMotion} />
      </div>
      <div className="scene-choices" role="group" aria-label="Атмосфера фона">
        {SCENES.map(({ id, label }) => <button key={id} type="button" onClick={() => setSelected(id)} aria-pressed={selected === id}>
          {id === 'auto' ? <Sparkles size={17} aria-hidden="true" /> : <WeatherIcon kind={id} size={18} />}<span>{label}</span>{selected === id && <span className="selection-dot" aria-hidden="true" />}
        </button>)}
      </div>
      <div className="atmosphere-footnote">
        <p>{selected === 'auto' ? 'Авто: фон следует погоде.' : 'Выбранный фон не меняет прогноз.'}</p>
        <span><MousePointer2 size={12} aria-hidden="true" />Небо откликается на курсор и касания</span>
      </div>
    </section>
  );
}
