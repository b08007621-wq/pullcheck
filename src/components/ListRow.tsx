import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';

export type RowPosition = 'only' | 'first' | 'middle' | 'last';

type Props = {
  position: RowPosition;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  inset?: number;
};

export function rowPosition(index: number, count: number): RowPosition {
  if (count <= 1) return 'only';
  if (index === 0) return 'first';
  return index === count - 1 ? 'last' : 'middle';
}

export function ListRow({ position, children, style, inset = 74 }: Props) {
  const theme = useTheme();
  const top = position === 'only' || position === 'first';
  const bottom = position === 'only' || position === 'last';

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: top ? radius.md : 0,
          borderTopRightRadius: top ? radius.md : 0,
          borderBottomLeftRadius: bottom ? radius.md : 0,
          borderBottomRightRadius: bottom ? radius.md : 0,
        },
        style,
      ]}
    >
      {children}
      {bottom ? null : <View style={[styles.separator, { left: inset, backgroundColor: theme.colors.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    overflow: 'hidden',
  },
  separator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
