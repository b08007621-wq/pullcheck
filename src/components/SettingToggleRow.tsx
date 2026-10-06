import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { GlassSurface } from './GlassSurface';

type Props = {
  icon: IconName;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function SettingToggleRow({ icon, title, description, value, onChange }: Props) {
  const theme = useTheme();

  return (
    <GlassSurface style={styles.row}>
      <Ionicons name={icon} size={22} color={theme.colors.accent} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceRaised }}
        accessibilityLabel={title}
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
  },
  description: {
    ...typography.caption,
  },
});
