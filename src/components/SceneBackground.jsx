import { useEffect, useRef, useState } from 'react';
import { SCENE_IMAGES } from '../lib/scenes';
import './SceneBackground.css';

export function SceneBackground({ scene, motion }) {
  const [layers, setLayers] = useState([{ scene, id: 0 }]);
  const serial = useRef(0);

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
    <div className={`scene-background ${motion ? '' : 'motion-paused'}`} aria-hidden="true">
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
  );
}
