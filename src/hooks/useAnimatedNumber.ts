import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;

export function useAnimatedNumber(target: number, enabled: boolean): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (!enabled) {
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const startedAt = Date.now();
    let frame = 0;

    const step = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (target - from) * eased;
      fromRef.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return enabled ? value : target;
}
