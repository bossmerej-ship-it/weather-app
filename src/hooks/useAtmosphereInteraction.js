import { useCallback, useEffect, useRef, useState } from 'react';

function overControl(target) {
  const control = target?.closest?.('button, a, input, select, textarea, dialog, [data-sky-control]');
  return control && !control.classList.contains('scene-touch');
}

export function useAtmosphereInteraction(motion) {
  const backgroundRef = useRef(null);
  const surfaceRef = useRef(null);
  const gustFrame = useRef(0);
  const cursorIdle = useRef(0);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const serial = useRef(0);
  const trailTimers = useRef(new Map());
  const reactionTimers = useRef(new Map());
  const lastTrail = useRef({ time: null, x: 0, y: 0 });
  const [gust, setGust] = useState(0);
  const [trails, setTrails] = useState([]);
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
      clearTimeout(cursorIdle.current);
      cursorIdle.current = 0;
      backgroundRef.current?.style.setProperty('--parallax-x', '0px');
      backgroundRef.current?.style.setProperty('--parallax-y', '0px');
      surface?.style.setProperty('--cursor-visible', '0');
      lastTrail.current = { time: null, x: 0, y: 0 };
    };
    if (!motion) {
      center();
      cancelAnimationFrame(gustFrame.current);
      gustFrame.current = 0;
      trailTimers.current.forEach(clearTimeout);
      reactionTimers.current.forEach(clearTimeout);
      trailTimers.current.clear();
      reactionTimers.current.clear();
      // Clear the stored envelope before the next paint, even if motion resumes quickly.
      queueMicrotask(() => { if (backgroundRef.current) { setGust(0); setTrails([]); setReactions([]); } });
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
        const localX = x * rect.width;
        const localY = y * rect.height;
        surface.style.setProperty('--cursor-x', localX + 'px');
        surface.style.setProperty('--cursor-y', localY + 'px');
        surface.style.setProperty('--cursor-visible', '1');
        clearTimeout(cursorIdle.current);
        cursorIdle.current = setTimeout(() => {
          surface.style.setProperty('--cursor-visible', '0');
          cursorIdle.current = 0;
        }, 180);
        backgroundRef.current?.style.setProperty('--parallax-x', (x - .5) * -10 + 'px');
        backgroundRef.current?.style.setProperty('--parallax-y', (y - .5) * -6 + 'px');
        const now = Date.now();
        const last = lastTrail.current;
        const distance = last.time === null ? 0 : Math.hypot(localX - last.x, localY - last.y);
        if (last.time !== null && (now - last.time < 65 || distance < 12)) return;
        const angle = last.time === null ? 0 : Math.atan2(localY - last.y, localX - last.x) * 180 / Math.PI;
        const scale = Math.min(1.6, 1 + distance / 160);
        lastTrail.current = { time: now, x: localX, y: localY };
        const id = ++serial.current;
        if (trailTimers.current.size >= 10) {
          const oldest = trailTimers.current.keys().next().value;
          clearTimeout(trailTimers.current.get(oldest));
          trailTimers.current.delete(oldest);
        }
        setTrails(previous => [...previous.slice(-9), { id, x: localX, y: localY, angle, scale }]);
        trailTimers.current.set(id, setTimeout(() => {
          setTrails(previous => previous.filter(item => item.id !== id));
          trailTimers.current.delete(id);
        }, 650));
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
    const pendingTrails = trailTimers.current;
    const pendingReactions = reactionTimers.current;
    return () => {
      cancelAnimationFrame(gustFrame.current);
      clearTimeout(cursorIdle.current);
      pendingTrails.forEach(clearTimeout);
      pendingReactions.forEach(clearTimeout);
      pendingTrails.clear();
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

  return { backgroundRef, surfaceRef, gust: motion ? gust : 0, trails: motion ? trails : [], reactions: motion ? reactions : [], react, pointerDown, pointerMove, pointerUp, pointerCancel };
}
