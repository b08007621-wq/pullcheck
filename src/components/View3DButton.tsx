import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  onPress: () => void;
};

export function View3DButton({ onPress }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="View in 3D"
        hitSlop={6}
        scaleTo={0.94}
      >
        <GlassSurface interactive style={styles.pill}>
          <Ionicons name="cube-outline" size={16} color={theme.colors.accent} />
          <Text style={[styles.label, { color: theme.colors.text }]}>View in 3D</Text>
        </GlassSurface>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
});
