import { useLocalSearchParams, useRouter } from 'expo-router';

import { Chip } from '@/components/Chip';
import { CollectButton } from '@/components/CollectButton';
import { DetailLayout } from '@/components/DetailLayout';
import { DetailTitle } from '@/components/DetailTitle';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { OtherVersions } from '@/components/OtherVersions';
import { OwnedPanel } from '@/components/OwnedPanel';
import { ProductHero } from '@/components/ProductHero';
import { RefreshNotice } from '@/components/RefreshNotice';
import { SealedContents } from '@/components/SealedContents';
import { SealedFacts } from '@/components/SealedFacts';
import { SealedPricePanel } from '@/components/SealedPricePanel';
import { View3DButton } from '@/components/View3DButton';
import { useCollection } from '@/hooks/useCollection';
import { useEnglishVersions } from '@/hooks/useCrossLanguage';
import { useSealedDetail } from '@/hooks/useSealedDetail';
import { useSetLogo } from '@/hooks/useSetLogo';
import type { Market } from '@/types/sealed';
import { formatShortDate, parseDate } from '@/utils/date';
import { getSealedMarketPrice } from '@/utils/sealed';
import { classifySealed, SEALED_TYPE_LABEL } from '@/utils/sealedType';
import { productViewerParams } from '@/utils/viewer';

export default function SealedDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; groupId: string; market?: string }>();
  const market: Market = params.market === 'jp' ? 'jp' : 'en';
  const { product, owned, isFresh, error, retry } = useSealedDetail(Number(params.id), Number(params.groupId), market);
  const { addSealed, setQuantity, remove, setPaid } = useCollection();
  const englishVersions = useEnglishVersions(
    product && product.cardNumber && product.market === 'jp' ? product : null,
  );
  const logo = useSetLogo(product && (product.market ?? 'en') === 'en' ? product.setName : null);

  if (!product) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load this product" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message="Loading product…" />
        )}
      </DetailLayout>
    );
  }

  const viewerParams = productViewerParams(product);
  const open3d = viewerParams ? () => router.push({ pathname: '/viewer', params: viewerParams }) : undefined;
  const single = Boolean(product.cardNumber);
  const released = parseDate(product.productReleasedOn ?? product.releasedOn ?? product.setReleasedOn);
  const japanese = (product.market ?? 'en') === 'jp';

  return (
    <DetailLayout
      footer={<CollectButton owned={owned?.quantity ?? 0} onCollect={() => addSealed(product)} />}
    >
      <ProductHero product={product} onPress={open3d} />
      {open3d ? <View3DButton onPress={open3d} /> : null}
      <DetailTitle
        title={product.name}
        subtitle={single ? `${product.setName} · #${product.cardNumber}` : product.setName}
        logo={logo}
        logoLabel={product.setName}
        logoCaption={single ? `#${product.cardNumber}` : undefined}
        chips={
          <>
            <Chip
              label={single ? (product.rarity ?? 'Single card') : SEALED_TYPE_LABEL[classifySealed(product.name)]}
              tone="accent"
            />
            {japanese ? <Chip label="Japanese" /> : null}
            {released ? <Chip label={`Released ${formatShortDate(released)}`} /> : null}
          </>
        }
      />
      {!isFresh ? <RefreshNotice state={error ? 'failed' : 'refreshing'} onRetry={retry} /> : null}
      {owned ? (
        <OwnedPanel
          item={owned}
          currentPrice={getSealedMarketPrice(product)}
          onQuantityChange={(quantity) => setQuantity(owned.key, quantity)}
          onRemove={() => remove(owned.key)}
          onPaidChange={(paid) => setPaid(owned.key, paid)}
        />
      ) : null}
      <SealedPricePanel product={product} />
      {single && japanese ? <OtherVersions language="en" versions={englishVersions} /> : null}
      {single ? null : <SealedContents description={product.description} />}
      <SealedFacts product={product} />
    </DetailLayout>
  );
}
