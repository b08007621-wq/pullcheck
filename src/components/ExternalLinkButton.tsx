import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';

import { ActionButton } from './ActionButton';

type Props = {
  label: string;
  url: string;
};

export function ExternalLinkButton({ label, url }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  const open = () => {
    haptics.tap();
    WebBrowser.openBrowserAsync(url, {
      controlsColor: theme.colors.accent,
      dismissButtonStyle: 'close',
    }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <ActionButton label={label} icon="open-outline" variant="secondary" onPress={open} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
