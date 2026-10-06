import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { CardAttack } from '@/types/card';

import { EnergyCost } from './EnergyCost';

type Props = {
  attack: CardAttack;
};

export function AttackItem({ attack }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.item}>
      <View style={styles.header}>
        {attack.cost && attack.cost.length > 0 ? <EnergyCost types={attack.cost} /> : null}
        <Text style={[styles.name, { color: theme.colors.text }]}>{attack.name}</Text>
        {attack.damage ? (
          <Text style={[styles.damage, { color: theme.colors.accent }]}>{attack.damage}</Text>
        ) : null}
      </View>
      {attack.text ? (
        <Text style={[styles.text, { color: theme.colors.textMuted }]}>{attack.text}</Text>
      ) : null}
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
  damage: {
    ...typography.heading,
    fontSize: 18,
  },
  text: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
