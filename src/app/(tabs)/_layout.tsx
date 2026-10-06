import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';

export default function TabsLayout() {
  const theme = useTheme();
  const haptics = useHaptics();
  const { hits } = useWishlist();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
      screenListeners={{ tabPress: () => haptics.selection() }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarBadge: hits > 0 ? hits : undefined,
        }}
      />
    </Tabs>
  );
}
