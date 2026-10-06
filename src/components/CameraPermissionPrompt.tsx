import { Linking, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { ActionButton } from './ActionButton';
import { AppearanceButton } from './AppearanceButton';
import { EmptyState } from './EmptyState';
import { Screen } from './Screen';

type Props = {
  canAskAgain: boolean;
  onRequest: () => void;
  onLibrary: () => void;
  bottomInset: number;
};

export function CameraPermissionPrompt({ canAskAgain, onRequest, onLibrary, bottomInset }: Props) {
  return (
    <Screen title="Scan" action={<AppearanceButton />}>
      <EmptyState
        icon={canAskAgain ? 'camera' : 'camera-outline'}
        title={canAskAgain ? 'Scan cards with your camera' : 'Camera access is off'}
        message={
          canAskAgain
            ? 'Line a card up in the frame and PullCheck snaps a clean, cropped photo of it.'
            : 'Turn on camera access for this app in Settings to scan cards.'
        }
        bottomInset={bottomInset}
        action={
          canAskAgain
            ? { label: 'Allow camera', icon: 'camera', onPress: onRequest }
            : { label: 'Open Settings', icon: 'settings-outline', onPress: () => Linking.openSettings() }
        }
      >
        <View style={styles.secondary}>
          <ActionButton label="Choose a photo instead" icon="images-outline" variant="secondary" onPress={onLibrary} />
        </View>
      </EmptyState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  secondary: {
    marginTop: spacing.md,
  },
});
