import { useCallback, useEffect, useRef, useState } from 'react';

export function useAtmosphereInteraction(motion) {
  const backgroundRef = useRef(null);
  const timers = useRef(new Map());
  const serial = useRef(0);
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    const surface = backgroundRef.current?.parentElement;
    if (!surface) return;
    const center = () => {
      backgroundRef.current?.style.setProperty('--parallax-x', '0px');
      backgroundRef.current?.style.setProperty('--parallax-y', '0px');
    };
    if (!motion) {
      center();
      return;
    }
    let frame = 0;
    const move = (event) => {
      if (event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        backgroundRef.current?.style.setProperty('--parallax-x', `${(x - .5) * -14}px`);
        backgroundRef.current?.style.setProperty('--parallax-y', `${(y - .5) * -10}px`);
      });
    };
    const leave = () => { cancelAnimationFrame(frame); center(); };
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(frame);
    };
  }, [motion]);

  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);

  const react = useCallback((event) => {
    const id = ++serial.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? rect.width * .5 : Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = event.detail === 0 ? rect.height * .45 : Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    if (timers.current.size >= 6) {
      const oldest = timers.current.keys().next().value;
      clearTimeout(timers.current.get(oldest));
      timers.current.delete(oldest);
    }
    setReactions((previous) => [...previous.slice(-5), { id, x, y }]);
    const timer = setTimeout(() => {
      setReactions((previous) => previous.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, motion ? 1600 : 450);
    timers.current.set(id, timer);
  }, [motion]);

  return { backgroundRef, reactions, react };
}
