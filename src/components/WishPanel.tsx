import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { WishItem } from '@/types/wishlist';
import { versionLabel } from '@/utils/cardVersion';
import { formatMoney, getVariantOptions, percentChange, variantLabel } from '@/utils/price';
import { wishStatus } from '@/utils/wishlist';

import { EditableValue } from './EditableValue';
import { FactRow } from './FactRow';
import { MoneyEditor } from './MoneyEditor';
import { PriceChange } from './PriceChange';
import { SectionPanel } from './SectionPanel';

type Props = {
  wish: WishItem;
  pickedVariant: string | null;
  onTargetChange: (target: number | null) => void;
  onVariantChange: (variant: string | null) => void;
};

export function WishPanel({ wish, pickedVariant, onTargetChange, onVariantChange }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [editing, setEditing] = useState(false);
  const status = wishStatus(wish);
  const label = versionLabel(wish.card, { variant: wish.variant, condition: 'NM' });
  const canSwitch =
    pickedVariant !== null && pickedVariant !== wish.variant && getVariantOptions(wish.card).length > 1;
  const change = status.price !== null && wish.priceAtAdd ? percentChange(wish.priceAtAdd, status.price) : null;

  return (
    <SectionPanel title="On your wishlist" icon="heart">
      {status.hit ? (
        <View style={styles.hit}>
          <Ionicons name="pricetag" size={18} color={styles.hitText.color} />
          <Text style={styles.hitText}>Below your target. Now’s a good time to buy.</Text>
        </View>
      ) : null}
      {label ? <FactRow label="Watching" value={label} /> : null}
      {canSwitch && pickedVariant ? (
        <Pressable
          onPress={() => {
            haptics.selection();
            onVariantChange(pickedVariant);
          }}
          accessibilityRole="button"
          style={styles.switch}
        >
          <Text style={styles.switchText}>Watch {variantLabel(pickedVariant)} instead</Text>
        </Pressable>
      ) : null}
      <FactRow
        label="Price now"
        value={
          <View style={styles.now}>
            <Text style={styles.nowText}>{status.price !== null ? formatMoney(status.price) : 'No price yet'}</Text>
            {change !== null ? <PriceChange percent={change} prefix="since wished" /> : null}
          </View>
        }
      />
      <FactRow
        label="Target"
        value={
          <EditableValue
            value={wish.target !== null ? formatMoney(wish.target) : null}
            placeholder="Set target"
            accessibilityLabel={wish.target !== null ? `Target ${formatMoney(wish.target)}. Edit` : 'Set a target price'}
            onPress={() => setEditing(true)}
          />
        }
        hint={
          wish.target === null
            ? 'Get flagged when it drops'
            : status.hit
              ? `${formatMoney(Math.abs(status.gap ?? 0))} under your target`
              : status.gap !== null
                ? `${formatMoney(status.gap)} to go`
                : undefined
        }
      />
      {editing ? (
        <MoneyEditor
          initial={wish.target !== null ? { amount: wish.target, currency: 'USD' } : null}
          heading="Target price"
          message="We’ll flag this card when its market price drops to this or lower."
          onSave={(value) => {
            haptics.tap();
            onTargetChange(value?.amount ?? null);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    hit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.colors.gain,
    },
    hitText: {
      ...typography.label,
      fontSize: 14,
      flex: 1,
      color: theme.colors.gain,
    },
    switch: {
      alignSelf: 'flex-end',
      marginTop: -spacing.sm,
    },
    switchText: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    now: {
      alignItems: 'flex-end',
      gap: 2,
    },
    nowText: {
      ...typography.label,
      fontSize: 16,
      color: theme.colors.price,
    },
    target: {
      ...typography.label,
      fontSize: 15,
      textAlign: 'right',
      color: theme.colors.text,
    },
    targetEmpty: {
      color: theme.colors.accent,
    },
  });
}
