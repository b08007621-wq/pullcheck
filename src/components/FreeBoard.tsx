import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { BoardLayout } from '@/state/settingsContext';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';

export type BoardWidget = {
  key: string;
  label: string;
  node: ReactNode;
};

type Props = {
  widgets: BoardWidget[];
  layout: BoardLayout;
  editing: boolean;
  paused?: boolean;
  gap?: number;
  onEditingChange: (editing: boolean) => void;
  onChange: (layout: BoardLayout) => void;
  onScrollLock?: (locked: boolean) => void;
};

type Rect = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Drag = {
  key: string;
  x: number;
  y: number;
  w: number;
};

type Gesture = {
  key: string;
  timer: ReturnType<typeof setTimeout> | null;
  lifted: boolean;
  touchX: number;
  touchY: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  w: number;
  sentX: number;
  sentY: number;
  pinch: { dist: number; w: number } | null;
  preview: number;
};

type Motion = {
  pos: Animated.ValueXY;
  lift: Animated.Value;
  pinch: Animated.Value;
  fade: Animated.Value;
  placed: boolean;
};

type Touch = { pageX: number; pageY: number; identifier?: number | string };

const HOLD_MS = 500;
const EDIT_HOLD_MS = 140;
const SLOP = 8;
const MIN_W = 0.4;
const SNAPS = [0.5, 2 / 3, 1];
const SNAP_RANGE = 0.04;
const RESEND = 6;

