import { StyleSheet, View } from 'react-native';

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
}: Props) {
  return (
    <View style={[styles.bar, { bottom: bottomInset + spacing.md }]}>
      <CameraToolButton icon="images" label="Photos" onPress={onLibrary} disabled={busy} />
      <ShutterButton onPress={onShutter} busy={busy} disabled={!cameraReady} />
      <CameraToolButton
        icon={torchOn ? 'flashlight' : 'flashlight-outline'}
        label={torchOn ? 'Light on' : 'Light'}
        onPress={onTorch}
        active={torchOn}
        disabled={!cameraReady}
      />
    </View>
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
