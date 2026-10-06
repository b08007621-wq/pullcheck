import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { toNavigationTheme } from '@/theme';

import { WelcomeTour } from './WelcomeTour';

export function AppNavigator() {
  const theme = useTheme();
  const { settings, updateSettings } = useSettings();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 280,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="card/[id]" options={{ fullScreenGestureEnabled: false }} />
        <Stack.Screen name="sealed/[id]" />
        <Stack.Screen name="appearance" options={{ presentation: 'modal' }} />
        <Stack.Screen name="rip" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sets" />
        <Stack.Screen name="upcoming" />
        <Stack.Screen name="trade" />
        <Stack.Screen name="barcode" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="set/[id]" />
        <Stack.Screen name="jpset/[id]" />
        <Stack.Screen name="wishlist" />
        <Stack.Screen name="backup" />
        <Stack.Screen name="centering" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="viewer" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      {settings.tourDone ? null : <WelcomeTour onDone={() => updateSettings({ tourDone: true })} />}
      <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
    </ThemeProvider>
  );
}
