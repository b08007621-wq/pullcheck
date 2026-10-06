import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type Props = {
  height: number;
};

const BEAM = 90;

export function IdentifyingBeam({ height }: Props) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const sweep = (toValue: number) =>
      Animated.timing(progress, {
        toValue,
        duration: 1300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([sweep(1), sweep(0)]), { resetBeforeIteration: false });
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-BEAM / 2, height - BEAM / 2] });

  return (
    <Animated.View pointerEvents="none" style={[styles.beam, { transform: [{ translateY }] }]}>
      <LinearGradient
        colors={['transparent', `${theme.colors.accent}66`, 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', theme.colors.accent, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.line}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  beam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BEAM,
    justifyContent: 'center',
  },
  line: {
    height: 2,
  },
});
