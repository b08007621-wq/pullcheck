import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { type AppTheme, radius, spacing, typography } from '@/theme';

type Props = {
  theme: AppTheme;
  compact?: boolean;
};

export function ThemePreview({ theme, compact = false }: Props) {
  const { colors } = theme;

  return (
    <View style={[styles.frame, compact ? styles.compact : styles.full, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={theme.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: theme.gloss ? 1 : theme.auroraOpacity }]}
      />
      <LinearGradient
        colors={['transparent', colors.background]}
        locations={[0.2, 1]}
        style={StyleSheet.absoluteFill}
      />
      {compact ? null : (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {theme.name}
        </Text>
      )}
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.thumb, { backgroundColor: colors.surfaceRaised }]}>
          <LinearGradient colors={theme.gradient} style={styles.thumbArt} />
        </View>
        <View style={styles.rowText}>
          <View style={[styles.line, { backgroundColor: colors.text, width: '70%' }]} />
          <View style={[styles.line, styles.lineSmall, { backgroundColor: colors.textMuted, width: '45%' }]} />
        </View>
        {compact ? null : <Text style={[styles.price, { color: colors.price }]}>$342.73</Text>}
      </View>
      <View style={styles.footer}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.button, compact && styles.buttonCompact]}
        >
          {compact ? null : <Text style={[styles.buttonText, { color: colors.onAccent }]}>Add to collection</Text>}
        </LinearGradient>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  full: {
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 190,
  },
  compact: {
    padding: spacing.sm,
    gap: 6,
    height: 104,
  },
  title: {
    ...typography.heading,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 26,
    height: 36,
    borderRadius: 4,
    padding: 3,
  },
  thumbArt: {
    flex: 1,
    borderRadius: 2,
  },
  rowText: {
    flex: 1,
    gap: 5,
  },
  line: {
    height: 6,
    borderRadius: 3,
  },
  lineSmall: {
    opacity: 0.7,
  },
  price: {
    ...typography.label,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    height: 12,
  },
  buttonText: {
    ...typography.label,
    fontSize: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
