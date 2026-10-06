import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type GestureResponderEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { BrowsePlace } from '@/services/cardBrowse';
import { type AppTheme, spacing, typography } from '@/theme';

import { PressableScale } from './PressableScale';

export type SwipeDirection = 'previous' | 'next';

type Props = {
  place: BrowsePlace | null;
  enterFrom: SwipeDirection | null;
  onGo: (direction: SwipeDirection) => void;
  children: ReactNode;
};

type Track = {
  x: number;
  y: number;
  lastX: number;
  lastT: number;
  speed: number;
};

const TRIGGER = 72;
const FLING = 0.45;
const SLOP = 12;

export function CardSwipe({ place, enterFrom, onGo, children }: Props) {
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const { width } = useWindowDimensions();
  const [shift] = useState(
    () => new Animated.Value(enterFrom && motion ? (enterFrom === 'next' ? 1 : -1) * width * 0.55 : 0),
  );
  const [fade] = useState(() => new Animated.Value(enterFrom && motion ? 0 : 1));
  const track = useRef<Track>({ x: 0, y: 0, lastX: 0, lastT: 0, speed: 0 });
  const leaving = useRef(false);

  useEffect(() => {
    if (!enterFrom || !motion) return;
    Animated.parallel([
      Animated.spring(shift, { toValue: 0, damping: 20, stiffness: 210, mass: 0.9, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [enterFrom, motion, shift, fade]);

  const go = (direction: SwipeDirection) => {
    if (leaving.current) return;
    leaving.current = true;
    if (!motion) {
      onGo(direction);
      return;
    }
    Animated.parallel([
      Animated.timing(shift, {
        toValue: (direction === 'next' ? -1 : 1) * width,
        duration: 170,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fade, { toValue: 0, duration: 170, useNativeDriver: true }),
    ]).start(() => onGo(direction));
  };

  const settle = () => {
    Animated.spring(shift, { toValue: 0, damping: 18, stiffness: 240, useNativeDriver: true }).start();
  };

  const horizontal = (event: GestureResponderEvent) => {
    if (!place || leaving.current) return false;
    const dx = event.nativeEvent.pageX - track.current.x;
    const dy = event.nativeEvent.pageY - track.current.y;
    return Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy) * 1.5;
  };

  const move = (event: GestureResponderEvent) => {
    const now = event.nativeEvent.timestamp;
    const x = event.nativeEvent.pageX;
    const elapsed = now - track.current.lastT;
    if (elapsed > 0) track.current.speed = (x - track.current.lastX) / elapsed;
    track.current.lastX = x;
    track.current.lastT = now;
    const dx = x - track.current.x;
    const blocked = (dx < 0 && !place?.next) || (dx > 0 && !place?.previous);
    shift.setValue(blocked ? dx * 0.18 : dx);
  };

  const release = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - track.current.x;
    const speed = track.current.speed;
    if ((dx < -TRIGGER || speed < -FLING) && place?.next) go('next');
    else if ((dx > TRIGGER || speed > FLING) && place?.previous) go('previous');
    else settle();
  };

  const tilt = shift.interpolate({ inputRange: [-width, 0, width], outputRange: ['-7deg', '0deg', '7deg'] });

  return (
    <View>
      <Animated.View
        onTouchStart={(event) => {
          const { pageX, pageY, timestamp } = event.nativeEvent;
          track.current = { x: pageX, y: pageY, lastX: pageX, lastT: timestamp, speed: 0 };
        }}
        onMoveShouldSetResponderCapture={horizontal}
        onMoveShouldSetResponder={horizontal}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={settle}
        onResponderTerminationRequest={() => false}
        style={{ opacity: fade, transform: [{ translateX: shift }, { rotate: tilt }] }}
      >
        {children}
      </Animated.View>
      {place ? (
        <View style={styles.pager}>
          <Arrow icon="chevron-back" label="Previous card" disabled={!place.previous} onPress={() => go('previous')} />
          <Text style={styles.count}>{`${place.index + 1} of ${place.total}`}</Text>
          <Arrow icon="chevron-forward" label="Next card" disabled={!place.next} onPress={() => go('next')} />
        </View>
      ) : null}
    </View>
  );
}

function Arrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      scaleTo={0.85}
      hitSlop={10}
    >
      <Ionicons name={icon} size={18} color={disabled ? styles.off.color : styles.on.color} />
    </PressableScale>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingTop: spacing.xs,
    },
    count: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
      minWidth: 64,
      textAlign: 'center',
    },
    on: {
      color: theme.colors.text,
    },
    off: {
      color: theme.colors.textFaint,
    },
  });
}
