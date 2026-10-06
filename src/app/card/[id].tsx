import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { CardFacts } from '@/components/CardFacts';
import { CardGameplay } from '@/components/CardGameplay';
import { CardHero } from '@/components/CardHero';
import { CardPricePanel } from '@/components/CardPricePanel';
import { Chip } from '@/components/Chip';
import { CollectButton } from '@/components/CollectButton';
import { DetailLayout } from '@/components/DetailLayout';
import { DetailTitle } from '@/components/DetailTitle';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MarketChart } from '@/components/MarketChart';
import { OtherVersions } from '@/components/OtherVersions';
import { OwnedPanel } from '@/components/OwnedPanel';
import { RefreshNotice } from '@/components/RefreshNotice';
import { View3DButton } from '@/components/View3DButton';
import { WishButton } from '@/components/WishButton';
import { WishPanel } from '@/components/WishPanel';
import { useCardDetail } from '@/hooks/useCardDetail';
import { useCollection } from '@/hooks/useCollection';
import { useJapaneseVersions } from '@/hooks/useCrossLanguage';
import { useWishlist } from '@/hooks/useWishlist';
import { estimatedPoints } from '@/services/marketHistory';
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
import { isBaseCard } from '@/utils/setProgress';
import { cardViewerParams } from '@/utils/viewer';

export default function CardDetailScreen() {
  const router = useRouter();
  const { id, entry } = useLocalSearchParams<{ id: string; entry?: string }>();
  const { card, owned, isFresh, error, retry } = useCardDetail(id ?? '');
  const japaneseVersions = useJapaneseVersions(card ?? null);
  const { items, addCard, setQuantity, remove, setPaid } = useCollection();
  const wishlist = useWishlist();
  const [picked, setPicked] = useState<CardVersion | null>(null);

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
  const marketUsd = versionPrice?.currency === 'USD' ? versionPrice.amount : null;

  return (
    <DetailLayout
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
          }}
        />
      }
    >
      <CardHero card={card} onPress={open3d} />
      <View3DButton onPress={open3d} />
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
      {shown ? (
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
      ) : null}
      {wish ? (
        <WishPanel
          wish={{ ...wish, card }}
          pickedVariant={version.variant}
          onTargetChange={(target) => wishlist.setTarget(card.id, target)}
          onVariantChange={(variant) => wishlist.setVariant(card.id, variant)}
        />
      ) : null}
      <MarketChart
        id={`${card.id}|${version.variant ?? '-'}`}
        usd={marketUsd}
        extra={matching?.history ?? []}
        estimated={version.variant === defaultVersion(card).variant && marketUsd !== null ? estimatedPoints(card, marketUsd) : []}
        source={{ kind: 'card', card, variant: version.variant ?? null }}
      />
      <CardPricePanel card={card} version={version} onVersionChange={setPicked} />
      <OtherVersions language="jp" versions={japaneseVersions} />
      <CardFacts card={card} />
      <CardGameplay card={card} />
    </DetailLayout>
  );
}
