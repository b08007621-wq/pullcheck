import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';

import { AeroSky } from './AeroSky';
import { BackdropPattern } from './BackdropPattern';

export function AuroraBackground() {
  const theme = useTheme();
  const { backdrop } = useSettings().settings;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
      {theme.gloss ? <AeroSky /> : null}
      {backdrop.kind === 'image' && backdrop.uri ? (
        <>
          <Image
            source={backdrop.uri}
            style={[StyleSheet.absoluteFill, { opacity: Math.min(1, backdrop.strength * 3.2) }]}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', theme.colors.background]}
            locations={[0.1, 0.95]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
      {backdrop.kind === 'preset' ? (
        <BackdropPattern
          preset={backdrop.preset}
          color={theme.colors.text}
          accent={theme.colors.accent}
          opacity={backdrop.strength}
        />
      ) : null}
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
