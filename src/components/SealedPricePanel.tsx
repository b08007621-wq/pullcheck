import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { SealedProduct } from '@/types/sealed';
import { getMsrp, MSRP_SOURCE_NOTE } from '@/utils/msrp';
import { formatMoney, percentChange, priceLabel } from '@/utils/price';
import { getSealedMarketPrice, getSealedPriceRows } from '@/utils/sealed';

import { BigPrice } from './BigPrice';
import { ExternalLinkButton } from './ExternalLinkButton';
import { FactRow } from './FactRow';
import { PriceChange } from './PriceChange';
import { PriceTable } from './PriceTable';
import { SectionPanel } from './SectionPanel';

type Props = {
  product: SealedProduct;
};

export function SealedPricePanel({ product }: Props) {
  const theme = useTheme();
  const price = getSealedMarketPrice(product);
  const msrp = getMsrp(product);
  const rows = getSealedPriceRows(product.prices);
  const premium = price && msrp ? percentChange(msrp.amount, price.amount) : null;

  return (
    <SectionPanel title="Market value" icon="pricetag">
      <BigPrice
        price={price}
        caption={price ? `TCGplayer ${priceLabel(price).toLowerCase()}` : 'TCGplayer'}
        emptyMessage="No listings or sales on TCGplayer yet for this product."
      />
      {msrp ? (
        <View style={styles.msrp}>
          <FactRow
            label="MSRP"
            value={
              <View style={styles.msrpValue}>
                <Text style={[styles.msrpAmount, { color: theme.colors.text }]}>{formatMoney(msrp.amount)}</Text>
                {premium !== null ? <PriceChange percent={premium} prefix="vs MSRP" /> : null}
              </View>
            }
            hint={msrp.eraLabel}
          />
          <Text style={[styles.note, { color: theme.colors.textFaint }]}>{MSRP_SOURCE_NOTE}</Text>
        </View>
      ) : (
        <Text style={[styles.note, { color: theme.colors.textFaint }]}>
          No MSRP on file for this product type or era.
        </Text>
      )}
      {rows.length > 0 ? <PriceTable title="TCGplayer listings" rows={rows} currency="USD" /> : null}
      <ExternalLinkButton label="View on TCGplayer" url={product.url} />
    </SectionPanel>
  );
}

const styles = StyleSheet.create({
  msrp: {
    gap: spacing.sm,
  },
  msrpValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  msrpAmount: {
    ...typography.label,
    fontSize: 16,
  },
  note: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
  },
});
