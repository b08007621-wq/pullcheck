import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type GestureResponderEvent,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Board } from '@/hooks/useBoard';
import { useHaptics } from '@/hooks/useHaptics';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { BoardItem, BoardLayout } from '@/state/settingsContext';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';

export type BoardSize = {
  heightScale: number;
};

export type BoardWidget = {
  key: string;
  label: string;
  node: ReactNode | ((size: BoardSize) => ReactNode);
  stretch?: boolean;
  resize?: 'both' | 'width' | 'none';
  hideable?: boolean;
};

type Props = {
  widgets: BoardWidget[];
  board: Board;
  paused?: boolean;
  gap?: number;
  edges?: { top: number; bottom: number };
  autoScroll?: (dy: number) => number;
};

type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Gesture = {
  key: string;
  timer: ReturnType<typeof setTimeout> | null;
  lifted: boolean;
  startX: number;
  startY: number;
  pageX: number;
  pageY: number;
  scrolled: number;
  target: number;
};

type Motion = {
  shift: Animated.ValueXY;
  lift: Animated.Value;
  fade: Animated.Value;
};

const HOLD_MS = 600;
const EDIT_HOLD_MS = 150;
const SLOP = 8;
const EDGE_ZONE = 90;
const MAX_SCROLL_STEP = 16;
const ROW_STEP = 100;
const HALF = 0.5;
const DEFAULT_EDGES = { top: 120, bottom: 150 };
const FULL_SIZE: BoardSize = { heightScale: 1 };

