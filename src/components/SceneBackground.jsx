import { useEffect, useRef, useState } from 'react';
import { useAtmosphereInteraction } from '../hooks/useAtmosphereInteraction';
import './SceneBackground.css';

export function SceneBackground({ scene, motion, intensity = .45, isDay = true }) {
  const night = scene === 'night' || !isDay;
  const [layers, setLayers] = useState([{ scene, night, id: 0 }]);
  const serial = useRef(0);
  const { backgroundRef, surfaceRef, reactions, trails, react, pointerDown, pointerMove, pointerUp, pointerCancel } = useAtmosphereInteraction(motion);
  const strength = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : .45;

  useEffect(() => {
    const id = ++serial.current;
    setLayers((previous) => {
      const latest = previous.at(-1);
      return latest.scene === scene && latest.night === night ? previous : [...previous.slice(-1), { scene, night, id }];
    });
  }, [scene, night]);

  useEffect(() => {
    if (layers.length < 2) return;
    const latest = layers.at(-1).id;
    const timer = setTimeout(() => {
      setLayers((previous) => previous.at(-1).id === latest ? previous.slice(-1) : previous);
    }, motion ? 1400 : 0);
    return () => clearTimeout(timer);
  }, [layers, motion]);

  return <>
    <div ref={backgroundRef} className={'scene-background ' + (motion ? '' : 'motion-paused')} aria-hidden="true" style={{
      '--precip-opacity': .04 + strength * .3,
      '--rain-speed': (1.6 - strength * .55) + 's',
      '--snow-speed': (28 - strength * 10) + 's',
    }}>
      {layers.map((layer) => <div className={'scene-layer scene-' + layer.scene + (layer.night ? ' scene-after-dark' : '')} key={layer.id}>
        <div className="scene-landscape" />
        <div className="scene-tint" />
        <div className="scene-sun" />
        <div className="scene-cloud scene-cloud-one" />
        <div className="scene-cloud scene-cloud-two" />
        <div className="scene-weather" />
      </div>)}
      <div className="scene-shade" />
    </div>
    <div ref={surfaceRef} className={'scene-interaction ' + (motion ? '' : 'reactions-still')} data-scene={scene}>
      <button className="scene-touch" type="button" onClick={react}
        onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerUp} onPointerCancel={pointerCancel}
        disabled={!motion} aria-label="Оживить небо" aria-describedby="scene-hint" />
      <span id="scene-hint" className="sr-only">Нажмите на свободное небо, чтобы вызвать лёгкий порыв ветра.</span>
      <div className="scene-reactions" aria-hidden="true">
        {motion && <span className="scene-cursor-glow" />}
        {motion && trails.map(({ id, x, y, angle, stretch }) => <span key={id} className="scene-air-trail" style={{ left: x, top: y, '--trail-angle': angle + 'deg', '--trail-stretch': stretch }} />)}
        {motion && reactions.map(({ id, x, y }) => <div key={id} className="scene-reaction" style={{ left: x, top: y }}>
          <span className="reaction-core" /><span className="reaction-wave" /><span className="reaction-wave reaction-wave-echo" />
          <span className="reaction-current" /><span className="reaction-current reaction-current-two" />
        </div>)}
      </div>
    </div>
  </>;
}
