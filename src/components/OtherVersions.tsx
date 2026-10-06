import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';
import { formatMoney, getMarketPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';
import { SectionPanel } from './SectionPanel';

type Props =
  | { language: 'jp'; versions: SealedProduct[] | null }
  | { language: 'en'; versions: Card[] | null };

const TILE = 104;
const CARD_RATIO = 63 / 88;

export function OtherVersions(props: Props) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const haptics = useHaptics();
  const title = props.language === 'jp' ? 'Japanese versions' : 'English versions';

  if (props.versions === null) {
    return (
      <SectionPanel title={title}>
        <Text style={styles.note}>Looking for matching cards…</Text>
      </SectionPanel>
    );
  }
  if (props.versions.length === 0) return null;

  const tiles =
    props.language === 'jp'
      ? props.versions.map((single) => ({
          key: `jp-${single.productId}`,
          image: single.imageUrl,
          set: single.setName,
          price: single.prices?.market ?? single.prices?.mid ?? null,
          open: () =>
            router.push({
              pathname: '/sealed/[id]',
              params: { id: String(single.productId), groupId: String(single.groupId), market: 'jp' },
            }),
        }))
      : props.versions.map((card) => {
          const price = getMarketPrice(card);
          return {
            key: `en-${card.id}`,
            image: card.images.small,
            set: card.set.name,
            price: price?.currency === 'USD' ? price.amount : null,
            open: () => router.push({ pathname: '/card/[id]', params: { id: card.id } }),
          };
        });

  return (
    <SectionPanel title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tiles.map((tile) => (
          <PressableScale
            key={tile.key}
            onPress={() => {
              haptics.tap();
              tile.open();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tile.set} version`}
            style={styles.tile}
          >
            <Image source={tile.image} style={styles.image} contentFit="contain" recyclingKey={tile.key} transition={150} />
            <Text style={styles.set} numberOfLines={1}>
              {tile.set}
            </Text>
            <Text style={styles.price}>{tile.price ? formatMoney(tile.price, 'USD') : '—'}</Text>
          </PressableScale>
        ))}
      </ScrollView>
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      gap: spacing.md,
    },
    tile: {
      width: TILE,
      gap: 2,
    },
    image: {
      width: TILE,
      height: TILE / CARD_RATIO,
      borderRadius: radius.sm - 2,
    },
    set: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    price: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    note: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
