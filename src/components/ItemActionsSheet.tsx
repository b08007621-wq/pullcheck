import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Binder, ChangeBasis, CollectionItem } from '@/types/collection';
import { BINDERS, itemBinder } from '@/utils/binder';
import { formatCollectorNumber } from '@/utils/card';
import { entryVersion, versionLabel } from '@/utils/cardVersion';
import { CHANGE_CAPTION, itemChange } from '@/utils/collectionChange';
import { itemPrice, itemTitle } from '@/utils/collectionValue';
import { formatMoney, formatPrice } from '@/utils/price';

import { ActionButton } from './ActionButton';
import { PressableScale } from './PressableScale';
import { PriceChange } from './PriceChange';
import { ProductImage } from './ProductImage';
import { SegmentedControl } from './SegmentedControl';
import { SheetModal } from './SheetModal';

type Props = {
  item: CollectionItem;
  basis: ChangeBasis;
  onOpen: (item: CollectionItem) => void;
  onEditPaid: (item: CollectionItem) => void;
  onGradeCheck: (item: CollectionItem) => void;
  onClose: () => void;
};

export function ItemActionsSheet({ item, basis, onOpen, onEditPaid, onGradeCheck, onClose }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const { items, setQuantity, setBinder, remove } = useCollection();
  const current = items.find((entry) => entry.key === item.key) ?? item;
  const price = itemPrice(current);
  const change = itemChange(current, basis);
  const subtitle =
    current.kind === 'card'
      ? [
          current.card.set.name,
          `#${formatCollectorNumber(current.card)}`,
          current.grading ? `${current.grading.company} ${current.grading.grade}` : versionLabel(current.card, entryVersion(current), 'short'),
        ]
          .filter(Boolean)
          .join(' · ')
      : current.product.setName;

  const confirmRemove = () => {
    Alert.alert('Remove from collection?', `${itemTitle(current)} will be taken out of your collection.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptics.remove();
          remove(current.key);
          onClose();
        },
      },
    ]);
  };

  const step = (delta: number) => {
    const next = current.quantity + delta;
    if (next <= 0) {
      confirmRemove();
      return;
    }
    haptics.selection();
    setQuantity(current.key, next);
  };

  return (
    <SheetModal onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.thumb}>
          {current.kind === 'card' ? (
            <Image source={current.card.images.small} style={styles.fill} contentFit="contain" />
          ) : (
            <ProductImage product={current.product} size={160} style={styles.fill} />
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {itemTitle(current)}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{price ? formatPrice(price) : 'No price'}</Text>
            {change && change.percent !== null ? (
              <PriceChange percent={change.percent} prefix={CHANGE_CAPTION[change.basis]} />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Copies</Text>
        <View style={styles.stepper}>
          <StepButton icon="remove" label="One fewer" onPress={() => step(-1)} />
          <Text style={styles.count}>{current.quantity}</Text>
          <StepButton icon="add" label="One more" onPress={() => step(1)} />
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Binder</Text>
        <SegmentedControl
          options={BINDERS}
          value={itemBinder(current)}
          onChange={(binder: Binder) => setBinder(current.key, binder)}
        />
      </View>

      <Pressable
        onPress={() => onEditPaid(current)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, styles.tappable, pressed && styles.pressed]}
      >
        <Text style={styles.label}>Price paid</Text>
        <View style={styles.paid}>
          <Text style={styles.paidValue}>
            {current.paid ? formatMoney(current.paid.amount, current.paid.currency) : 'Add'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={styles.chevron.color} />
        </View>
      </Pressable>

      {current.kind === 'card' && !current.grading ? (
        <Pressable
          onPress={() => onGradeCheck(current)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, styles.tappable, pressed && styles.pressed]}
        >
          <Text style={styles.label}>Should I grade it?</Text>
          <View style={styles.paid}>
            <Text style={styles.paidValue}>Check centering</Text>
            <Ionicons name="chevron-forward" size={16} color={styles.chevron.color} />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.flex}>
          <ActionButton label="Open" icon="open-outline" variant="secondary" onPress={() => onOpen(current)} />
        </View>
        <View style={styles.flex}>
          <PressableScale onPress={confirmRemove} accessibilityRole="button" accessibilityLabel="Remove" scaleTo={0.97}>
            <View style={styles.remove}>
              <Ionicons name="trash-outline" size={18} color={styles.removeText.color} />
              <Text style={styles.removeText}>Remove</Text>
            </View>
          </PressableScale>
        </View>
      </View>
    </SheetModal>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.9} hitSlop={6}>
      <View style={styles.stepButton}>
        <Ionicons name={icon} size={20} color={styles.stepIcon.color} />
      </View>
    </PressableScale>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    thumb: {
      width: 64,
      height: 89,
      borderRadius: radius.sm,
      overflow: 'hidden',
    },
    fill: {
      width: '100%',
      height: '100%',
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.heading,
      fontSize: 18,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: 2,
    },
    price: {
      ...typography.label,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    tappable: {
      borderRadius: radius.md,
      marginHorizontal: -spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    block: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    stepButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceRaised,
    },
    stepIcon: {
      color: theme.colors.text,
    },
    count: {
      ...typography.heading,
      minWidth: 28,
      textAlign: 'center',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    paid: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    paidValue: {
      ...typography.body,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    chevron: {
      color: theme.colors.textFaint,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    flex: {
      flex: 1,
    },
    remove: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs + 2,
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surfaceRaised,
    },
    removeText: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.danger,
    },
  });
}
