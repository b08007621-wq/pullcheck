import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  onPress: () => void;
};

export function GradeCheckButton({ onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Should I grade it? Check centering with your camera"
      scaleTo={0.98}
    >
      <GlassSurface interactive style={styles.row}>
        <View style={styles.badge}>
          <Ionicons name="ribbon-outline" size={20} color={styles.icon.color} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Should I grade it?</Text>
          <Text style={styles.detail}>Check centering with your camera and compare raw vs PSA prices</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={styles.chevron.color} />
      </GlassSurface>
    </PressableScale>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
    },
    badge: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.accent, 0.16),
    },
    icon: {
      color: theme.colors.accent,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.label,
      color: theme.colors.text,
    },
    detail: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    chevron: {
      color: theme.colors.textFaint,
    },
  });
}
