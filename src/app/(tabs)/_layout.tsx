import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { TabBarBackground } from '@/components/TabBarBackground';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';

export default function TabsLayout() {
  const theme = useTheme();
  const haptics = useHaptics();
  const { hits } = useWishlist();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: theme.glass ? 'transparent' : theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          borderTopWidth: theme.glass ? 0 : StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarBackground: theme.glass ? () => <TabBarBackground /> : undefined,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
      screenListeners={{ tabPress: () => haptics.selection() }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} />,
          tabBarBadge: hits > 0 ? hits : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.gain, color: theme.colors.background },
        }}
      />
    </Tabs>
  );
}
