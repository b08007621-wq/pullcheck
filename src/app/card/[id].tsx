import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardFacts } from '@/components/CardFacts';
import { CardGameplay } from '@/components/CardGameplay';
import { CardHero } from '@/components/CardHero';
import { CardPricePanel } from '@/components/CardPricePanel';
import { CardSwipe, type SwipeDirection } from '@/components/CardSwipe';
import { Chip } from '@/components/Chip';
import { CollectButton } from '@/components/CollectButton';
import { DetailBoard } from '@/components/DetailBoard';
import { DetailLayout } from '@/components/DetailLayout';
import { DetailTitle } from '@/components/DetailTitle';
import { ErrorState } from '@/components/ErrorState';
import type { BoardWidget } from '@/components/FreeBoard';
import { LoadingState } from '@/components/LoadingState';
import { GradeCheckButton } from '@/components/GradeCheckButton';
import { GradedPanel } from '@/components/GradedPanel';
import { MarketChart } from '@/components/MarketChart';
import { OtherVersions } from '@/components/OtherVersions';
import { OwnedPanel } from '@/components/OwnedPanel';
import { RefreshNotice } from '@/components/RefreshNotice';
import { View3DButton } from '@/components/View3DButton';
import { WishButton } from '@/components/WishButton';
import { WishPanel } from '@/components/WishPanel';
import { useCardDetail } from '@/hooks/useCardDetail';
import { useCelebrate } from '@/hooks/useCelebrate';
import { useCollection } from '@/hooks/useCollection';
import { useJapaneseVersions } from '@/hooks/useCrossLanguage';
import { useGradedPrices } from '@/hooks/useGradedPrices';
import { useHaptics } from '@/hooks/useHaptics';
import { useWishlist } from '@/hooks/useWishlist';
import { type BrowsePlace, browsePlace } from '@/services/cardBrowse';
import { gradedPriceFor } from '@/services/graded';
import { queueSeen } from '@/services/seen';
import { estimatedPoints } from '@/services/marketHistory';
import { spacing } from '@/theme';
import { formatCollectorNumber, isSecretRare } from '@/utils/card';
import {
  cardVersionPrice,
  type CardVersion,
  defaultVersion,
  entryVersion,
  resolveVersion,
  sameVersion,
  versionLabel,
} from '@/utils/cardVersion';
import { itemPrice } from '@/utils/collectionValue';
import { getMarketPrice } from '@/utils/price';
import { isBaseCard } from '@/utils/setProgress';
import { cardViewerParams } from '@/utils/viewer';

export default function CardDetailScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { id, entry, from } = useLocalSearchParams<{ id: string; entry?: string; from?: string }>();
  const place = browsePlace(id ?? '', entry);

  const go = (direction: SwipeDirection) => {
    const stop = direction === 'next' ? place?.next : place?.previous;
    if (!stop) return;
    haptics.selection();
    router.setParams({ id: stop.id, entry: stop.entry ?? '', from: direction });
  };

  return (
    <CardPage
      key={`${id ?? ''}|${entry ?? ''}`}
      id={id ?? ''}
      entry={entry || undefined}
      place={place}
      enterFrom={from === 'next' || from === 'previous' ? from : null}
      onGo={go}
    />
  );
}

type PageProps = {
  id: string;
  entry?: string;
  place: BrowsePlace | null;
  enterFrom: SwipeDirection | null;
  onGo: (direction: SwipeDirection) => void;
};

