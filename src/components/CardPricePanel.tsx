import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import type { Card } from '@/types/card';
import { type CardVersion, cardVersionPrice } from '@/utils/cardVersion';
import { conditionNote } from '@/utils/condition';
import { formatDate, parseDate } from '@/utils/date';
import { getCardmarketRows, getTcgPlayerVariants, priceLabel } from '@/utils/price';

import { BigPrice } from './BigPrice';
import { CardVersionPicker } from './CardVersionPicker';
import { ExternalLinkButton } from './ExternalLinkButton';
import { PriceTable } from './PriceTable';
import { SectionPanel } from './SectionPanel';

type Props = {
  card: Card;
  version: CardVersion;
  onVersionChange: (version: CardVersion) => void;
};

export function CardPricePanel({ card, version, onVersionChange }: Props) {
  const price = cardVersionPrice(card, version);
  const variants = getTcgPlayerVariants(card);
  const cardmarketRows = getCardmarketRows(card.cardmarket?.prices);
  const tcgUpdated = parseDate(card.tcgplayer?.updatedAt);
  const cardmarketUpdated = parseDate(card.cardmarket?.updatedAt);
  const source = price
    ? `${price.source === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'} ${priceLabel(price).toLowerCase()}`
    : 'TCGplayer';
  const updated = price?.source === 'cardmarket' ? cardmarketUpdated : tcgUpdated;
  const note = conditionNote(version.condition);

  return (
    <SectionPanel title="Market value" icon="pricetag">
      <BigPrice
        price={price}
        caption={note ? `${note} · ${source}` : updated ? `${source} · updated ${formatDate(updated)}` : source}
        emptyMessage="No prices yet. Brand-new releases can take a few days to show up on the market."
      />
      <CardVersionPicker card={card} version={version} onChange={onVersionChange} />
      <View style={styles.tables}>
        {variants.map((variant) => (
          <PriceTable key={variant.variant} title={`TCGplayer · ${variant.label}`} rows={variant.rows} currency="USD" />
        ))}
        {cardmarketRows.length > 0 ? (
          <PriceTable
            title={cardmarketUpdated ? `Cardmarket (EU) · ${formatDate(cardmarketUpdated)}` : 'Cardmarket (EU)'}
            rows={cardmarketRows}
            currency="EUR"
          />
        ) : null}
      </View>
      {card.tcgplayer?.url ? <ExternalLinkButton label="View on TCGplayer" url={card.tcgplayer.url} /> : null}
    </SectionPanel>
  );
}

const styles = StyleSheet.create({
  tables: {
    gap: spacing.lg,
  },
});
