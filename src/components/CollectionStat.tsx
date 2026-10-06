import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme';

type Props = {
  value: string;
  label: string;
};

export function CollectionStat({ value, label }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.caption,
    fontSize: 11,
  },
});
