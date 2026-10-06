import { StyleSheet, View } from 'react-native';

import { energyColor } from '@/utils/energy';

type Props = {
  types: string[];
};

export function EnergyCost({ types }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`Costs ${types.join(', ')}`}>
      {types.map((type, index) => (
        <View key={`${type}-${index}`} style={[styles.dot, { backgroundColor: energyColor(type) }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
