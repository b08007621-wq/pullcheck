import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

type Props = {
  message: string;
  icon: IconName;
  tone?: 'neutral' | 'danger';
};

export function ScanHint({ message, icon, tone = 'neutral' }: Props) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.colors.danger : '#FFFFFF';

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={60} style={styles.pill}>
      <Ionicons name={icon} size={15} color={tone === 'danger' ? color : theme.colors.accent} />
      <Text style={[styles.text, { color }]} accessibilityLiveRegion="polite">
        {message}
      </Text>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
    maxWidth: '90%',
  },
  text: {
    ...typography.caption,
    fontSize: 14,
  },
});
