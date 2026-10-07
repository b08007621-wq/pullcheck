import { useEffect, useState } from 'react';
import { Animated, Easing, type StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/theme';

type Props = {
  visible: boolean;
  variant?: 'pill' | 'dot';
  size?: 'small' | 'regular';
  style?: StyleProp<ViewStyle>;
};

export function NewBadge({ visible, variant = 'pill', size = 'regular', style }: Props) {
  const styles = useThemedStyles(createStyles);
  const [previous, setPrevious] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  if (visible !== previous) {
    setPrevious(visible);
    setLeaving(!visible);
  }

  useEffect(() => {
    if (!leaving) {
      progress.setValue(0);
      return;
    }
    const flight = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    flight.start(({ finished }) => {
      if (finished) setLeaving(false);
    });
    return () => flight.stop();
  }, [leaving, progress]);

  if (!visible && !leaving) return null;

  const motion = {
    opacity: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1, 1, 0] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 2, -22] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0.9, 1.35] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) },
    ],
  };

  if (variant === 'dot') {
    return <Animated.View style={[styles.dot, style, motion]} accessibilityLabel="New" />;
  }

  return (
    <Animated.View style={[styles.pill, size === 'small' && styles.pillSmall, style, motion]} accessibilityLabel="New">
      <Text style={[styles.text, size === 'small' && styles.textSmall]}>NEW</Text>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pill: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: theme.colors.gain,
    },
    pillSmall: {
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    text: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: theme.colors.background,
    },
    textSmall: {
      fontSize: 9,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.gain,
    },
  });
}
