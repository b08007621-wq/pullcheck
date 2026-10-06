import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme';
import { formatPercent } from '@/utils/price';

type Props = {
  percent: number;
  prefix?: string;
};

export function PriceChange({ percent, prefix }: Props) {
  const theme = useTheme();
  const flat = Math.abs(percent) < 0.05;
  const color = flat ? theme.colors.textMuted : percent > 0 ? theme.colors.gain : theme.colors.loss;
  const icon = flat ? 'remove' : percent > 0 ? 'trending-up' : 'trending-down';

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.text, { color }]}>
        {prefix ? <Text style={[styles.prefix, { color: theme.colors.textFaint }]}>{prefix} </Text> : null}
        {flat ? '0%' : formatPercent(percent)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
  },
  prefix: {
    fontWeight: '500',
  },
});
