import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { CardAbility } from '@/types/card';

import { Chip } from './Chip';

type Props = {
  ability: CardAbility;
};

export function AbilityItem({ ability }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.item}>
      <View style={styles.header}>
        <Chip label={ability.type} tone="loss" />
        <Text style={[styles.name, { color: theme.colors.text }]}>{ability.name}</Text>
      </View>
      <Text style={[styles.text, { color: theme.colors.textMuted }]}>{ability.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.label,
    flex: 1,
  },
  text: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
