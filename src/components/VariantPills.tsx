import { StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import { variantShortLabel } from '@/utils/price';

import { PressableScale } from './PressableScale';

type Props = {
  variants: string[];
  value: string | null;
  onChange: (variant: string) => void;
};

export function VariantPills({ variants, value, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  if (variants.length < 2) return null;

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {variants.map((variant) => {
        const selected = variant === value;
        const label = variantShortLabel(variant);
        return (
          <PressableScale
            key={variant}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(variant);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            scaleTo={0.94}
            hitSlop={4}
          >
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? theme.colors.text : 'transparent',
                  borderColor: selected ? theme.colors.text : theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: selected ? theme.colors.background : theme.colors.textMuted }]}>
                {label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  pill: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
});
