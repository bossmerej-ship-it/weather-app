import { useEffect, useRef, useState } from 'react';
import { useAtmosphereInteraction } from '../hooks/useAtmosphereInteraction';
import './SceneBackground.css';

export function SceneBackground({ scene, motion, intensity = .45, isDay = true }) {
  const night = scene === 'night' || !isDay;
  const [layers, setLayers] = useState([{ scene, night, id: 0 }]);
  const serial = useRef(0);
  const { backgroundRef, surfaceRef, gust, react, pointerDown, pointerMove, pointerUp, pointerCancel } = useAtmosphereInteraction(motion);
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
    }, motion ? 650 : 0);
    return () => clearTimeout(timer);
  }, [layers, motion]);

  useEffect(() => {
    // Change playback speed without restarting the cloud's animation phase.
    // A short, smooth attack is followed by a gentle return to normal drift.
    const attack = Math.sin(Math.min(1, (1 - gust) / .15) * Math.PI / 2);
    const rate = motion ? 1 + attack * gust * 3 : 1;
    backgroundRef.current?.querySelectorAll('.scene-cloud').forEach((cloud) => {
      cloud.getAnimations?.().forEach((animation) => animation.updatePlaybackRate?.(rate));
    });
  }, [gust, motion, layers, backgroundRef]);

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
        <div className="cloud-plane cloud-plane-near"><div className="scene-cloud scene-cloud-one" /></div>
        <div className="cloud-plane cloud-plane-far"><div className="scene-cloud scene-cloud-two" /></div>
        <div className="scene-weather" />
      </div>)}
      <div className="scene-shade" />
    </div>
    <div ref={surfaceRef} className="scene-interaction">
      <button className="scene-touch" type="button" onClick={react}
        onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerUp} onPointerCancel={pointerCancel}
        disabled={!motion} aria-label="Оживить небо" aria-describedby="scene-hint" />
      <span id="scene-hint" className="sr-only">Нажмите на свободное небо, чтобы вызвать лёгкий порыв ветра.</span>
    </div>
  </>;
}
