import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme';

type Props = {
  quantity: number;
};

export function OwnedBadge({ quantity }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.badge}>
      <Ionicons name="checkmark-circle" size={13} color={theme.colors.gain} />
      <Text style={[styles.text, { color: theme.colors.textMuted }]}>
        {quantity > 1 ? `Owned ×${quantity}` : 'Owned'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 2,
  },
  text: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
  },
});
