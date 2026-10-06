import { useRouter } from 'expo-router';

import { useHaptics } from '@/hooks/useHaptics';

import { IconButton } from './IconButton';

export function AppearanceButton() {
  const router = useRouter();
  const haptics = useHaptics();

  return (
    <IconButton
      icon="color-palette-outline"
      accessibilityLabel="Change app appearance"
      onPress={() => {
        haptics.tap();
        router.push('/appearance');
      }}
    />
  );
}
