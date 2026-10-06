import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import type { Legalities } from '@/types/card';

import { Chip } from './Chip';

type Props = {
  legalities: Legalities;
};

const FORMATS: [keyof Legalities, string][] = [
  ['standard', 'Standard'],
  ['expanded', 'Expanded'],
  ['unlimited', 'Unlimited'],
];

export function LegalityChips({ legalities }: Props) {
  return (
    <View style={styles.row}>
      {FORMATS.map(([key, label]) => {
        const status = legalities[key];
        const tone = status === 'Legal' ? 'gain' : status === 'Banned' ? 'loss' : 'neutral';
        const suffix = status === 'Legal' ? '✓' : status === 'Banned' ? 'banned' : '✕';
        return <Chip key={key} label={`${label} ${suffix}`} tone={tone} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
