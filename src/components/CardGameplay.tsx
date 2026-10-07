import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { Card, TypeModifier } from '@/types/card';
import { isOtherGame } from '@/utils/game';

import { AbilityItem } from './AbilityItem';
import { AttackItem } from './AttackItem';
import { EnergyCost } from './EnergyCost';
import { FactRow } from './FactRow';
import { SectionPanel } from './SectionPanel';

type Props = {
  card: Card;
};

export function CardGameplay({ card }: Props) {
  const theme = useTheme();
  const hasMoves = Boolean(card.abilities?.length || card.attacks?.length);
  const hasStats = Boolean(card.weaknesses?.length || card.resistances?.length || card.retreatCost?.length);
  const hasRules = Boolean(card.rules?.length);
  if (!hasMoves && !hasStats && !hasRules && !card.flavorText) return null;

  return (
    <SectionPanel title={isOtherGame(card) ? 'Card text' : 'Moves & rules'} icon="flash">
      {card.abilities?.map((ability) => <AbilityItem key={ability.name} ability={ability} />)}
      {card.attacks?.map((attack) => <AttackItem key={attack.name} attack={attack} />)}
      {hasStats ? (
        <View style={[styles.stats, { borderTopColor: theme.colors.border }]}>
          {card.weaknesses?.length ? <FactRow label="Weakness" value={formatModifiers(card.weaknesses)} /> : null}
          {card.resistances?.length ? <FactRow label="Resistance" value={formatModifiers(card.resistances)} /> : null}
          {card.retreatCost?.length ? (
            <FactRow label="Retreat" value={<EnergyCost types={card.retreatCost} />} />
          ) : null}
        </View>
      ) : null}
      {card.rules?.map((rule) => (
        <Text key={rule} style={[styles.rule, { color: theme.colors.textMuted }]}>
          {rule}
        </Text>
      ))}
      {card.flavorText ? (
        <View style={[styles.flavor, { borderLeftColor: theme.colors.accent }]}>
          <Text style={[styles.flavorText, { color: theme.colors.text }]}>“{card.flavorText}”</Text>
        </View>
      ) : null}
    </SectionPanel>
  );
}

function formatModifiers(modifiers: TypeModifier[]): string {
  return modifiers.map((modifier) => `${modifier.type} ${modifier.value}`).join(', ');
}

const styles = StyleSheet.create({
  stats: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rule: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  flavor: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    marginTop: spacing.xs,
  },
  flavorText: {
    ...typography.body,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
