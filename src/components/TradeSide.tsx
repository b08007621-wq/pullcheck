import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/price';
import { type TradeLine, tradeTotals } from '@/utils/trade';

import { ActionButton } from './ActionButton';
import { QuantityStepper } from './QuantityStepper';
import { SectionPanel } from './SectionPanel';

type Props = {
  title: string;
  lines: TradeLine[];
  onAdd: () => void;
  onQuantity: (key: string, quantity: number) => void;
};

export function TradeSide({ title, lines, onAdd, onQuantity }: Props) {
  const styles = useThemedStyles(createStyles);
  const totals = tradeTotals(lines);

  return (
    <SectionPanel title={title} trailing={<Text style={styles.total}>{formatMoney(totals.totalUsd, 'USD')}</Text>}>
      {lines.map((line) => (
        <View key={line.key} style={styles.line}>
          {line.image ? <Image source={line.image} style={styles.image} contentFit="contain" /> : null}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {line.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {line.unit === null ? 'No USD price' : `${formatMoney(line.unit, 'USD')} each`}
            </Text>
          </View>
          <QuantityStepper
            value={line.quantity}
            onChange={(quantity) => onQuantity(line.key, quantity)}
            onRemoveRequest={() => onQuantity(line.key, 0)}
          />
        </View>
      ))}
      {totals.unpriced > 0 ? (
        <Text style={styles.warning}>{`${totals.unpriced} without a USD price aren’t counted.`}</Text>
      ) : null}
      <View style={styles.add}>
        <ActionButton label="Add cards" icon="add" variant="secondary" onPress={onAdd} />
      </View>
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    total: {
      ...typography.label,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    image: {
      width: 40,
      height: 56,
      borderRadius: radius.sm - 2,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.label,
      color: theme.colors.text,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    warning: {
      ...typography.caption,
      color: theme.colors.textMuted,
      paddingVertical: spacing.xs,
    },
    add: {
      paddingTop: spacing.sm,
      alignItems: 'flex-start',
    },
  });
}
