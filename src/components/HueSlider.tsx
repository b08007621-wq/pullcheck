import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { hsl, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: number;
  saturation: number;
  lightness: number;
  onChange: (hue: number) => void;
  onCommit: (hue: number) => void;
};

const TRACK_HEIGHT = 28;
const THUMB = 32;
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360];

export function HueSlider({ label, value, saturation, lightness, onChange, onCommit }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [width, setWidth] = useState(0);

  const hueAt = (event: GestureResponderEvent) => {
    if (width <= 0) return value;
    const x = Math.min(Math.max(event.nativeEvent.locationX, 0), width);
    return Math.round((x / width) * 359);
  };

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const color = hsl(value, saturation, lightness);
  const thumbLeft = width > 0 ? (value / 359) * width - THUMB / 2 : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <View style={[styles.swatch, { backgroundColor: color, borderColor: theme.colors.border }]} />
      </View>
      <View
        onLayout={onLayout}
        style={styles.track}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} color`}
        accessibilityValue={{ min: 0, max: 359, now: value }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          haptics.selection();
          onChange(hueAt(event));
        }}
        onResponderMove={(event) => onChange(hueAt(event))}
        onResponderRelease={(event) => {
          onCommit(hueAt(event));
          haptics.tap();
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={HUE_STOPS.map((hue) => hsl(hue, saturation, lightness)) as [string, string, ...string[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
        <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.label,
    fontSize: 15,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  track: {
    height: THUMB,
    justifyContent: 'center',
  },
  gradient: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
