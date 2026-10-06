import { StyleSheet } from 'react-native';

import { GlassSurface } from './GlassSurface';

export function TabBarBackground() {
  return <GlassSurface style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    borderWidth: 0,
  },
});
