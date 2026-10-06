import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { ActionButton } from './ActionButton';
import { GlassSurface } from './GlassSurface';

type Props = {
  icon: IconName;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
    icon?: IconName;
  };
  tone?: 'neutral' | 'danger';
  bottomInset?: number;
  children?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  message,
  action,
  tone = 'neutral',
  bottomInset = 0,
  children,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const iconColor = tone === 'danger' ? theme.colors.danger : theme.colors.accent;

  return (
    <View style={[styles.container, { paddingBottom: spacing.xxl + bottomInset }]}>
      <GlassSurface style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={iconColor} />
      </GlassSurface>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? (
        <View style={styles.action}>
          <ActionButton label={action.label} onPress={action.onPress} icon={action.icon} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    iconWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: theme.colors.text,
      textAlign: 'center',
    },
    message: {
      ...typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    action: {
      marginTop: spacing.xl,
    },
  });
}
