import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';

import { FadeInView } from './FadeInView';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  delay?: number;
};

export function DiscoverSection({ title, subtitle, children, scroll = true, delay = 0 }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <FadeInView delay={delay} style={styles.section}>
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
    </FadeInView>
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
