import { AppNavigator } from '@/components/AppNavigator';
import { BinderProvider } from '@/state/BinderProvider';
import { CelebrateProvider } from '@/state/CelebrateProvider';
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
            <BinderProvider>
              <CelebrateProvider>
                <AppNavigator />
              </CelebrateProvider>
            </BinderProvider>
          </RipProvider>
        </WishlistProvider>
      </CollectionProvider>
    </SettingsProvider>
  );
}
