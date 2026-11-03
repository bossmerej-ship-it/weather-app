import { Sunrise, Sunset, Sun } from 'lucide-react';
import { todaySun } from '../lib/forecast';
import { SceneBackground } from './SceneBackground';
import { SCENE_CAPTIONS } from '../lib/scenes';

export function SunWindow({ weather, scene, motion, intensity }) {
  const sun = todaySun(weather);
  const duration = sun ? `${Math.floor(sun.daylightMinutes / 60)} ч ${sun.daylightMinutes % 60} мин` : null;
  return <aside className="sun-window" aria-label="Световой день и атмосфера">
    <SceneBackground scene={scene} motion={motion} intensity={intensity} />
    <div className="window-label"><span className="window-dot" />{SCENE_CAPTIONS[scene]}</div>
    {sun ? <div className="sun-content">
      <div className="sun-duration"><Sun size={18} aria-hidden="true" /><span>Световой день<strong>{duration}</strong></span></div>
      <div className="sun-rail"><progress max="1" value={sun.progress} aria-label="Пройденная часть светового дня" /><span style={{left:`${sun.progress * 100}%`}} aria-hidden="true"><Sun size={16} /></span></div>
      <div className="sun-times"><span><Sunrise size={17} aria-hidden="true" /><span>Восход<b>{sun.sunrise}</b></span></span><span><Sunset size={17} aria-hidden="true" /><span>Закат<b>{sun.sunset}</b></span></span></div>
      <p className="sun-note">{sun.isDaylight ? 'Солнце над горизонтом' : sun.localMinutes < sun.sunriseMinutes ? 'Солнце ещё не взошло' : 'Солнце уже зашло'}</p>
    </div> : <div className="sun-content"><p>Атмосфера за окном</p><p className="sun-note">Время восхода и заката недоступно</p></div>}
    <span className="window-hint">Коснитесь пейзажа</span>
  </aside>;
}
