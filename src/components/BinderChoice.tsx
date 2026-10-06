import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography, withAlpha } from '@/theme';
import type { Binder } from '@/types/collection';
import type { IconName } from '@/types/icon';
import { BINDERS } from '@/utils/binder';

import { PressableScale } from './PressableScale';

type Props = {
  onPick: (binder: Binder) => void;
};

const ICONS: Record<Binder, IconName> = {
  personal: 'albums-outline',
  trade: 'swap-horizontal',
  sale: 'pricetag-outline',
};

export function BinderChoice({ onPick }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {BINDERS.map((binder) => (
        <View key={binder.value} style={styles.cell}>
          <PressableScale
            onPress={() => onPick(binder.value)}
            accessibilityRole="button"
            accessibilityLabel={`Add to ${binder.label} binder`}
            scaleTo={0.95}
          >
            <View style={[styles.option, { backgroundColor: withAlpha(theme.colors.text, 0.09) }]}>
              <Ionicons name={ICONS[binder.value]} size={18} color={theme.colors.text} />
              <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
                {binder.label}
              </Text>
            </View>
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  option: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
