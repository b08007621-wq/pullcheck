import { AppNavigator } from '@/components/AppNavigator';
import { CollectionProvider } from '@/state/CollectionProvider';
import { RipProvider } from '@/state/RipProvider';
import { SettingsProvider } from '@/state/SettingsProvider';
import { WishlistProvider } from '@/state/WishlistProvider';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <CollectionProvider>
        <WishlistProvider>
          <RipProvider>
            <AppNavigator />
          </RipProvider>
        </WishlistProvider>
      </CollectionProvider>
    </SettingsProvider>
  );
}
