import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
};

export function FactRow({ label, value, hint }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <View style={styles.valueColumn}>
        {typeof value === 'string' ? (
          <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
        ) : (
          value
        )}
        {hint ? <Text style={[styles.hint, { color: theme.colors.textFaint }]}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    fontSize: 14,
    width: 112,
    paddingTop: 1,
  },
  valueColumn: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  value: {
    ...typography.label,
    fontSize: 15,
    textAlign: 'right',
  },
  hint: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'right',
  },
});
