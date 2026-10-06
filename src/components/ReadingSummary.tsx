import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import type { CardReading } from '@/types/identify';

import { Chip } from './Chip';

type Props = {
  reading: CardReading;
};

export function ReadingSummary({ reading }: Props) {
  const parts = [
    reading.name,
    reading.collectorNumber && `#${reading.collectorNumber}`,
    reading.setCode,
    reading.hp && `${reading.hp} HP`,
    reading.language && reading.language !== 'English' ? reading.language : '',
  ].filter((part): part is string => Boolean(part));

  return (
    <View style={styles.row}>
      {parts.map((part) => (
        <Chip key={part} label={part} />
      ))}
      <Chip
        label={`${reading.confidence} confidence`}
        tone={reading.confidence === 'high' ? 'gain' : reading.confidence === 'low' ? 'loss' : 'neutral'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
