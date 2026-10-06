import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

const BUBBLES = [
  { x: 78, y: 6, size: 92 },
  { x: 8, y: 18, size: 46 },
  { x: 62, y: 30, size: 28 },
  { x: 86, y: 46, size: 54 },
  { x: 14, y: 58, size: 70 },
  { x: 44, y: 74, size: 34 },
  { x: 74, y: 84, size: 22 },
];

export function AeroSky() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#46B8F2', '#8ED6FA', '#D6F2FF', '#EEFBFF']}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sun} />
      <View style={styles.sunCore} />
      <LinearGradient
        colors={['rgba(120,214,120,0)', 'rgba(120,214,120,0.18)', 'rgba(92,196,98,0.3)']}
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
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.75)',
    transform: [{ rotate: '-28deg' }],
  },
});
