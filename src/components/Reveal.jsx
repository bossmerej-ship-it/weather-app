import { useEffect, useRef, useState } from 'react';

/** Content is visible by default, including without IntersectionObserver support. */
export function Reveal({ children, motion, className = '' }) {
  const ref = useRef(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!motion || !window.IntersectionObserver || !element || element.getBoundingClientRect().top < window.innerHeight) {
      setPending(false);
      return;
    }
    setPending(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setPending(false); observer.disconnect(); }
    }, { threshold: .08, rootMargin: '0px 0px 24px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [motion]);
  return <div ref={ref} className={`reveal ${pending && motion ? 'reveal-pending' : ''} ${className}`}>{children}</div>;
}
