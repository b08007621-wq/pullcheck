import { type ReactNode, useEffect, useRef } from 'react';
import { View } from 'react-native';

type Props = {
  onHold: () => void;
  paused: boolean;
  children: ReactNode;
};

type Hold = {
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout>;
};

const HOLD_MS = 650;
const SLOP = 8;

export function SectionHold({ onHold, paused, children }: Props) {
  const hold = useRef<Hold | null>(null);

  useEffect(() => {
    const current = hold;
    return () => {
      if (current.current) clearTimeout(current.current.timer);
      current.current = null;
    };
  }, []);

  useEffect(() => {
    if (paused && hold.current) {
      clearTimeout(hold.current.timer);
      hold.current = null;
    }
  }, [paused]);

  const cancel = () => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  };

  return (
    <View
      onTouchStart={(event) => {
        cancel();
        if (paused || event.nativeEvent.touches.length > 1) return;
        const { pageX, pageY } = event.nativeEvent;
        hold.current = {
          x: pageX,
          y: pageY,
          timer: setTimeout(() => {
            hold.current = null;
            onHold();
          }, HOLD_MS),
        };
      }}
      onTouchMove={(event) => {
        const current = hold.current;
        if (!current) return;
        const { pageX, pageY } = event.nativeEvent;
        if (Math.abs(pageX - current.x) > SLOP || Math.abs(pageY - current.y) > SLOP) cancel();
      }}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
    >
      {children}
    </View>
  );
}
