import type { Card } from '@/types/card';
import { cardStage, formatCollectorNumber, isSecretRare } from '@/utils/card';
import { formatAge, formatDate, parseDate } from '@/utils/date';

import { FactRow } from './FactRow';
import { LegalityChips } from './LegalityChips';
import { SectionPanel } from './SectionPanel';

type Props = {
  card: Card;
};

export function CardFacts({ card }: Props) {
  const released = parseDate(card.set.releaseDate);
  const stage = cardStage(card);
  const setHint = [`${card.set.series} series`, card.set.ptcgoCode && `code ${card.set.ptcgoCode}`]
    .filter(Boolean)
    .join(' · ');
  const legalities = card.legalities ?? card.set.legalities;

  return (
    <SectionPanel title="Card facts" icon="information-circle">
      <FactRow label="Illustrator" value={card.artist ?? 'Not credited'} />
      {released ? <FactRow label="Released" value={formatDate(released)} hint={formatAge(released)} /> : null}
      <FactRow label="Set" value={card.set.name} hint={setHint} />
      <FactRow
        label="Number"
        value={`#${formatCollectorNumber(card)}`}
        hint={
          isSecretRare(card) && card.set.printedTotal
            ? `Secret rare, numbered past the set’s ${card.set.printedTotal} cards`
            : undefined
        }
      />
      {card.rarity ? <FactRow label="Rarity" value={card.rarity} /> : null}
      {card.regulationMark ? (
        <FactRow
          label="Regulation"
          value={`Mark ${card.regulationMark}`}
          hint="Decides when it rotates out of Standard"
        />
      ) : null}
      {card.nationalPokedexNumbers?.length ? (
        <FactRow
          label="Pokédex"
          value={card.nationalPokedexNumbers.map((number) => `#${String(number).padStart(4, '0')}`).join(', ')}
        />
      ) : null}
      {stage ? <FactRow label="Card type" value={stage} /> : null}
      {card.types?.length ? (
        <FactRow label="Energy type" value={card.types.join(' / ')} hint={card.hp ? `${card.hp} HP` : undefined} />
      ) : null}
      {card.evolvesFrom ? <FactRow label="Evolves from" value={card.evolvesFrom} /> : null}
      {card.evolvesTo?.length ? <FactRow label="Evolves into" value={card.evolvesTo.join(', ')} /> : null}
      {legalities ? <FactRow label="Tournament" value={<LegalityChips legalities={legalities} />} /> : null}
      <FactRow label="Database ID" value={card.id} />
    </SectionPanel>
  );
}
