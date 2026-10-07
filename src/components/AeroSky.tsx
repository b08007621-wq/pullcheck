import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

const BUBBLES = [
  { x: 80, y: 4, size: 88 },
  { x: 6, y: 14, size: 40 },
  { x: 64, y: 22, size: 24 },
  { x: 90, y: 30, size: 34 },
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