function CardPage({ id, entry, place, enterFrom, onGo }: PageProps) {
  const router = useRouter();
  const { card, owned, isFresh, error, retry } = useCardDetail(id);
  const japaneseVersions = useJapaneseVersions(card ?? null);
  const { items, addCard, setQuantity, remove, setPaid, setGrading } = useCollection();
  const graded = useGradedPrices(card ?? null);
  const wishlist = useWishlist();
  const { celebrate } = useCelebrate();
  const [picked, setPicked] = useState<CardVersion | null>(null);

  useEffect(() => {
    queueSeen(owned.map((item) => item.key));
  }, [owned]);

  useEffect(() => {
    if (!graded || graded.prices.length === 0) return;
    for (const item of owned) {
      if (item.kind !== 'card' || !item.grading || item.grading.value) continue;
      const value = gradedPriceFor(graded.prices, item.grading.company, item.grading.grade);
      if (value) setGrading(item.key, { ...item.grading, value });
    }
  }, [graded, owned, setGrading]);

  if (!card) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load this card" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message="Loading card…" />
        )}
      </DetailLayout>
    );
  }

  const initial = owned.find((item) => item.key === entry) ?? owned[0] ?? null;
  const version = resolveVersion(card, picked ?? (initial ? entryVersion(initial) : defaultVersion(card)));
  const matching = owned.find((item) => sameVersion(entryVersion(item), version)) ?? null;
  const shown = matching ?? initial;
  const wish = wishlist.items.find((item) => item.id === card.id) ?? null;
  const setTotal = card.set.printedTotal && card.set.printedTotal > 0 ? card.set.printedTotal : card.set.total;
  const setOwned = new Set(
    items.flatMap((item) =>
      item.kind === 'card' && item.card.set.id === card.set.id && isBaseCard(item.card, setTotal) ? [item.card.id] : [],
    ),
  ).size;
  const open3d = () => router.push({ pathname: '/viewer', params: cardViewerParams(card, version.variant) });
  const versionPrice = cardVersionPrice(card, version);
  const anyPrice = getMarketPrice(card);
  const marketUsd =
    versionPrice?.currency === 'USD' ? versionPrice.amount : anyPrice?.currency === 'USD' ? anyPrice.amount : null;

  const widgets: BoardWidget[] = [
    {
      key: 'hero',
      label: 'Card picture',
      resize: 'width',
      node: (
        <View style={styles.stack}>
          <CardSwipe place={place} enterFrom={enterFrom} onGo={onGo}>
            <CardHero card={card} onPress={open3d} />
          </CardSwipe>
          <View3DButton onPress={open3d} />
        </View>
      ),
    },
    {
      key: 'title',
      label: 'Name and set',
      node: (
        <View style={styles.stack}>
          <DetailTitle
            title={card.name}
            subtitle={`${card.set.name} · #${formatCollectorNumber(card)}`}
            logo={card.set.images.logo}
            logoLabel={card.set.name}
            logoCaption={`#${formatCollectorNumber(card)} · ${card.set.series}`}
            logoAction={setOwned > 0 ? `${setOwned} of ${setTotal} in this set` : 'See the whole set'}
            onLogoPress={() => router.push({ pathname: '/set/[id]', params: { id: card.set.id } })}
            chips={
              <>
                {card.rarity ? <Chip label={card.rarity} tone="accent" /> : null}
                {card.printing ? <Chip label={card.printing} tone="gain" /> : null}
                {isSecretRare(card) ? <Chip label="Secret rare" tone="gain" /> : null}
                {card.regulationMark ? <Chip label={`Reg. ${card.regulationMark}`} /> : null}
                {card.hp ? <Chip label={`${card.hp} HP`} /> : null}
              </>
            }
          />
          {!isFresh ? <RefreshNotice state={error ? 'failed' : 'refreshing'} onRetry={retry} /> : null}
        </View>
      ),
    },
    {
      key: 'owned',
      label: 'Your copies',
      node: shown ? (
        <OwnedPanel
          item={shown}
          currentPrice={itemPrice({ ...shown, card })}
          versionLabel={versionLabel(card, entryVersion(shown))}
          versions={owned.map((item) => ({
            key: item.key,
            label: versionLabel(card, entryVersion(item), 'short') ?? entryVersion(item).condition,
            quantity: item.quantity,
          }))}
          onSelectVersion={(key) => {
            const next = owned.find((item) => item.key === key);
            if (next) setPicked(entryVersion(next));
          }}
          onQuantityChange={(quantity) => setQuantity(shown.key, quantity)}
          onRemove={() => remove(shown.key)}
          onPaidChange={(paid) => setPaid(shown.key, paid)}
        />
      ) : null,
    },
    {
      key: 'wish',
      label: 'Wishlist target',
      node: wish ? (
        <WishPanel
          wish={{ ...wish, card }}
          pickedVariant={version.variant}
          onTargetChange={(target) => wishlist.setTarget(card.id, target)}
          onVariantChange={(variant) => wishlist.setVariant(card.id, variant)}
        />
      ) : null,
    },
    {
      key: 'market',
      label: 'Market chart',
      stretch: true,
      node: ({ heightScale }) => (
        <MarketChart
          id={`${card.id}|${version.variant ?? '-'}`}
          usd={marketUsd}
          extra={matching?.history ?? []}
          estimated={version.variant === defaultVersion(card).variant && marketUsd !== null ? estimatedPoints(card, marketUsd) : []}
          source={{ kind: 'card', card, variant: version.variant ?? null }}
          chartHeight={Math.round(120 * heightScale)}
        />
      ),
    },
    {
      key: 'graded',
      label: 'Graded prices',
      node: <GradedPanel prices={graded?.prices ?? null} limitedUntil={graded?.limitedUntil ?? null} />,
    },
    {
      key: 'grade',
      label: 'Should I grade it?',
      node: (
        <GradeCheckButton
          onPress={() =>
            router.push({
              pathname: '/centering',
              params: version.variant ? { id: card.id, variant: version.variant } : { id: card.id },
            })
          }
        />
      ),
    },
    {
      key: 'prices',
      label: 'Prices by version',
      node: <CardPricePanel card={card} version={version} onVersionChange={setPicked} />,
    },
    { key: 'versions', label: 'Japanese versions', node: <OtherVersions language="jp" versions={japaneseVersions} /> },
    { key: 'facts', label: 'Card details', node: <CardFacts card={card} /> },
    { key: 'gameplay', label: 'Attacks & abilities', node: <CardGameplay card={card} /> },
  ];

  return (
    <DetailBoard
      id="card"
      widgets={widgets}
      topRight={
        <WishButton
          wished={wish !== null}
          onToggle={() => (wish ? wishlist.remove(card.id) : wishlist.add(card, version.variant))}
        />
      }
      footer={
        <CollectButton
          owned={matching?.quantity ?? 0}
          detail={versionLabel(card, version)}
          onCollect={() => {
            addCard(card, version);
            wishlist.fulfill([card.id]);
            const price = cardVersionPrice(card, version);
            celebrate({ image: card.images.large || card.images.small, amount: price?.currency === 'USD' ? price.amount : null });
          }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
});
