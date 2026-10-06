import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { GlassSurface } from './GlassSurface';

type Props = {
  title: string;
  icon?: IconName;
  trailing?: ReactNode;
  children: ReactNode;
};

export function SectionPanel({ title, trailing, children }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      <GlassSurface style={styles.panel}>{children}</GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.heading,
  },
  trailing: {
    marginLeft: 'auto',
  },
  panel: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
