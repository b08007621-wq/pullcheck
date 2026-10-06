import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { spacing } from '@/theme';

import { CameraToolButton } from './CameraToolButton';
import { ShutterButton } from './ShutterButton';

type Props = {
  onShutter: () => void;
  onLibrary: () => void;
  onTorch: () => void;
  torchOn: boolean;
  busy: boolean;
  cameraReady: boolean;
  bottomInset: number;
  hidden?: boolean;
};

export const SCANNER_CONTROLS_HEIGHT = 128;

export function ScannerControls({
  onShutter,
  onLibrary,
  onTorch,
  torchOn,
  busy,
  cameraReady,
  bottomInset,
  hidden = false,
}: Props) {
  const [visibility] = useState(() => new Animated.Value(hidden ? 0 : 1));

  useEffect(() => {
    Animated.timing(visibility, { toValue: hidden ? 0 : 1, duration: 220, useNativeDriver: true }).start();
  }, [hidden, visibility]);

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[styles.bar, { bottom: bottomInset + spacing.md, opacity: visibility }]}
    >
      <CameraToolButton icon="images" label="Photos" onPress={onLibrary} disabled={busy} />
      <ShutterButton onPress={onShutter} busy={busy} disabled={!cameraReady} />
      <CameraToolButton
        icon={torchOn ? 'flashlight' : 'flashlight-outline'}
        label={torchOn ? 'Light on' : 'Light'}
        onPress={onTorch}
        active={torchOn}
        disabled={!cameraReady}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.lg,
  },
});
