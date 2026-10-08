import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

const BUBBLES = [
  { x: 80, y: 4, size: 88 },
  { x: 6, y: 14, size: 40 },
  { x: 64, y: 22, size: 24 },
  { x: 90, y: 30, size: 34 },
];

const DAY = {
  sky: ['#46B8F2', '#8ED6FA', '#D6F2FF', '#EEFBFF'],
  meadow: ['rgba(120,214,120,0)', 'rgba(120,214,120,0.18)', 'rgba(92,196,98,0.3)'],
  sun: 1,
} as const;

const NIGHT = {
  sky: ['#010812', '#031A33', '#06305C', '#0B5A9E'],
  meadow: ['rgba(20,120,200,0)', 'rgba(20,120,200,0.12)', 'rgba(30,150,230,0.26)'],
  sun: 0.32,
} as const;

export function AeroSky() {
  const theme = useTheme();
  const palette = theme.mode === 'dark' ? NIGHT : DAY;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={palette.sky} locations={[0, 0.3, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.sun, { opacity: palette.sun }]} />
      <View style={[styles.sunCore, { opacity: palette.sun }]} />
      <LinearGradient
        colors={palette.meadow}
        locations={[0, 0.6, 1]}
        style={styles.meadow}
      />
      {BUBBLES.map((bubble) => (
        <View
          key={`${bubble.x}-${bubble.y}`}
          style={[
            styles.bubble,
            {
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
            },
          ]}
        >
          <View
            style={[
              styles.shine,
              {
                width: bubble.size * 0.42,
                height: bubble.size * 0.22,
                borderRadius: bubble.size,
                left: bubble.size * 0.16,
                top: bubble.size * 0.12,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sun: {
    position: 'absolute',
    top: -160,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  sunCore: {
    position: 'absolute',
    top: -90,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  meadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '-28deg' }],
  },
});
