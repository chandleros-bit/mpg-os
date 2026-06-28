import { useEffect, useRef, useState } from 'react';

// Tallies a number up to its target when `active` flips true, like an adding
// machine totaling a statement. Honors reduced-motion by jumping to the value.
export function useCountUp(target, active, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const end = Number(target) || 0;
    if (!active) {
      setValue(0);
      return;
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || end === 0) {
      setValue(end);
      return;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast then settling, like a tally coming to rest.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(end * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, active, duration]);

  return value;
}
