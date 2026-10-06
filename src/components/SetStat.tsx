import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, typography } from '@/theme';

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'gain';
};

export function SetStat({ label, value, hint, tone = 'default' }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === 'gain' && styles.gain]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    stat: {
      gap: 1,
    },
    label: {
      ...typography.caption,
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    value: {
      ...typography.label,
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textFaint,
    },
  });
}
