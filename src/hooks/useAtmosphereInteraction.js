import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_REACTIONS = 6;
const MAX_TRAILS = 12;

function overControl(target) {
  const control = target?.closest?.('button, a, input, select, textarea, dialog, [data-sky-control]');
  return control && !control.classList.contains('scene-touch');
}

export function useAtmosphereInteraction(motion) {
  const backgroundRef = useRef(null);
  const surfaceRef = useRef(null);
  const reactionTimers = useRef(new Map());
  const trailTimers = useRef(new Map());
  const serial = useRef(0);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const lastTrail = useRef({ time: 0, x: 0, y: 0 });
  const [reactions, setReactions] = useState([]);
  const [trails, setTrails] = useState([]);

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
    if (!surface) return;
    const center = () => {
      backgroundRef.current?.style.setProperty('--parallax-x', '0px');
      backgroundRef.current?.style.setProperty('--parallax-y', '0px');
      surface.style.setProperty('--cursor-visible', '0');
      lastTrail.current = { time: 0, x: 0, y: 0 };
    };
    if (!motion) {
      center();
      reactionTimers.current.forEach(clearTimeout);
      trailTimers.current.forEach(clearTimeout);
      reactionTimers.current.clear();
      trailTimers.current.clear();
      let disposed = false;
      queueMicrotask(() => {
        if (disposed) return;
        setReactions([]);
        setTrails([]);
      });
      return () => { disposed = true; };
    }
    let frame = 0;
    const move = (event) => {
      pointerMove(event);
      if (event.pointerType === 'touch' || overControl(event.target)) {
        cancelAnimationFrame(frame);
        center();
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        surface.style.setProperty('--cursor-x', x + 'px');
        surface.style.setProperty('--cursor-y', y + 'px');
        surface.style.setProperty('--cursor-visible', '1');
        backgroundRef.current?.style.setProperty('--parallax-x', (x / rect.width - .5) * -14 + 'px');
        backgroundRef.current?.style.setProperty('--parallax-y', (y / rect.height - .5) * -10 + 'px');
        const now = Date.now();
        const last = lastTrail.current;
        const distance = Math.hypot(x - last.x, y - last.y);
        if (now - last.time < 80 || distance < 20) return;
        const angle = last.time === 0 ? 0 : Math.atan2(y - last.y, x - last.x) * 180 / Math.PI;
        const stretch = Math.min(1.8, 1 + distance / 180);
        lastTrail.current = { time: now, x, y };
        const id = ++serial.current;
        if (trailTimers.current.size >= MAX_TRAILS) {
          const oldest = trailTimers.current.keys().next().value;
          clearTimeout(trailTimers.current.get(oldest));
          trailTimers.current.delete(oldest);
        }
        setTrails((previous) => [...previous.slice(-(MAX_TRAILS - 1)), { id, x, y, angle, stretch }]);
        trailTimers.current.set(id, setTimeout(() => {
          setTrails((previous) => previous.filter((item) => item.id !== id));
          trailTimers.current.delete(id);
        }, 900));
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

  useEffect(() => {
    const pendingReactions = reactionTimers.current;
    const pendingTrails = trailTimers.current;
    return () => {
      pendingReactions.forEach(clearTimeout);
      pendingTrails.forEach(clearTimeout);
      pendingReactions.clear();
      pendingTrails.clear();
    };
  }, []);

  const react = useCallback((event) => {
    if (!motion) return;
    if (event.detail !== 0 && suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const id = ++serial.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? rect.width * .5 : Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = event.detail === 0 ? rect.height * .45 : Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    if (reactionTimers.current.size >= MAX_REACTIONS) {
      const oldest = reactionTimers.current.keys().next().value;
      clearTimeout(reactionTimers.current.get(oldest));
      reactionTimers.current.delete(oldest);
    }
    setReactions((previous) => [...previous.slice(-(MAX_REACTIONS - 1)), { id, x, y }]);
    reactionTimers.current.set(id, setTimeout(() => {
      setReactions((previous) => previous.filter((item) => item.id !== id));
      reactionTimers.current.delete(id);
    }, 1500));
  }, [motion]);

  return { backgroundRef, surfaceRef, reactions: motion ? reactions : [], trails: motion ? trails : [], react, pointerDown, pointerMove, pointerUp, pointerCancel };
}