export function ArrangeBoard({ widgets, board, paused = false, gap = spacing.lg, edges = DEFAULT_EDGES, autoScroll }: Props) {
  const { layout, editing } = board;
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const motion = useMotionEnabled();
  const { height: screenHeight } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [lifted, setLifted] = useState<string | null>(null);
  const [marker, setMarker] = useState<Frame | null>(null);
  const [motions] = useState(() => new Map<string, Motion>());
  const [wiggle] = useState(() => new Animated.Value(0));
  const frames = useRef<Record<string, Frame>>({});
  const gesture = useRef<Gesture | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const present = useMemo(
    () => widgets.filter((widget) => widget.node !== null && widget.node !== undefined && widget.node !== false),
    [widgets],
  );
  const order = useMemo(() => orderOf(present, layout), [present, layout]);
  const byKey = useMemo(() => new Map(present.map((widget) => [widget.key, widget])), [present]);

  const motionFor = (key: string): Motion => {
    let entry = motions.get(key);
    if (!entry) {
      entry = { shift: new Animated.ValueXY({ x: 0, y: 0 }), lift: new Animated.Value(0), fade: new Animated.Value(1) };
      motions.set(key, entry);
    }
    return entry;
  };

  useEffect(() => {
    if (!editing || !motion) {
      wiggle.setValue(0);
      return;
    }
    const step = (toValue: number, duration: number) =>
      Animated.timing(wiggle, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1, 130), step(-1, 260), step(0, 130)]));
    loop.start();
    return () => {
      loop.stop();
      wiggle.setValue(0);
    };
  }, [editing, motion, wiggle]);

  useEffect(() => {
    if (!paused) return;
    const current = gesture.current;
    if (current && !current.lifted) {
      if (current.timer) clearTimeout(current.timer);
      gesture.current = null;
    }
  }, [paused]);

  useEffect(() => {
    const current = gesture;
    const timer = scrollTimer;
    return () => {
      if (current.current?.timer) clearTimeout(current.current.timer);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const half = width > 0 ? (width - gap) / 2 : 0;

  const persist = (nextOrder: string[], widths: Record<string, number> = {}) => {
    const items: Record<string, BoardItem> = { ...layout.items };
    nextOrder.forEach((key, index) => {
      const w = widths[key] ?? fractionOf(layout, byKey.get(key));
      items[key] = { x: 0, w, y: index * ROW_STEP };
    });
    board.save({ ...layout, items });
  };

  const insertion = (current: Gesture): { index: number; marker: Frame | null } => {
    const own = frames.current[current.key];
    const others = order.filter((key) => key !== current.key);
    if (!own) return { index: order.indexOf(current.key), marker: null };
    const cx = own.x + own.w / 2 + (current.pageX - current.startX);
    const cy = own.y + own.h / 2 + (current.pageY - current.startY) + current.scrolled;
    let index = others.length;
    for (let position = 0; position < others.length; position += 1) {
      const frame = frames.current[others[position] ?? ''];
      if (frame && isBefore(cx, cy, frame, width)) {
        index = position;
        break;
      }
    }
    const target = others[index];
    const frame = target ? frames.current[target] : null;
    if (frame) {
      if (frame.x > 1) return { index, marker: { x: frame.x - gap / 2 - 2, y: frame.y, w: 4, h: frame.h } };
      return { index, marker: { x: 0, y: frame.y - gap / 2 - 2, w: width, h: 4 } };
    }
    const bottom = others.reduce((low, key) => {
      const other = frames.current[key];
      return other ? Math.max(low, other.y + other.h) : low;
    }, 0);
    return { index, marker: { x: 0, y: bottom + gap / 2 - 2, w: width, h: 4 } };
  };

  const follow = (current: Gesture) => {
    motionFor(current.key).shift.setValue({
      x: current.pageX - current.startX,
      y: current.pageY - current.startY + current.scrolled,
    });
    const next = insertion(current);
    if (next.index !== current.target) {
      current.target = next.index;
      haptics.selection();
    }
    setMarker(next.marker);
  };

  const stopScrolling = () => {
    if (scrollTimer.current) clearInterval(scrollTimer.current);
    scrollTimer.current = null;
  };

  const scrollStep = (pageY: number): number => {
    const top = edges.top;
    const bottom = screenHeight - edges.bottom;
    if (pageY < top + EDGE_ZONE) return -Math.min(MAX_SCROLL_STEP, 2 + ((top + EDGE_ZONE - pageY) / EDGE_ZONE) * MAX_SCROLL_STEP);
    if (pageY > bottom - EDGE_ZONE) return Math.min(MAX_SCROLL_STEP, 2 + ((pageY - bottom + EDGE_ZONE) / EDGE_ZONE) * MAX_SCROLL_STEP);
    return 0;
  };

  const startScrolling = () => {
    if (!autoScroll || scrollTimer.current) return;
    scrollTimer.current = setInterval(() => {
      const current = gesture.current;
      const step = current?.lifted ? scrollStep(current.pageY) : 0;
      if (!current || step === 0) {
        stopScrolling();
        return;
      }
      const applied = autoScroll(step);
      if (applied === 0) return;
      current.scrolled += applied;
      follow(current);
    }, 16);
  };

  const lift = (current: Gesture) => {
    current.timer = null;
    current.lifted = true;
    current.target = order.filter((key) => key !== current.key).length;
    haptics.collect();
    if (!editing) board.setEditing(true);
    board.setLocked(true);
    setLifted(current.key);
    Animated.spring(motionFor(current.key).lift, { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }).start();
    follow(current);
  };

  const cancelPending = () => {
    const current = gesture.current;
    if (current?.timer) clearTimeout(current.timer);
    if (current && !current.lifted) gesture.current = null;
  };

  const drop = (current: Gesture) => {
    gesture.current = null;
    stopScrolling();
    setMarker(null);
    const { index } = insertion(current);
    const others = order.filter((key) => key !== current.key);
    const nextOrder = [...others.slice(0, index), current.key, ...others.slice(index)];
    const changed = nextOrder.some((key, position) => key !== order[position]);
    const entry = motionFor(current.key);
    haptics.tap();
    const settle = () => {
      setLifted(null);
      board.setLocked(false);
    };
    if (!changed || !motion) {
      Animated.parallel([
        Animated.spring(entry.shift, { toValue: { x: 0, y: 0 }, damping: 18, stiffness: 240, useNativeDriver: true }),
        Animated.spring(entry.lift, { toValue: 0, damping: 16, stiffness: 260, useNativeDriver: true }),
      ]).start();
      if (changed) persist(nextOrder);
      settle();
      return;
    }
    Animated.timing(entry.fade, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      entry.shift.setValue({ x: 0, y: 0 });
      entry.lift.setValue(0);
      entry.fade.setValue(1);
      LayoutAnimation.configureNext(LayoutAnimation.create(240, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY));
      persist(nextOrder);
      settle();
    });
  };

  const touchStart = (key: string, event: GestureResponderEvent) => {
    const { count, pageX, pageY } = pointOf(event);
    const current = gesture.current;
    if (current?.lifted) return;
    if (current?.timer) clearTimeout(current.timer);
    gesture.current = null;
    if (count > 1 || width === 0 || (!editing && paused)) return;
    const next: Gesture = {
      key,
      timer: null,
      lifted: false,
      startX: pageX,
      startY: pageY,
      pageX,
      pageY,
      scrolled: 0,
      target: -1,
    };
    next.timer = setTimeout(() => lift(next), editing ? EDIT_HOLD_MS : HOLD_MS);
    gesture.current = next;
  };

  const touchMove = (event: GestureResponderEvent) => {
    const current = gesture.current;
    if (!current) return;
    const { pageX, pageY } = pointOf(event);
    if (!current.lifted) {
      if (Math.abs(pageX - current.startX) > SLOP || Math.abs(pageY - current.startY) > SLOP) cancelPending();
      return;
    }
    current.pageX = pageX;
    current.pageY = pageY;
    follow(current);
    if (scrollStep(pageY) !== 0) startScrolling();
  };

  const touchEnd = () => {
    const current = gesture.current;
    if (!current) return;
    if (current.lifted) drop(current);
    else cancelPending();
  };

  const hide = (key: string) => {
    haptics.selection();
    const entry = motionFor(key);
    Animated.timing(entry.fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY));
      board.save({ ...layout, hidden: [...layout.hidden, key] });
      entry.fade.setValue(1);
    });
  };

  const resizeTo = (key: string) => {
    haptics.selection();
    const next = fractionOf(layout, byKey.get(key)) === 1 ? HALF : 1;
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    persist(order, { [key]: next });
  };

  return (
    <View style={[styles.board, { columnGap: gap, rowGap: gap }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {order.map((key, index) => {
        const widget = byKey.get(key);
        if (!widget) return null;
        const entry = motionFor(key);
        const isLifted = lifted === key;
        const fraction = fractionOf(layout, widget);
        const itemWidth = width > 0 ? (fraction === 1 ? width : half) : '100%';
        const tilt = index % 2 === 0 ? ['-0.6deg', '0.6deg'] : ['0.6deg', '-0.6deg'];
        const content = typeof widget.node === 'function' ? widget.node(FULL_SIZE) : widget.node;
        return (
          <Animated.View
            key={key}
            onLayout={(event) => {
              const { x, y, width: w, height: h } = event.nativeEvent.layout;
              frames.current[key] = { x, y, w, h };
            }}
            onTouchStart={(event) => touchStart(key, event)}
            onTouchMove={touchMove}
            onTouchEnd={touchEnd}
            onTouchCancel={touchEnd}
            onMoveShouldSetResponderCapture={() => gesture.current?.key === key && gesture.current.lifted}
            style={{
              width: itemWidth,
              zIndex: isLifted ? 10 : 1,
              opacity: entry.fade,
              transform: [{ translateX: entry.shift.x }, { translateY: entry.shift.y }],
            }}
          >
            <Animated.View
              style={[
                isLifted && styles.lifted,
                {
                  transform: [
                    { rotate: editing && !isLifted ? wiggle.interpolate({ inputRange: [-1, 1], outputRange: tilt }) : '0deg' },
                    { scale: entry.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
                  ],
                },
              ]}
            >
              {content}
              {editing ? (
                <View
                  style={[styles.cover, isLifted && styles.coverLifted]}
                  onStartShouldSetResponder={() => true}
                  accessible
                  accessibilityLabel={`${widget.label}. Hold and drag to move it.`}
                />
              ) : null}
              {editing && !isLifted && widget.resize !== 'none' && width > 0 ? (
                <Pressable
                  onPress={() => resizeTo(key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${widget.label}: make it ${fraction === 1 ? 'half' : 'full'} width`}
                  hitSlop={8}
                  style={styles.size}
                >
                  <Ionicons name={fraction === 1 ? 'contract-outline' : 'expand-outline'} size={13} color={styles.sizeText.color} />
                  <Text style={styles.sizeText}>{fraction === 1 ? 'Full' : 'Half'}</Text>
                </Pressable>
              ) : null}
              {editing && !isLifted && widget.hideable !== false ? (
                <Pressable
                  onPress={() => hide(key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Hide ${widget.label}`}
                  hitSlop={10}
                  style={styles.remove}
                >
                  <Ionicons name="remove" size={15} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </Animated.View>
          </Animated.View>
        );
      })}
      {marker ? (
        <View
          pointerEvents="none"
          style={[styles.marker, { left: marker.x, top: marker.y, width: marker.w, height: marker.h }]}
        />
      ) : null}
    </View>
  );
}

type TouchPoint = { pageX?: number; pageY?: number };

function pointOf(event: GestureResponderEvent): { count: number; pageX: number; pageY: number } {
  const native = event.nativeEvent as unknown as { touches?: ArrayLike<TouchPoint>; pageX?: number; pageY?: number };
  const touches = native.touches;
  const first = touches && touches.length > 0 ? touches[0] : undefined;
  return {
    count: touches?.length ?? 1,
    pageX: first?.pageX ?? native.pageX ?? 0,
    pageY: first?.pageY ?? native.pageY ?? 0,
  };
}

function orderOf(widgets: BoardWidget[], layout: BoardLayout): string[] {
  const keys = widgets.filter((widget) => !layout.hidden.includes(widget.key)).map((widget) => widget.key);
  const sorted = keys.map((key, index) => {
    const saved = layout.items[key];
    return { key, sort: saved ? saved.y + saved.x * 0.01 : unsavedSort(keys, layout, index), index };
  });
  sorted.sort((first, second) => first.sort - second.sort || first.index - second.index);
  return sorted.map((entry) => entry.key);
}

function unsavedSort(keys: string[], layout: BoardLayout, index: number): number {
  for (let next = index + 1; next < keys.length; next += 1) {
    const saved = layout.items[keys[next] ?? ''];
    if (saved) return saved.y - 1 + index * 0.001;
  }
  return 1e9 + index;
}

function fractionOf(layout: BoardLayout, widget: BoardWidget | undefined): number {
  if (!widget || widget.resize === 'none') return 1;
  const saved = layout.items[widget.key];
  return saved && saved.w < 0.75 ? HALF : 1;
}

function isBefore(cx: number, cy: number, frame: Frame, width: number): boolean {
  if (cy < frame.y) return true;
  if (cy > frame.y + frame.h) return false;
  if (frame.w >= width * 0.9) return cy < frame.y + frame.h / 2;
  return cx < frame.x + frame.w / 2;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    board: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      position: 'relative',
    },
    lifted: {
      borderRadius: radius.lg,
      backgroundColor: theme.colors.background,
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    cover: {
      ...StyleSheet.absoluteFill,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.accent, 0.35),
      backgroundColor: withAlpha(theme.colors.accent, 0.05),
    },
    coverLifted: {
      borderWidth: 2,
      borderColor: theme.colors.accent,
      backgroundColor: withAlpha(theme.colors.accent, 0.08),
    },
    remove: {
      position: 'absolute',
      top: -8,
      left: -8,
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.loss,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    size: {
      position: 'absolute',
      right: -6,
      top: -9,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    sizeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.onAccent,
    },
    marker: {
      position: 'absolute',
      zIndex: 20,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
  });
}
