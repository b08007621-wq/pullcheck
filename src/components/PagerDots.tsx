import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type Props = {
  count: number;
  index: number;
};

export function PagerDots({ count, index }: Props) {
  const theme = useTheme();
  if (count < 2) return null;

  return (
    <View style={styles.row} accessibilityLabel={`${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, dot) => (
        <View
          key={dot}
          style={[
            styles.dot,
            dot === index
              ? { backgroundColor: theme.colors.text, width: 16 }
              : { backgroundColor: theme.colors.textFaint },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
