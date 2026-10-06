import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { CollectionItem, PaidPrice } from '@/types/collection';
import { itemProfit, itemTitle } from '@/utils/collectionValue';
import { daysSince, formatDateTime, formatRelativeTime, parseDate } from '@/utils/date';
import { formatMoney, formatPrice, type MarketPrice, percentChange } from '@/utils/price';

import { BINDERS, itemBinder } from '@/utils/binder';

import { ActionButton } from './ActionButton';
import { EditableValue } from './EditableValue';
import { FactRow } from './FactRow';
import { MoneyEditor } from './MoneyEditor';
import { type OwnedVersion, OwnedVersionTabs } from './OwnedVersionTabs';
import { PriceChange } from './PriceChange';
import { PriceHistoryChart } from './PriceHistoryChart';
import { QuantityStepper } from './QuantityStepper';
import { SegmentedControl } from './SegmentedControl';
import { SectionPanel } from './SectionPanel';

type Props = {
  item: CollectionItem;
  currentPrice: MarketPrice | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onPaidChange: (paid: PaidPrice | null) => void;
  versionLabel?: string | null;
  versions?: OwnedVersion[];
  onSelectVersion?: (key: string) => void;
};

export function OwnedPanel({
  item,
  currentPrice,
  onQuantityChange,
  onRemove,
  onPaidChange,
  versionLabel,
  versions = [],
  onSelectVersion,
}: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { meta, setBinder } = useCollection();
  const [editingPaid, setEditingPaid] = useState(false);
  const profit = itemProfit(item);
  const addedAt = parseDate(item.addedAt);
  const lastAddedAt = parseDate(item.lastAddedAt);
  const days = addedAt ? daysSince(addedAt) : 0;
  const change =
    item.priceAtAdd && currentPrice && item.priceAtAdd.currency === currentPrice.currency
      ? percentChange(item.priceAtAdd.amount, currentPrice.amount)
      : null;

  const confirmRemove = () => {
    const name = versionLabel ? `${itemTitle(item)} (${versionLabel})` : itemTitle(item);
    Alert.alert('Remove from collection?', `${name} will be removed with all its copies.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptics.remove();
          onRemove();
        },
      },
    ]);
  };

  return (
    <SectionPanel title="In your collection" icon="sparkles">
      {versions.length > 1 && onSelectVersion ? (
        <OwnedVersionTabs versions={versions} selectedKey={item.key} onSelect={onSelectVersion} />
      ) : versionLabel ? (
        <FactRow label="Version" value={versionLabel} />
      ) : null}
      {addedAt ? (
        <FactRow
          label="Registered"
          value={formatDateTime(addedAt)}
          hint={days === 0 ? 'Added today' : `${days} ${days === 1 ? 'day' : 'days'} in your collection`}
        />
      ) : null}
      {lastAddedAt && item.quantity > 1 && item.lastAddedAt !== item.addedAt ? (
        <FactRow label="Latest copy" value={formatDateTime(lastAddedAt)} />
      ) : null}
      <FactRow
        label="Copies"
        value={
          <QuantityStepper value={item.quantity} onChange={onQuantityChange} onRemoveRequest={confirmRemove} />
        }
      />
      <View style={styles.binder}>
        <SegmentedControl options={BINDERS} value={itemBinder(item)} onChange={(value) => setBinder(item.key, value)} />
      </View>
      <FactRow
        label="You paid"
        value={
          <EditableValue
            value={item.paid ? `${formatMoney(item.paid.amount, item.paid.currency)} each` : null}
            placeholder="Add price"
            accessibilityLabel={
              item.paid
                ? `You paid ${formatMoney(item.paid.amount, item.paid.currency)} per copy. Edit`
                : 'Add what you paid'
            }
            onPress={() => setEditingPaid(true)}
          />
        }
        hint={item.paid ? undefined : 'Track your profit or loss'}
      />
      {profit ? (
        <FactRow
          label="Profit"
          value={
            <View style={styles.nowValue}>
              <Text style={[styles.now, { color: profit.amount >= 0 ? theme.colors.gain : theme.colors.loss }]}>
                {profit.amount >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(profit.amount), profit.currency)}
              </Text>
              {profit.percent !== null ? <PriceChange percent={profit.percent} /> : null}
            </View>
          }
          hint={item.quantity > 1 ? `Across all ${item.quantity} copies` : undefined}
        />
      ) : null}
      <FactRow
        label="When registered"
        value={item.priceAtAdd ? formatPrice(item.priceAtAdd) : 'No price yet'}
        hint="Market price per copy on the day you added it"
      />
      {currentPrice ? (
        <FactRow
          label="Worth now"
          value={
            <View style={styles.nowValue}>
              <Text style={[styles.now, { color: theme.colors.price }]}>{formatPrice(currentPrice)}</Text>
              {change !== null ? <PriceChange percent={change} /> : null}
            </View>
          }
          hint={
            meta.pricesAsOf
              ? `TCGplayer updates once a day · last update ${formatRelativeTime(meta.pricesAsOf)}`
              : 'TCGplayer updates prices once a day'
          }
        />
      ) : null}
      {currentPrice && item.quantity > 1 ? (
        <FactRow
          label="All copies"
          value={formatMoney(currentPrice.amount * item.quantity, currentPrice.currency)}
        />
      ) : null}
      <View style={[styles.history, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.historyTitle, { color: theme.colors.textMuted }]}>Price since you added it</Text>
        <PriceHistoryChart
          points={item.history ?? []}
          currency={currentPrice?.currency ?? item.priceAtAdd?.currency ?? 'USD'}
          emptyMessage="The chart fills in as prices refresh. Open your Collection on another day to see the trend."
        />
      </View>
      <View style={styles.remove}>
        <ActionButton label="Remove from collection" icon="trash-outline" variant="secondary" onPress={confirmRemove} />
      </View>
      {editingPaid ? (
        <MoneyEditor
          initial={item.paid ?? null}
          heading="What did you pay?"
          message={`Price per copy of ${itemTitle(item)}. Used to show your profit or loss.`}
          onSave={(paid) => {
            haptics.tap();
            onPaidChange(paid);
          }}
          onClose={() => setEditingPaid(false)}
        />
      ) : null}
    </SectionPanel>
  );
}

const styles = StyleSheet.create({
  binder: {
    paddingVertical: spacing.sm,
  },
  nowValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  now: {
    ...typography.label,
    fontSize: 16,
  },
  paid: {
    ...typography.label,
    fontSize: 15,
    textAlign: 'right',
  },
  history: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyTitle: {
    ...typography.caption,
  },
  remove: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },
});
