import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/**
 * Animate an integer from its previous value up to `value` (~600ms, easeOut).
 * Under reduced motion the value updates instantly. Mirrors the StatCard
 * count-up so KPI tiles and the status breakdown share one feel.
 */
export function useCountUp(value: number, duration = 0.6): number {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return display;
}
