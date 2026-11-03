import { useCallback, useEffect, useRef, useState } from 'react';

export function useAtmosphereInteraction(motion) {
  const backgroundRef = useRef(null);
  const timers = useRef(new Set());
  const serial = useRef(0);
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!motion) {
      backgroundRef.current?.style.setProperty('--parallax-x', '0px');
      backgroundRef.current?.style.setProperty('--parallax-y', '0px');
      return;
    }
    let frame = 0;
    const move = (event) => {
      if (event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        backgroundRef.current?.style.setProperty('--parallax-x', `${(event.clientX / window.innerWidth - .5) * -22}px`);
        backgroundRef.current?.style.setProperty('--parallax-y', `${(event.clientY / window.innerHeight - .5) * -14}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
  }, [motion]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const react = useCallback((event) => {
    const id = ++serial.current;
    const x = event.detail === 0 ? window.innerWidth * .65 : event.clientX;
    const y = event.detail === 0 ? window.innerHeight * .4 : event.clientY;
    setReactions((previous) => [...previous.slice(-5), { id, x, y }]);
    const timer = setTimeout(() => {
      setReactions((previous) => previous.filter((item) => item.id !== id));
      timers.current.delete(timer);
    }, motion ? 1600 : 450);
    timers.current.add(timer);
  }, [motion]);

  return { backgroundRef, reactions, react };
}
