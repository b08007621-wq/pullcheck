import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useResource } from '@/hooks/useResource';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { baseCardName } from '@/services/crossLanguage';
import { japaneseLogo } from '@/services/japaneseLogos';
import { loadMarketHome, price } from '@/services/marketHome';
import type { ProductKind } from '@/services/sealedProducts';
import { displaySetName, type TcgcsvGroup } from '@/services/tcgcsv';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Market, SealedProduct } from '@/types/sealed';
import { formatMoney } from '@/utils/price';

import { DiscoverSection } from './DiscoverSection';
import { PressableScale } from './PressableScale';
import { ProductImage } from './ProductImage';

type Props = {
  market: Market;
  kind: ProductKind;
  children?: ReactNode;
  bottomInset: number;
};

const TILE = 120;
const CARD_RATIO = 63 / 88;

export function MarketHomeView({ market, kind, children, bottomInset }: Props) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const haptics = useHaptics();
  const load = useCallback(() => loadMarketHome(market, kind), [market, kind]);
  const { data, error, retry } = useResource(`home:${market}:${kind}`, load);
  const singles = kind === 'singles';

  const open = (product: SealedProduct) => {
    haptics.tap();
    router.push({
      pathname: '/sealed/[id]',
      params: { id: String(product.productId), groupId: String(product.groupId), market: product.market ?? market },
    });
  };

  const openSet = (group: TcgcsvGroup) => {
    haptics.tap();
    if (market === 'jp') router.push({ pathname: '/jpset/[id]', params: { id: String(group.groupId) } });
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing.xl }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {data ? (
        <>
          {data.sections.map((section, index) =>
            section.products.length > 0 ? (
              <DiscoverSection key={section.title} title={section.title} subtitle={section.subtitle} delay={index * 80}>
                {section.products.map((product) => (
                  <PressableScale
                    key={product.productId}
                    onPress={() => open(product)}
                    accessibilityRole="button"
                    accessibilityLabel={product.name}
                    style={styles.tile}
                  >
                    {singles ? (
                      <Image
                        source={product.imageUrl}
                        style={styles.card}
                        contentFit="contain"
                        recyclingKey={String(product.productId)}
                        transition={150}
                      />
                    ) : (
                      <View style={styles.box}>
                        <ProductImage product={product} size={360} style={styles.boxImage} />
                      </View>
                    )}
                    <Text style={styles.name} numberOfLines={1}>
                      {singles ? baseCardName(product.name) : product.name}
                    </Text>
                    <Text style={styles.price}>{formatMoney(price(product) ?? 0, 'USD')}</Text>
                  </PressableScale>
                ))}
              </DiscoverSection>
            ) : null,
          )}
          {market === 'jp' && data.sets.length > 0 ? (
            <DiscoverSection title="Latest sets" delay={240}>
              {data.sets.map((group) => {
                const logo = japaneseLogo(group);
                return (
                  <Pressable
                    key={group.groupId}
                    onPress={() => openSet(group)}
                    accessibilityRole="button"
                    accessibilityLabel={group.name}
                    style={styles.setTile}
                  >
                    <View style={styles.logoBox}>
                      {logo ? (
                        <Image source={logo} style={styles.logo} contentFit="contain" />
                      ) : (
                        <Text style={styles.code}>{group.abbreviation}</Text>
                      )}
                    </View>
                    <Text style={styles.name} numberOfLines={1}>
                      {displaySetName(group)}
                    </Text>
                  </Pressable>
                );
              })}
            </DiscoverSection>
          ) : null}
        </>
      ) : error ? (
        <Pressable onPress={retry} accessibilityRole="button">
          <Text style={styles.note}>Couldn’t load prices. Tap to retry.</Text>
        </Pressable>
      ) : (
        <View style={styles.placeholderRow}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.placeholder, singles ? styles.card : styles.box]} />
          ))}
        </View>
      )}
      <View style={styles.chips}>{children}</View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xl,
    },
    tile: {
      width: TILE,
      gap: 2,
    },
    card: {
      width: TILE,
      height: TILE / CARD_RATIO,
      borderRadius: radius.sm,
    },
    box: {
      width: TILE,
      height: TILE,
    },
    boxImage: {
      flex: 1,
    },
    name: {
      ...typography.caption,
      color: theme.colors.text,
    },
    price: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    setTile: {
      width: 140,
      gap: 4,
    },
    logoBox: {
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: theme.colors.surface,
      padding: spacing.sm,
    },
    logo: {
      width: '100%',
      height: '100%',
    },
    code: {
      ...typography.label,
      color: theme.colors.textMuted,
    },
    note: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    placeholderRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    placeholder: {
      backgroundColor: theme.colors.surface,
    },
    chips: {
      gap: spacing.md,
    },
  });
}
