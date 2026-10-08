import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type GestureResponderEvent,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Board } from '@/hooks/useBoard';
import { useHaptics } from '@/hooks/useHaptics';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { BoardItem, BoardLayout } from '@/state/settingsContext';
import { type AppTheme, radius, spacing } from '@/theme';
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
};

type Resize = {
  key: string;
  fraction: number;
  hs: number;
};

type ResizeGrip = {
  key: string;
  pageX: number;
  pageY: number;
  fraction: number;
  hs: number;
  height: number;
  nextFraction: number;
  nextHs: number;
};

const HOLD_MS = 420;
const EDIT_HOLD_MS = 90;
const SLOP = 6;
const HS_MIN = 0.5;
const HS_MAX = 2;
const HS_STEP = 0.25;
const WIDTH_SNAP = 0.16;
const SPRING = { damping: 20, stiffness: 300, mass: 0.9, useNativeDriver: true } as const;
const RESIZE_ANIMATION = LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY);
const EDGE_ZONE = 90;
const MAX_SCROLL_STEP = 16;
const ROW_STEP = 100;
const HALF = 0.5;
const DEFAULT_EDGES = { top: 120, bottom: 150 };

export function ArrangeBoard({ widgets, board, paused = false, gap = spacing.lg, edges = DEFAULT_EDGES, autoScroll }: Props) {
  const { layout, editing } = board;
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const motion = useMotionEnabled();
  const { height: screenHeight } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [lifted, setLifted] = useState<string | null>(null);
  const [resize, setResize] = useState<Resize | null>(null);
  const [natural, setNatural] = useState<Record<string, number>>({});
  const [motions] = useState(() => new Map<string, Motion>());
  const [wiggle] = useState(() => new Animated.Value(0));
  const frames = useRef<Record<string, Frame>>({});
  const gesture = useRef<Gesture | null>(null);
  const grip = useRef<ResizeGrip | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReset = useRef(false);
  const settling = useRef(false);

  const present = useMemo(
    () => widgets.filter((widget) => widget.node !== null && widget.node !== undefined && widget.node !== false),
    [widgets],
  );
  const order = useMemo(() => orderOf(present, layout), [present, layout]);
  const byKey = useMemo(() => new Map(present.map((widget) => [widget.key, widget])), [present]);

  const motionFor = (key: string): Motion => {
    let entry = motions.get(key);
    if (!entry) {
      entry = { shift: new Animated.ValueXY({ x: 0, y: 0 }), lift: new Animated.Value(0) };
      motions.set(key, entry);
    }
    return entry;
  };

  const resetMotions = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = null;
    settling.current = false;
    motions.forEach((entry) => {
      entry.shift.setValue({ x: 0, y: 0 });
      entry.lift.setValue(0);
    });
  }, [motions]);

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
    if (!pendingReset.current) return;
    pendingReset.current = false;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(resetMotions);
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [order, resetMotions]);

  useEffect(() => {
    const current = gesture;
    const timer = scrollTimer;
    const reset = resetTimer;
    return () => {
      if (current.current?.timer) clearTimeout(current.current.timer);
      if (timer.current) clearInterval(timer.current);
      if (reset.current) clearTimeout(reset.current);
    };
  }, []);

  const half = width > 0 ? (width - gap) / 2 : 0;
  const itemWidth = (key: string) => (fractionOf(layout, byKey.get(key)) === 1 ? width : half);

  const flow = (keys: string[]): Record<string, Frame> => {
    const result: Record<string, Frame> = {};
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    for (const key of keys) {
      const w = itemWidth(key);
      const h = frames.current[key]?.h ?? 0;
      if (x > 0 && x + w > width + 0.5) {
        x = 0;
        y += rowHeight + gap;
        rowHeight = 0;
      }
      result[key] = { x, y, w, h };
      x += w + gap;
      rowHeight = Math.max(rowHeight, h);
    }
    return result;
  };

  const persist = (nextOrder: string[], widths: Record<string, number> = {}, heights: Record<string, number> = {}) => {
    const items: Record<string, BoardItem> = { ...layout.items };
    nextOrder.forEach((key, index) => {
      const w = widths[key] ?? fractionOf(layout, byKey.get(key));
      const hs = heights[key] ?? heightOf(layout, byKey.get(key));
      items[key] = { x: 0, w, y: index * ROW_STEP, ...(hs !== 1 ? { hs } : {}) };
    });
    board.save({ ...layout, items });
  };

  const insertion = (current: Gesture): number => {
    const own = frames.current[current.key];
    const others = order.filter((key) => key !== current.key);
    if (!own) return order.indexOf(current.key);
    const cx = own.x + own.w / 2 + (current.pageX - current.startX);
    const cy = own.y + own.h / 2 + (current.pageY - current.startY) + current.scrolled;
    for (let position = 0; position < others.length; position += 1) {
      const frame = frames.current[others[position] ?? ''];
      if (frame && isBefore(cx, cy, frame, width)) return position;
    }
    return others.length;
  };

  const arrangement = (key: string, index: number): string[] => {
    const others = order.filter((entry) => entry !== key);
    return [...others.slice(0, index), key, ...others.slice(index)];
  };

  const reflow = (key: string, index: number) => {
    const target = flow(arrangement(key, index));
    for (const other of order) {
      if (other === key) continue;
      const now = frames.current[other];
      const next = target[other];
      if (!now || !next) continue;
      Animated.spring(motionFor(other).shift, { ...SPRING, toValue: { x: next.x - now.x, y: next.y - now.y } }).start();
    }
  };

  const follow = (current: Gesture) => {
    motionFor(current.key).shift.setValue({
      x: current.pageX - current.startX,
      y: current.pageY - current.startY + current.scrolled,
    });
    const index = insertion(current);
    if (index !== current.target) {
      current.target = index;
      haptics.selection();
      reflow(current.key, index);
    }
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
    current.target = order.indexOf(current.key);
    haptics.collect();
    if (!editing) board.setEditing(true);
    board.setLocked(true);
    setLifted(current.key);
    Animated.spring(motionFor(current.key).lift, { ...SPRING, toValue: 1 }).start();
    follow(current);
  };

  const cancelPending = () => {
    const current = gesture.current;
    if (current?.timer) clearTimeout(current.timer);
    if (current && !current.lifted) gesture.current = null;
  };

  const settle = () => {
    setLifted(null);
    board.setLocked(false);
  };

  const drop = (current: Gesture) => {
    gesture.current = null;
    stopScrolling();
    const index = insertion(current);
    const nextOrder = arrangement(current.key, index);
    const changed = nextOrder.some((key, position) => key !== order[position]);
    const entry = motionFor(current.key);
    haptics.tap();
    settling.current = true;

    if (!changed) {
      order.forEach((key) => {
        const target = motionFor(key);
        Animated.spring(target.shift, { ...SPRING, toValue: { x: 0, y: 0 } }).start();
      });
      Animated.spring(entry.lift, { ...SPRING, toValue: 0 }).start(() => {
        settling.current = false;
        settle();
      });
      return;
    }

    const slot = flow(nextOrder)[current.key];
    const own = frames.current[current.key];
    const commit = () => {
      pendingReset.current = true;
      resetTimer.current = setTimeout(resetMotions, 700);
      persist(nextOrder);
      settle();
    };
    if (!motion || !slot || !own) {
      commit();
      return;
    }
    Animated.parallel([
      Animated.spring(entry.shift, { ...SPRING, toValue: { x: slot.x - own.x, y: slot.y - own.y } }),
      Animated.spring(entry.lift, { ...SPRING, toValue: 0 }),
    ]).start(({ finished }) => {
      if (finished) commit();
    });
  };

  const touchStart = (key: string, event: GestureResponderEvent) => {
    if (grip.current || settling.current) return;
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
      const moved = Math.abs(pageX - current.startX) > SLOP || Math.abs(pageY - current.startY) > SLOP;
      if (!moved) return;
      if (editing && current.timer) {
        clearTimeout(current.timer);
        lift(current);
      } else {
        cancelPending();
        return;
      }
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
    LayoutAnimation.configureNext(RESIZE_ANIMATION);
    board.save({ ...layout, hidden: [...layout.hidden, key] });
  };

  const heightRange = (widget: BoardWidget | undefined): [number, number] => {
    if (!widget || widget.resize === 'width' || widget.resize === 'none') return [1, 1];
    return [HS_MIN, typeof widget.node === 'function' ? HS_MAX : 1];
  };

  const gripStart = (key: string, event: GestureResponderEvent) => {
    const { pageX, pageY } = pointOf(event);
    const frame = frames.current[key];
    const widget = byKey.get(key);
    grip.current = {
      key,
      pageX,
      pageY,
      fraction: fractionOf(layout, widget),
      hs: heightOf(layout, widget),
      height: frame?.h ?? 1,
      nextFraction: fractionOf(layout, widget),
      nextHs: heightOf(layout, widget),
    };
    haptics.collect();
    board.setLocked(true);
    setResize({ key, fraction: grip.current.fraction, hs: grip.current.hs });
  };

  const gripMove = (event: GestureResponderEvent) => {
    const start = grip.current;
    if (!start) return;
    const widget = byKey.get(start.key);
    const { pageX, pageY } = pointOf(event);
    const dx = pageX - start.pageX;
    const dy = pageY - start.pageY;
    let fraction = start.fraction;
    if (widget?.resize !== 'none' && width > 0) {
      if (start.fraction === HALF && dx > width * WIDTH_SNAP) fraction = 1;
      if (start.fraction === 1 && dx < -width * WIDTH_SNAP) fraction = HALF;
    }
    const [min, max] = heightRange(widget);
    const raw = start.hs * (1 + dy / Math.max(start.height, 40));
    const hs = Math.min(max, Math.max(min, Math.round(raw / HS_STEP) * HS_STEP));
    if (fraction === start.nextFraction && hs === start.nextHs) return;
    start.nextFraction = fraction;
    start.nextHs = hs;
    haptics.selection();
    LayoutAnimation.configureNext(RESIZE_ANIMATION);
    setResize({ key: start.key, fraction, hs });
  };

  const gripEnd = () => {
    const start = grip.current;
    grip.current = null;
    board.setLocked(false);
    setResize(null);
    if (!start) return;
    if (start.nextFraction === start.fraction && start.nextHs === start.hs) return;
    haptics.tap();
    persist(order, { [start.key]: start.nextFraction }, { [start.key]: start.nextHs });
  };

  const nudge = (key: string, action: string) => {
    const widget = byKey.get(key);
    const [min, max] = heightRange(widget);
    const hs = heightOf(layout, widget);
    const fraction = fractionOf(layout, widget);
    LayoutAnimation.configureNext(RESIZE_ANIMATION);
    if (action === 'increment') persist(order, {}, { [key]: Math.min(max, hs + HS_STEP) });
    else if (action === 'decrement') persist(order, {}, { [key]: Math.max(min, hs - HS_STEP) });
    else persist(order, { [key]: fraction === 1 ? HALF : 1 });
  };

  return (
    <View style={[styles.board, { columnGap: gap, rowGap: gap }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {order.map((key, index) => {
        const widget = byKey.get(key);
        if (!widget) return null;
        const entry = motionFor(key);
        const isLifted = lifted === key;
        const resizing = resize?.key === key ? resize : null;
        const fraction = resizing ? resizing.fraction : fractionOf(layout, widget);
        const hs = resizing ? resizing.hs : heightOf(layout, widget);
        const slotWidth = width > 0 ? (fraction === 1 ? width : half) : '100%';
        const tilt = index % 2 === 0 ? ['-0.6deg', '0.6deg'] : ['0.6deg', '-0.6deg'];
        const dynamic = typeof widget.node === 'function';
        const content = typeof widget.node === 'function' ? widget.node({ heightScale: hs }) : widget.node;
        const naturalHeight = natural[key];
        const cropped = !dynamic && hs < 1 && naturalHeight !== undefined;
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
              width: slotWidth,
              zIndex: isLifted ? 10 : 1,
              transform: [{ translateX: entry.shift.x }, { translateY: entry.shift.y }],
            }}
          >
            <Animated.View
              style={[
                isLifted && styles.lifted,
                {
                  transform: [
                    { rotate: editing && !isLifted ? wiggle.interpolate({ inputRange: [-1, 1], outputRange: tilt }) : '0deg' },
                    { scale: entry.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
                  ],
                },
              ]}
            >
              <View style={cropped ? { height: naturalHeight * hs, overflow: 'hidden' } : undefined}>
                <View
                  onLayout={(event) => {
                    const measured = Math.round(event.nativeEvent.layout.height);
                    if (dynamic) return;
                    setNatural((current) => (current[key] === measured ? current : { ...current, [key]: measured }));
                  }}
                >
                  {content}
                </View>
                {cropped ? (
                  <LinearGradient
                    pointerEvents="none"
                    colors={['transparent', theme.colors.background]}
                    style={styles.cropFade}
                  />
                ) : null}
              </View>
              {editing ? (
                <View
                  style={[styles.cover, isLifted && styles.coverLifted]}
                  onStartShouldSetResponder={() => true}
                  accessible
                  accessibilityLabel={`${widget.label}. Hold and drag to move it.`}
                />
              ) : null}
              {editing && !isLifted && widget.resize !== 'none' && width > 0 ? (
                <View
                  style={styles.grip}
                  hitSlop={10}
                  onTouchStart={(event) => gripStart(key, event)}
                  onStartShouldSetResponder={() => true}
                  onResponderMove={gripMove}
                  onResponderRelease={gripEnd}
                  onResponderTerminate={gripEnd}
                  onResponderTerminationRequest={() => false}
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Resize ${widget.label}`}
                  accessibilityActions={[
                    { name: 'increment', label: 'Make taller' },
                    { name: 'decrement', label: 'Make shorter' },
                    { name: 'activate', label: fraction === 1 ? 'Make half width' : 'Make full width' },
                  ]}
                  onAccessibilityAction={(event) => nudge(key, event.nativeEvent.actionName)}
                >
                  <Ionicons name="resize" size={14} color={styles.gripIcon.color} />
                </View>
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

function heightOf(layout: BoardLayout, widget: BoardWidget | undefined): number {
  if (!widget || widget.resize === 'none' || widget.resize === 'width') return 1;
  const saved = layout.items[widget.key]?.hs;
  if (typeof saved !== 'number' || !Number.isFinite(saved)) return 1;
  const max = typeof widget.node === 'function' ? HS_MAX : 1;
  return Math.min(max, Math.max(HS_MIN, Math.round(saved / HS_STEP) * HS_STEP));
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
    grip: {
      position: 'absolute',
      right: -6,
      bottom: -6,
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    gripIcon: {
      color: theme.colors.onAccent,
    },
    cropFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 28,
    },
  });
}
