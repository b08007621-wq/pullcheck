import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export function AuroraBackground() {
  const theme = useTheme();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
      {theme.auroraOpacity > 0 ? (
        <>
          <LinearGradient
            colors={theme.aurora}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: theme.auroraOpacity }]}
          />
          <LinearGradient
            colors={['transparent', theme.colors.background]}
            locations={[0.2, 0.8]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
    </View>
  );
}
