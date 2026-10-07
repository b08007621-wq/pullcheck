import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BINDER_STANDING } from '@/components/binderArt';
import { DetailLayout } from '@/components/DetailLayout';
import { PressableScale } from '@/components/PressableScale';
import { useBinders } from '@/hooks/useBinders';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import { slotKeys } from '@/utils/binderPages';
import { itemPrice } from '@/utils/collectionValue';
import { formatMoney } from '@/utils/price';

const GAP = spacing.md;

export default function BindersScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { binders, create } = useBinders();
  const { items } = useCollection();
  const byKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const tileWidth = Math.floor((Math.min(width, 640) - spacing.lg * 2 - GAP) / 2);

  const summaries = useMemo(
    () =>
      binders.map((binder) => {
        let count = 0;
        let value = 0;
        for (const key of slotKeys(binder)) {
          const item = byKey.get(key);
          if (!item) continue;
          count += 1;
          const price = itemPrice(item);
          if (price?.currency === 'USD') value += price.amount;
        }
        return { binder, count, value };
      }),
    [binders, byKey],
  );

  const open = (id: string) => {
    haptics.tap();
    router.push({ pathname: '/binder/[id]', params: { id } });
  };

  return (
    <DetailLayout>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Binders
        </Text>
        <Text style={styles.subtitle}>Nine pockets a page. Hold a card and drag it into a pocket.</Text>
      </View>
      <View style={styles.grid}>
        {summaries.map(({ binder, count, value }) => (
          <PressableScale
            key={binder.id}
            onPress={() => open(binder.id)}
            accessibilityRole="button"
            accessibilityLabel={`${binder.name}, ${count} cards`}
            style={[styles.tile, { width: tileWidth }]}
          >
            <Image source={BINDER_STANDING[binder.color]} style={styles.art} contentFit="contain" />
            <Text style={styles.name} numberOfLines={1}>
              {binder.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {`${count} ${count === 1 ? 'card' : 'cards'} · ${formatMoney(value, 'USD')}`}
            </Text>
          </PressableScale>
        ))}
        <PressableScale
          onPress={() => {
            haptics.collect();
            open(create());
          }}
          accessibilityRole="button"
          accessibilityLabel="New binder"
          style={[styles.tile, styles.newTile, { width: tileWidth }]}
        >
          <View style={styles.newIcon}>
            <Ionicons name="add" size={30} color={styles.newText.color} />
          </View>
          <Text style={styles.newText}>New binder</Text>
        </PressableScale>
      </View>
    </DetailLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    header: {
      gap: spacing.xs,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GAP,
    },
    tile: {
      padding: spacing.sm,
      paddingBottom: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 2,
    },
    art: {
      width: '100%',
      aspectRatio: 0.9,
    },
    name: {
      ...typography.label,
      color: theme.colors.text,
      paddingHorizontal: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
      paddingHorizontal: spacing.xs,
      fontVariant: ['tabular-nums'],
    },
    newTile: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 220,
      borderStyle: 'dashed',
      borderWidth: 1.5,
      borderColor: withAlpha(theme.colors.accent, 0.6),
      backgroundColor: withAlpha(theme.colors.accent, 0.06),
      gap: spacing.sm,
    },
    newIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.accent, 0.14),
    },
    newText: {
      ...typography.label,
      color: theme.colors.accent,
    },
  });
}
