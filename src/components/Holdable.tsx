import { type ReactNode, useEffect, useRef } from 'react';
import { type GestureResponderEvent, type StyleProp, View, type ViewStyle } from 'react-native';

export type Point = {
  x: number;
  y: number;
};

type Props = {
  children: ReactNode;
  enabled?: boolean;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  onLift: (point: Point) => boolean;
  onMove: (point: Point) => void;
  onDrop: (point: Point) => void;
};

type Hold = {
  start: Point;
  last: Point;
  timer: ReturnType<typeof setTimeout> | null;
  lifted: boolean;
};

const SLOP = 8;

export function Holdable({ children, enabled = true, delay = 320, style, onLift, onMove, onDrop }: Props) {
  const hold = useRef<Hold | null>(null);

  useEffect(
    () => () => {
      if (hold.current?.timer) clearTimeout(hold.current.timer);
    },
    [],
  );

  const pointOf = (event: GestureResponderEvent): Point => {
    const { touches, pageX, pageY } = event.nativeEvent;
    const first = touches?.[0];
    return first ? { x: first.pageX, y: first.pageY } : { x: pageX, y: pageY };
  };

  return (
    <View
      style={style}
      onTouchStart={(event) => {
        if (!enabled || (event.nativeEvent.touches?.length ?? 1) > 1) return;
        const point = pointOf(event);
        const current: Hold = { start: point, last: point, timer: null, lifted: false };
        current.timer = setTimeout(() => {
          current.timer = null;
          current.lifted = onLift(current.last);
          if (!current.lifted) hold.current = null;
        }, delay);
        hold.current = current;
      }}
      onTouchMove={(event) => {
        const current = hold.current;
        if (!current) return;
        const point = pointOf(event);
        current.last = point;
        if (current.lifted) {
          onMove(point);
          return;
        }
        if (Math.abs(point.x - current.start.x) > SLOP || Math.abs(point.y - current.start.y) > SLOP) {
          if (current.timer) clearTimeout(current.timer);
          hold.current = null;
        }
      }}
      onTouchEnd={() => {
        const current = hold.current;
        hold.current = null;
        if (!current) return;
        if (current.timer) clearTimeout(current.timer);
        if (current.lifted) onDrop(current.last);
      }}
      onTouchCancel={() => {
        const current = hold.current;
        hold.current = null;
        if (!current) return;
        if (current.timer) clearTimeout(current.timer);
        if (current.lifted) onDrop(current.last);
      }}
      onMoveShouldSetResponderCapture={() => Boolean(hold.current?.lifted)}
      onResponderTerminationRequest={() => !hold.current?.lifted}
    >
      {children}
    </View>
  );
}
