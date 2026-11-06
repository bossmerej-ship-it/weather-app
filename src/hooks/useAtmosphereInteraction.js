import { useCallback, useEffect, useRef, useState } from 'react';
import { createCursorWind } from '../lib/cursorWind.js';

function overControl(target) {
  const control = target?.closest?.('button, a, input, select, textarea, dialog, [data-sky-control]');
  return control && !control.classList.contains('scene-touch');
}

export function useAtmosphereInteraction(motion) {
  const backgroundRef = useRef(null);
  const surfaceRef = useRef(null);
  const windRef = useRef(null);
  const gustFrame = useRef(0);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const serial = useRef(0);
  const reactionTimers = useRef(new Map());
  const [gust, setGust] = useState(0);
  const [reactions, setReactions] = useState([]);

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
      reactionTimers.current.forEach(clearTimeout);
      reactionTimers.current.clear();
      // Clear the stored envelope before the next paint, even if motion resumes quickly.
      queueMicrotask(() => { if (backgroundRef.current) { setGust(0); setReactions([]); } });
      return;
    }
    if (!surface) return;
    const wind = windRef.current && createCursorWind(windRef.current);
    let frame = 0;
    let pointer = null;
    const render = (timestamp) => {
      frame = 0;
      if (pointer) {
        const { clientX, clientY } = pointer;
        pointer = null;
        const rect = surface.getBoundingClientRect();
        if (rect.width && rect.height) {
          const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
          backgroundRef.current?.style.setProperty('--parallax-x', (x - .5) * -10 + 'px');
          backgroundRef.current?.style.setProperty('--parallax-y', (y - .5) * -6 + 'px');
          wind?.move(x * rect.width, y * rect.height, timestamp);
        }
      }
      if (wind?.draw(timestamp)) frame = requestAnimationFrame(render);
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      wind?.clear();
      center();
    };
    const move = (event) => {
      pointerMove(event);
      if (event.pointerType === 'touch' || overControl(event.target)) {
        leave();
        return;
      }
      pointer = { clientX: event.clientX, clientY: event.clientY };
      if (!frame) frame = requestAnimationFrame(render);
    };
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [motion, pointerMove]);

  useEffect(() => {
    const pendingReactions = reactionTimers.current;
    return () => {
      cancelAnimationFrame(gustFrame.current);
      pendingReactions.forEach(clearTimeout);
      pendingReactions.clear();
    };
  }, []);

  const react = useCallback((event) => {
    if (!motion) return;
    if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
    if (overControl(event.target)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? rect.width * .5 : Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = event.detail === 0 ? rect.height * .45 : Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const id = ++serial.current;
    if (reactionTimers.current.size >= 4) {
      const oldest = reactionTimers.current.keys().next().value;
      clearTimeout(reactionTimers.current.get(oldest));
      reactionTimers.current.delete(oldest);
    }
    setReactions(previous => [...previous.slice(-3), { id, x, y }]);
    reactionTimers.current.set(id, setTimeout(() => {
      setReactions(previous => previous.filter(item => item.id !== id));
      reactionTimers.current.delete(id);
    }, 1250));
    cancelAnimationFrame(gustFrame.current);
    setGust(1);
    let started = null;
    const settle = (timestamp) => {
      if (started === null) started = timestamp;
      const remaining = Math.max(0, 1 - (timestamp - started) / 2000);
      setGust(remaining);
      gustFrame.current = remaining > 0 ? requestAnimationFrame(settle) : 0;
    };
    gustFrame.current = requestAnimationFrame(settle);
  }, [motion]);

  return { backgroundRef, surfaceRef, windRef, gust: motion ? gust : 0, reactions: motion ? reactions : [], react, pointerDown, pointerMove, pointerUp, pointerCancel };
}
