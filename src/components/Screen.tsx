import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';

import { AuroraBackground } from './AuroraBackground';

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Screen({ title, action, children }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {action}
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
  });
}
