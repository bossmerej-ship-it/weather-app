import { useCallback, useEffect, useRef, useState } from 'react';

function overControl(target) {
  const control = target?.closest?.('button, a, input, select, textarea, dialog, [data-sky-control]');
  return control && !control.classList.contains('scene-touch');
}

export function useAtmosphereInteraction(motion) {
  const backgroundRef = useRef(null);
  const surfaceRef = useRef(null);
  const gustFrame = useRef(0);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [gust, setGust] = useState(0);

  const pointerDown = useCallback((event) => {
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY, moved: false };
  }, []);
  const pointerMove = useCallback((event) => {
    const start = gesture.current;
    if (start && start.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) start.moved = true;
  }, []);
  const pointerUp = useCallback((event) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const moved = start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10;
    suppressClick.current = start.type === 'touch' && moved;
    gesture.current = null;
  }, []);
  const pointerCancel = useCallback(() => {
    suppressClick.current = true;
    gesture.current = null;
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current || backgroundRef.current?.parentElement;
    const center = () => {
      backgroundRef.current?.style.setProperty('--parallax-x', '0px');
      backgroundRef.current?.style.setProperty('--parallax-y', '0px');
    };
    if (!motion) {
      center();
      cancelAnimationFrame(gustFrame.current);
      gustFrame.current = 0;
      setGust(0);
      return;
    }
    if (!surface) return;
    let frame = 0;
    const move = (event) => {
      pointerMove(event);
      cancelAnimationFrame(frame);
      if (event.pointerType === 'touch' || overControl(event.target)) { center(); return; }
      frame = requestAnimationFrame(() => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        backgroundRef.current?.style.setProperty('--parallax-x', (x - .5) * -6 + 'px');
        backgroundRef.current?.style.setProperty('--parallax-y', (y - .5) * -4 + 'px');
      });
    };
    const leave = () => { cancelAnimationFrame(frame); center(); };
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(frame);
      center();
    };
  }, [motion, pointerMove]);

  useEffect(() => () => cancelAnimationFrame(gustFrame.current), []);

  const react = useCallback((event) => {
    if (!motion) return;
    if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
    cancelAnimationFrame(gustFrame.current);
    setGust(1);
    let started = null;
    const settle = (timestamp) => {
      if (started === null) started = timestamp;
      const remaining = Math.max(0, 1 - (timestamp - started) / 1800);
      setGust(remaining);
      gustFrame.current = remaining > 0 ? requestAnimationFrame(settle) : 0;
    };
    gustFrame.current = requestAnimationFrame(settle);
  }, [motion]);

  return { backgroundRef, surfaceRef, gust: motion ? gust : 0, react, pointerDown, pointerMove, pointerUp, pointerCancel };
}