export function FreeBoard({
  widgets,
  layout,
  editing,
  paused = false,
  gap = spacing.lg,
  onEditingChange,
  onChange,
  onScrollLock,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const motion = useMotionEnabled();
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [frozen, setFrozen] = useState<Record<string, Rect> | null>(null);
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);
  const [motions] = useState(() => new Map<string, Motion>());
  const [wiggle] = useState(() => new Animated.Value(0));
  const gesture = useRef<Gesture | null>(null);

  const shown = useMemo(() => widgets.filter((widget) => !layout.hidden.includes(widget.key)), [widgets, layout.hidden]);
  const keys = useMemo(() => shown.map((widget) => widget.key), [shown]);
  const { rects, height } = useMemo(
    () => resolve(keys, layout, heights, width, gap, drag, frozen),
    [keys, layout, heights, width, gap, drag, frozen],
  );

  const motionFor = (key: string): Motion => {
    let entry = motions.get(key);
    if (!entry) {
      entry = {
        pos: new Animated.ValueXY({ x: 0, y: 0 }),
        lift: new Animated.Value(0),
        pinch: new Animated.Value(1),
        fade: new Animated.Value(1),
        placed: false,
      };
      motions.set(key, entry);
    }
    return entry;
  };

  useEffect(() => {
    for (const rect of Object.values(rects)) {
      if (drag?.key === rect.key) continue;
      const entry = motionFor(rect.key);
      if (!entry.placed) {
        entry.pos.setValue({ x: rect.x, y: rect.y });
        if (rect.h > 0 && width > 0) {
          entry.placed = true;
          Animated.timing(entry.fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
        }
        continue;
      }
      Animated.spring(entry.pos, {
        toValue: { x: rect.x, y: rect.y },
        damping: 20,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    }
  });

  useEffect(() => {
    if (!editing || !motion) {
      wiggle.setValue(0);
      return;
    }
    const step = (toValue: number, duration: number) =>
      Animated.timing(wiggle, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1, 140), step(-1, 280), step(0, 140)]));
    loop.start();
    return () => {
      loop.stop();
      wiggle.setValue(0);
    };
  }, [editing, motion, wiggle]);

  useEffect(() => {
    if (editing) return;
    const current = gesture.current;
    if (current?.timer) clearTimeout(current.timer);
    if (current?.lifted) return;
    gesture.current = null;
  }, [editing]);

  useEffect(
    () => () => {
      const current = gesture.current;
      if (current?.timer) clearTimeout(current.timer);
    },
    [],
  );

  const unit = width + gap;

  const lift = (current: Gesture) => {
    current.timer = null;
    current.lifted = true;
    haptics.collect();
    if (!editing) onEditingChange(true);
    onScrollLock?.(true);
    const entry = motionFor(current.key);
    entry.pos.stopAnimation();
    entry.pos.setValue({ x: current.x, y: current.y });
    Animated.spring(entry.lift, { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }).start();
    setFrozen(rects);
    setDrag({ key: current.key, x: current.x, y: current.y, w: current.w });
  };

  const beginPinch = (current: Gesture, touches: Touch[]) => {
    const [first, second] = touches;
    if (!first || !second) return;
    current.pinch = { dist: Math.max(distance(first, second), 1), w: current.w };
    current.preview = current.w;
  };

  const updatePinch = (current: Gesture, touches: Touch[]) => {
    const [first, second] = touches;
    if (!current.pinch || !first || !second || unit <= 0) return;
    const raw = (current.pinch.w * (distance(first, second) / current.pinch.dist) + gap) / unit;
    const fraction = snapWidth(raw);
    const next = fraction * unit - gap;
    current.preview = next;
    motionFor(current.key).pinch.setValue(next / current.w);
    const label = widthLabel(fraction);
    if (label !== sizeLabel) {
      haptics.selection();
      setSizeLabel(label);
    }
  };

  const endPinch = (current: Gesture) => {
    if (!current.pinch) return;
    const center = current.x + current.w / 2;
    const w = current.preview;
    current.pinch = null;
    current.w = w;
    current.x = clamp(center - w / 2, 0, Math.max(0, width - w));
    const entry = motionFor(current.key);
    entry.pinch.setValue(1);
    entry.pos.setValue({ x: current.x, y: current.y });
    setSizeLabel(null);
    setDrag({ key: current.key, x: current.x, y: current.y, w });
  };

  const rebase = (current: Gesture, touch: Touch | undefined) => {
    if (!touch) return;
    current.touchX = touch.pageX;
    current.touchY = touch.pageY;
    current.originX = current.x;
    current.originY = current.y;
  };

  const cancelPending = () => {
    const current = gesture.current;
    if (current?.timer) clearTimeout(current.timer);
    if (current && !current.lifted) gesture.current = null;
  };

  const drop = (current: Gesture) => {
    gesture.current = null;
    endPinch(current);
    const others = Object.values(rects).filter((rect) => rect.key !== current.key);
    const fractionW = unit > 0 ? (current.w + gap) / unit : 1;
    const fractionX = snapX(unit > 0 ? current.x / unit : 0, fractionW, others, unit, gap);
    const final = resolve(
      keys,
      layout,
      heights,
      width,
      gap,
      { key: current.key, x: fractionX * unit, y: current.y, w: current.w },
      frozen,
    );
    const target = final.rects[current.key];
    const entry = motionFor(current.key);
    haptics.tap();
    if (target) {
      Animated.spring(entry.pos, {
        toValue: { x: target.x, y: target.y },
        damping: 18,
        stiffness: 240,
        useNativeDriver: true,
      }).start();
    }
    Animated.spring(entry.lift, { toValue: 0, damping: 16, stiffness: 260, useNativeDriver: true }).start();
    const items = Object.fromEntries(
      Object.values(final.rects).map((rect) => [
        rect.key,
        {
          x: unit > 0 ? rect.x / unit : 0,
          w: unit > 0 ? (rect.w + gap) / unit : 1,
          y: rect.y,
        },
      ]),
    );
    onChange({ ...layout, items: { ...layout.items, ...items } });
    setDrag(null);
    setFrozen(null);
    onScrollLock?.(false);
  };

  const touchStart = (key: string, event: GestureResponderEvent) => {
    const touches = activeTouches(event, false);
    const first = touches[0];
    const current = gesture.current;
    if (current && current.key !== key) return;
    if (current?.lifted) {
      if (touches.length >= 2 && !current.pinch) beginPinch(current, touches);
      return;
    }
    if (current?.timer) clearTimeout(current.timer);
    const rect = rects[key];
    if (!first || !rect || width === 0 || (!editing && paused)) {
      gesture.current = null;
      return;
    }
    const next: Gesture = {
      key,
      timer: null,
      lifted: false,
      touchX: first.pageX,
      touchY: first.pageY,
      originX: rect.x,
      originY: rect.y,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      sentX: rect.x,
      sentY: rect.y,
      pinch: null,
      preview: rect.w,
    };
    gesture.current = next;
    if (editing && touches.length >= 2) {
      lift(next);
      beginPinch(next, touches);
      return;
    }
    next.timer = setTimeout(() => lift(next), editing ? EDIT_HOLD_MS : HOLD_MS);
  };

  const touchMove = (event: GestureResponderEvent) => {
    const current = gesture.current;
    if (!current) return;
    const touches = activeTouches(event, false);
    const first = touches[0];
    if (!first) return;
    if (!current.lifted) {
      if (editing && touches.length >= 2) {
        if (current.timer) clearTimeout(current.timer);
        lift(current);
        beginPinch(current, touches);
      } else if (Math.abs(first.pageX - current.touchX) > SLOP || Math.abs(first.pageY - current.touchY) > SLOP) {
        cancelPending();
      }
      return;
    }
    if (touches.length >= 2) {
      if (!current.pinch) beginPinch(current, touches);
      updatePinch(current, touches);
      return;
    }
    if (current.pinch) {
      endPinch(current);
      rebase(current, first);
    }
    current.x = clamp(current.originX + first.pageX - current.touchX, 0, Math.max(0, width - current.w));
    current.y = Math.max(0, current.originY + first.pageY - current.touchY);
    motionFor(current.key).pos.setValue({ x: current.x, y: current.y });
    if (Math.abs(current.x - current.sentX) >= RESEND || Math.abs(current.y - current.sentY) >= RESEND) {
      current.sentX = current.x;
      current.sentY = current.y;
      setDrag({ key: current.key, x: current.x, y: current.y, w: current.w });
    }
  };

  const touchEnd = (event: GestureResponderEvent) => {
    const current = gesture.current;
    if (!current) return;
    const remaining = activeTouches(event, true);
    if (!current.lifted) {
      if (remaining.length === 0) cancelPending();
      return;
    }
    if (remaining.length > 0) {
      if (current.pinch && remaining.length < 2) {
        endPinch(current);
        rebase(current, remaining[0]);
      }
      return;
    }
    drop(current);
  };

  const touchCancel = () => {
    const current = gesture.current;
    if (!current) return;
    if (current.lifted) drop(current);
    else cancelPending();
  };

  const hide = (key: string) => {
    haptics.selection();
    const entry = motionFor(key);
    Animated.parallel([
      Animated.timing(entry.fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(entry.lift, { toValue: -1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      entry.placed = false;
      entry.lift.setValue(0);
      onChange({ ...layout, hidden: [...layout.hidden, key] });
    });
  };

  const ghost = drag ? rects[drag.key] : null;

  return (
    <View
      style={[styles.board, { height: Math.max(height, drag ? drag.y + (heights[drag.key] ?? 0) : 0) }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {ghost && ghost.h > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.ghost, { width: ghost.w, height: ghost.h, transform: [{ translateX: ghost.x }, { translateY: ghost.y }] }]}
        />
      ) : null}
      {width > 0
        ? shown.map((widget, index) => {
            const rect = rects[widget.key];
            if (!rect) return null;
            const entry = motionFor(widget.key);
            const lifted = drag?.key === widget.key;
            const tilt = index % 2 === 0 ? ['-0.5deg', '0.5deg'] : ['0.5deg', '-0.5deg'];
            return (
              <Animated.View
                key={widget.key}
                onTouchStart={(event) => touchStart(widget.key, event)}
                onTouchMove={touchMove}
                onTouchEnd={touchEnd}
                onTouchCancel={touchCancel}
                onMoveShouldSetResponderCapture={() => gesture.current?.key === widget.key && gesture.current.lifted}
                onResponderTerminationRequest={() => !(gesture.current?.key === widget.key && gesture.current.lifted)}
                style={[
                  styles.item,
                  {
                    width: rect.w,
                    zIndex: lifted ? 10 : 1,
                    opacity: entry.fade,
                    transform: [{ translateX: entry.pos.x }, { translateY: entry.pos.y }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    lifted && styles.lifted,
                    {
                      transform: [
                        {
                          rotate:
                            editing && !lifted ? wiggle.interpolate({ inputRange: [-1, 1], outputRange: tilt }) : '0deg',
                        },
                        { scale: entry.lift.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.6, 1, 1.035] }) },
                        { scale: entry.pinch },
                      ],
                    },
                  ]}
                >
                  <View
                    onLayout={(event) => {
                      const next = Math.round(event.nativeEvent.layout.height);
                      setHeights((current) => (current[widget.key] === next ? current : { ...current, [widget.key]: next }));
                    }}
                  >
                    {widget.node}
                  </View>
                  {editing && rect.h > 0 ? (
                    <View
                      style={[styles.cover, lifted && styles.coverLifted]}
                      onStartShouldSetResponder={() => true}
                      onResponderTerminationRequest={() => !gesture.current?.lifted}
                      accessible
                      accessibilityLabel={`${widget.label}. Hold and drag to move it. Pinch with two fingers to resize it.`}
                    />
                  ) : null}
                  {editing && !lifted && rect.h > 0 ? (
                    <Pressable
                      onPress={() => hide(widget.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Hide ${widget.label}`}
                      hitSlop={10}
                      style={styles.remove}
                    >
                      <Ionicons name="remove" size={16} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </Animated.View>
                {lifted && sizeLabel ? (
                  <View pointerEvents="none" style={styles.sizeWrap}>
                    <View style={styles.size}>
                      <Text style={styles.sizeText}>{sizeLabel}</Text>
                    </View>
                  </View>
                ) : null}
              </Animated.View>
            );
          })
        : null}
    </View>
  );
}

function resolve(
  keys: string[],
  layout: BoardLayout,
  heights: Record<string, number>,
  width: number,
  gap: number,
  drag: Drag | null,
  frozen: Record<string, Rect> | null,
): { rects: Record<string, Rect>; height: number } {
  const unit = width + gap;
  const entries = keys.map((key, index) => {
    const h = heights[key] ?? 0;
    if (drag?.key === key) return { key, x: drag.x, w: drag.w, h, sort: drag.y + h / 2 };
    const still = frozen?.[key];
    if (still) return { key, x: still.x, w: still.w, h, sort: still.y + h / 2 };
    const saved = layout.items[key];
    const fractionW = saved ? Math.min(1, Math.max(MIN_W, saved.w)) : 1;
    const fractionX = saved ? Math.min(Math.max(0, saved.x), 1 - fractionW) : 0;
    return {
      key,
      x: fractionX * unit,
      w: Math.max(0, fractionW * unit - gap),
      h,
      sort: saved ? saved.y + h / 2 : 1e6 + index,
    };
  });
  entries.sort((first, second) => first.sort - second.sort || first.x - second.x);
  const rects: Record<string, Rect> = {};
  let height = 0;
  for (const entry of entries) {
    let y = 0;
    if (entry.h > 0) {
      for (const rect of Object.values(rects)) {
        if (rect.h > 0 && rect.x < entry.x + entry.w - 1 && entry.x < rect.x + rect.w - 1) {
          y = Math.max(y, rect.y + rect.h + gap);
        }
      }
      height = Math.max(height, y + entry.h);
    }
    rects[entry.key] = { key: entry.key, x: entry.x, y, w: entry.w, h: entry.h };
  }
  return { rects, height };
}

function snapWidth(fraction: number): number {
  for (const snap of SNAPS) {
    if (Math.abs(fraction - snap) < SNAP_RANGE) return snap;
  }
  return clamp(fraction, MIN_W, 1);
}

function snapX(fraction: number, w: number, others: Rect[], unit: number, gap: number): number {
  const candidates = [0, 1 - w];
  if (unit > 0) {
    for (const rect of others) {
      const left = rect.x / unit;
      const right = (rect.x + rect.w + gap) / unit;
      candidates.push(left, right, right - w, left - w);
    }
  }
  let best = fraction;
  let distanceToBest = SNAP_RANGE;
  for (const candidate of candidates) {
    const away = Math.abs(candidate - fraction);
    if (away < distanceToBest) {
      best = candidate;
      distanceToBest = away;
    }
  }
  return clamp(best, 0, Math.max(0, 1 - w));
}

function widthLabel(fraction: number): string {
  if (fraction === 1) return 'Full width';
  if (fraction === 0.5) return 'Half width';
  if (fraction === 2 / 3) return 'Two thirds';
  return `${Math.round(fraction * 100)}% wide`;
}

function activeTouches(event: GestureResponderEvent, ending: boolean): Touch[] {
  const { touches, changedTouches, pageX, pageY } = event.nativeEvent;
  const list: Touch[] = Array.isArray(touches) ? touches : touches ? Array.from(touches as ArrayLike<Touch>) : [];
  if (!ending) return list.length > 0 ? list : [{ pageX, pageY }];
  const changed: Touch[] = Array.isArray(changedTouches)
    ? changedTouches
    : changedTouches
      ? Array.from(changedTouches as ArrayLike<Touch>)
      : [];
  return list.filter((touch) => !changed.some((done) => done.identifier === touch.identifier));
}

function distance(first: Touch, second: Touch): number {
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    board: {
      position: 'relative',
    },
    item: {
      position: 'absolute',
      left: 0,
      top: 0,
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
      backgroundColor: withAlpha(theme.colors.accent, 0.04),
    },
    coverLifted: {
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    ghost: {
      position: 'absolute',
      left: 0,
      top: 0,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: withAlpha(theme.colors.accent, 0.6),
      backgroundColor: withAlpha(theme.colors.accent, 0.08),
    },
    remove: {
      position: 'absolute',
      top: 6,
      left: 6,
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.loss,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    sizeWrap: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    size: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    sizeText: {
      ...typography.label,
      fontSize: 14,
      color: theme.colors.onAccent,
    },
  });
}
