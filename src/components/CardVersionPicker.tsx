import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import type { Card } from '@/types/card';
import type { CardVersion } from '@/utils/cardVersion';
import { type Condition, CONDITIONS } from '@/utils/condition';
import { getVariantOptions, variantShortLabel } from '@/utils/price';

import { SegmentedControl } from './SegmentedControl';

type Props = {
  card: Card;
  version: CardVersion;
  onChange: (version: CardVersion) => void;
};

const CONDITION_OPTIONS = CONDITIONS.map((condition) => ({ value: condition, label: condition }));

export function CardVersionPicker({ card, version, onChange }: Props) {
  const variants = getVariantOptions(card).map((variant) => ({ value: variant, label: variantShortLabel(variant) }));

  return (
    <View style={styles.stack}>
      {variants.length > 1 && version.variant ? (
        <SegmentedControl
          options={variants}
          value={version.variant}
          onChange={(variant) => onChange({ ...version, variant })}
        />
      ) : null}
      <SegmentedControl<Condition>
        options={CONDITION_OPTIONS}
        value={version.condition}
        onChange={(condition) => onChange({ ...version, condition })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
});
