import { createContext, memo, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent, StyleSheet, View, type ViewProps } from 'react-native';

import type { SetArrange, SetDrag } from '@/hooks/useSetArrange';
import type { SetInfo } from '@/types/set';
import type { SetListProgress } from '@/utils/setProgress';

import type { RowPosition } from './ListRow';
import { SetRow } from './SetRow';

type Props = {
  set: SetInfo;
  progress: SetListProgress | null;
  position: RowPosition;
  section: string;
  index: number;
  count: number;
  locked: boolean;
  arrange: SetArrange;
  onPress: (set: SetInfo) => void;
};

const DraggingContext = createContext<string | null>(null);

export function SetDragProvider({ drag, children }: { drag: SetDrag | null; children: ReactNode }) {
  return <DraggingContext.Provider value={drag?.id ?? null}>{children}</DraggingContext.Provider>;
}

export function SetCell({ item, style, ...rest }: ViewProps & { item?: unknown }) {
  const dragging = useContext(DraggingContext);
  const lifted = dragging !== null && (item as SetInfo | undefined)?.id === dragging;
  return <View {...rest} style={[style, lifted && styles.cellLifted]} />;
}

function SetArrangeRowView({ set, progress, position, section, index, count, locked, arrange, onPress }: Props) {
  const { arranging, drag, dragY, wiggle, lift, move, drop } = arrange;
  const height = useRef(60);
  const [shift] = useState(() => new Animated.Value(0));
  const inSection = drag !== null && drag.section === section;
  const isDragged = inSection && drag.id === set.id;
  const target = inSection && !isDragged ? shiftFor(index, drag) : 0;

  useEffect(() => {
    if (!inSection) {
      shift.setValue(0);
      return;
    }
    Animated.spring(shift, { toValue: target, damping: 22, stiffness: 300, useNativeDriver: true }).start();
  }, [inSection, target, shift]);

  const tilt = index % 2 === 0 ? ['-0.6deg', '0.6deg'] : ['0.6deg', '-0.6deg'];
  const transform = [
    { translateY: isDragged ? dragY : inSection ? shift : 0 },
    { scale: isDragged ? 1.03 : 1 },
    { rotate: arranging && !isDragged ? wiggle.interpolate({ inputRange: [-1, 1], outputRange: tilt }) : '0deg' },
  ];

  return (
    <Animated.View
      onLayout={(event) => {
        height.current = event.nativeEvent.layout.height;
      }}
      onTouchMove={(event) => move(set.id, pageYOf(event))}
      onTouchEnd={() => drop(set.id)}
      onTouchCancel={() => drop(set.id)}
      style={[isDragged && styles.lifted, { transform }]}
    >
      <SetRow
        set={set}
        progress={progress}
        position={position}
        tile={arranging}
        delayLongPress={arranging ? 180 : 450}
        onPress={(pressed) => {
          if (!arranging) onPress(pressed);
        }}
        onLongPress={
          locked
            ? undefined
            : (event) => lift({ section, id: set.id, index, count, height: height.current, pageY: pageYOf(event) })
        }
      />
    </Animated.View>
  );
}

export const SetArrangeRow = memo(SetArrangeRowView);

function pageYOf(event: GestureResponderEvent): number {
  const { touches, pageY } = event.nativeEvent;
  return touches?.[0]?.pageY ?? pageY;
}

function shiftFor(index: number, drag: SetDrag): number {
  if (drag.from < index && index <= drag.to) return -drag.height;
  if (drag.to <= index && index < drag.from) return drag.height;
  return 0;
}

const styles = StyleSheet.create({
  cellLifted: {
    zIndex: 10,
    elevation: 10,
  },
  lifted: {
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
