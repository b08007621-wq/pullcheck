import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useHaptics } from './useHaptics';
import { useMotionEnabled } from './useMotionEnabled';

export type SetDrag = {
  section: string;
  id: string;
  from: number;
  to: number;
  height: number;
};

type Active = SetDrag & {
  startY: number;
  count: number;
};

export type SetLift = {
  section: string;
  id: string;
  index: number;
  count: number;
  height: number;
  pageY: number;
};

export type SetArrange = {
  arranging: boolean;
  drag: SetDrag | null;
  dragY: Animated.Value;
  wiggle: Animated.Value;
  start: () => void;
  finish: () => void;
  lift: (lift: SetLift) => void;
  move: (id: string, pageY: number) => void;
  drop: (id: string) => void;
};

export function useSetArrange(onDrop: (section: string, from: number, to: number) => void): SetArrange {
  const haptics = useHaptics();
  const motion = useMotionEnabled();
  const [arranging, setArranging] = useState(false);
  const [drag, setDrag] = useState<SetDrag | null>(null);
  const [dragY] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  const active = useRef<Active | null>(null);
  const settling = useRef(false);
  const dropRef = useRef(onDrop);

  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    if (!arranging || !motion) {
      wiggle.setValue(0);
      return;
    }
    const step = (toValue: number, duration: number) =>
      Animated.timing(wiggle, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1, 120), step(-1, 240), step(0, 120)]));
    loop.start();
    return () => {
      loop.stop();
      wiggle.setValue(0);
    };
  }, [arranging, motion, wiggle]);

  const start = useCallback(() => {
    haptics.collect();
    setArranging(true);
  }, [haptics]);

  const finish = useCallback(() => {
    haptics.tap();
    active.current = null;
    setDrag(null);
    setArranging(false);
  }, [haptics]);

  const lift = useCallback(
    ({ section, id, index, count, height, pageY }: SetLift) => {
      if (settling.current || count < 2 || !Number.isFinite(pageY) || height <= 0) return;
      haptics.collect();
      dragY.setValue(0);
      const next = { section, id, from: index, to: index, height };
      active.current = { ...next, startY: pageY, count };
      setArranging(true);
      setDrag(next);
    },
    [dragY, haptics],
  );

  const move = useCallback(
    (id: string, pageY: number) => {
      const current = active.current;
      if (!current || current.id !== id || !Number.isFinite(pageY)) return;
      const { from, count, height } = current;
      const dy = clamp(pageY - current.startY, -from * height - height * 0.4, (count - 1 - from) * height + height * 0.4);
      dragY.setValue(dy);
      const to = clamp(from + Math.round(dy / height), 0, count - 1);
      if (to === current.to) return;
      current.to = to;
      haptics.selection();
      setDrag({ section: current.section, id, from, to, height });
    },
    [dragY, haptics],
  );

  const drop = useCallback(
    (id: string) => {
      const current = active.current;
      if (!current || current.id !== id) return;
      active.current = null;
      settling.current = true;
      Animated.timing(dragY, {
        toValue: (current.to - current.from) * current.height,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        settling.current = false;
        if (current.to !== current.from) dropRef.current(current.section, current.from, current.to);
        setDrag(null);
      });
    },
    [dragY],
  );

  return { arranging, drag, dragY, wiggle, start, finish, lift, move, drop };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
