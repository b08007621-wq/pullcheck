import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
};

export function DiscoverSection({ title, subtitle, children, scroll = true }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {scroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          style={styles.scroller}
          decelerationRate="fast"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm,
    },
    header: {
      gap: 2,
    },
    title: {
      ...typography.heading,
      fontSize: 19,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    scroller: {
      marginHorizontal: -spacing.lg,
    },
    row: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
  });
}
