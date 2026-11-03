import { useEffect, useRef, useState } from 'react';
import { SCENE_IMAGES } from '../lib/scenes';
import { useAtmosphereInteraction } from '../hooks/useAtmosphereInteraction';
import './SceneBackground.css';

export function SceneBackground({ scene, motion }) {
  const [layers, setLayers] = useState([{ scene, id: 0 }]);
  const serial = useRef(0);
  const { backgroundRef, reactions, react } = useAtmosphereInteraction(motion);

  useEffect(() => {
    const id = ++serial.current;
    const image = new Image();
    let disposed = false;
    const display = () => {
      if (disposed) return;
      setLayers((previous) => previous.at(-1)?.scene === scene ? previous : [...previous.slice(-1), { scene, id }]);
    };
    image.onload = display;
    image.onerror = display;
    image.src = SCENE_IMAGES[scene];
    if (image.complete) display();
    return () => { disposed = true; image.onload = null; image.onerror = null; };
  }, [scene]);

  return (
    <>
    <div ref={backgroundRef} className={`scene-background ${motion ? '' : 'motion-paused'}`} aria-hidden="true">
      {layers.map((layer) => (
        <div className={`scene-layer scene-${layer.scene}`} key={layer.id}>
          <div className="scene-landscape" style={{ backgroundImage: `url("${SCENE_IMAGES[layer.scene]}")` }} />
          <div className="scene-tint" />
          <div className="scene-sun" />
          <div className="scene-cloud scene-cloud-one" />
          <div className="scene-cloud scene-cloud-two" />
          <div className="scene-weather" />
        </div>
      ))}
      <div className="scene-shade" />
      <div className="scene-grain" />
    </div>
    <button className="scene-touch" type="button" onClick={react} aria-label="Оживить фон" aria-describedby="scene-hint" />
    <div className={`scene-reactions ${motion ? '' : 'reactions-still'}`} aria-hidden="true">
      {reactions.map(({ id, x, y }) => (
        <div key={id} className="scene-reaction" style={{ left: x, top: y }}>
          <span className="reaction-glow" />
          <span className="reaction-ring" />
          {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--angle': `${index * 45}deg`, '--distance': `${60 + index % 3 * 25}px` }} />)}
        </div>
      ))}
    </div>
    </>
  );
}
