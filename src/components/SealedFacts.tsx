import type { SealedProduct } from '@/types/sealed';
import { formatAge, formatDate, parseDate } from '@/utils/date';
import { classifySealed, SEALED_TYPE_LABEL } from '@/utils/sealedType';

import { FactRow } from './FactRow';
import { SectionPanel } from './SectionPanel';

type Props = {
  product: SealedProduct;
};

const DAY = 24 * 60 * 60 * 1000;

export function SealedFacts({ product }: Props) {
  const setReleased = parseDate(product.setReleasedOn);
  const productReleased = parseDate(product.productReleasedOn ?? (setReleased ? null : product.releasedOn));
  const sameDay = setReleased && productReleased && Math.abs(setReleased.getTime() - productReleased.getTime()) < 2 * DAY;
  const single = Boolean(product.cardNumber);

  return (
    <SectionPanel title={single ? 'Card facts' : 'Product facts'} icon="information-circle">
      <FactRow
        label={single ? 'Card type' : 'Product type'}
        value={single ? 'Single card' : SEALED_TYPE_LABEL[classifySealed(product.name)]}
      />
      {single && product.rarity ? <FactRow label="Rarity" value={product.rarity} /> : null}
      {single && product.cardNumber ? <FactRow label="Number" value={`#${product.cardNumber}`} /> : null}
      <FactRow label="Language" value={product.market === 'jp' ? 'Japanese' : 'English'} />
      <FactRow label="Set" value={product.setName} hint={product.setCode ? `Set code ${product.setCode}` : undefined} />
      {setReleased ? (
        <FactRow label="Set released" value={formatDate(setReleased)} hint={formatAge(setReleased)} />
      ) : null}
      {productReleased && !sameDay ? (
        <FactRow
          label={single ? 'Released' : 'This product released'}
          value={formatDate(productReleased)}
          hint={setReleased ? `${formatAge(productReleased)} · after the set launched` : formatAge(productReleased)}
        />
      ) : null}
      {product.upc ? <FactRow label="UPC barcode" value={product.upc} /> : null}
      <FactRow label="TCGplayer ID" value={String(product.productId)} />
    </SectionPanel>
  );
}
