import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

type Props = {
  trigger: number;
};

export function CaptureFlash({ trigger }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (trigger === 0) return;
    opacity.setValue(0.9);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [trigger, opacity]);

  return <Animated.View pointerEvents="none" style={[styles.flash, { opacity }]} />;
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
  },
});
