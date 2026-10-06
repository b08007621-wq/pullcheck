import { StyleSheet, View } from 'react-native';

import type { Rect, Size } from '@/types/scan';

type Props = {
  frame: Rect;
  view: Size;
  cornerRadius: number;
};

const MASK_COLOR = 'rgba(6,3,10,0.64)';

export function ScanMask({ frame, view, cornerRadius }: Props) {
  const border = Math.max(view.width, view.height);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.mask,
        {
          left: frame.x - border,
          top: frame.y - border,
          width: frame.width + border * 2,
          height: frame.height + border * 2,
          borderWidth: border,
          borderRadius: cornerRadius + border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    borderColor: MASK_COLOR,
  },
});
