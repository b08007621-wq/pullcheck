import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/theme';

import { AuroraBackground } from './AuroraBackground';
import { GlassSurface } from './GlassSurface';
import { IconButton } from './IconButton';

export type ListInsets = {
  top: number;
  bottom: number;
};

type Props = {
  children?: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
  topRight?: ReactNode;
  renderList?: (insets: ListInsets) => ReactNode;
  scrollEnabled?: boolean;
};

const TOP_BAR_HEIGHT = 56;

export function DetailLayout({ children, footer, centered = false, topRight, renderList, scrollEnabled = true }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.root}>
      <AuroraBackground />
      {renderList ? (
        renderList({
          top: insets.top + TOP_BAR_HEIGHT,
          bottom: (footer ? footerHeight : insets.bottom) + spacing.xl,
        })
      ) : centered ? (
        <View style={[styles.centered, { paddingTop: insets.top + TOP_BAR_HEIGHT }]}>{children}</View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + TOP_BAR_HEIGHT,
              paddingBottom: (footer ? footerHeight : insets.bottom) + spacing.xl,
            },
          ]}
          scrollIndicatorInsets={{ bottom: footerHeight }}
          scrollEnabled={scrollEnabled}
        >
          {children}
        </ScrollView>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={[theme.colors.background, 'transparent']}
        style={[styles.topFade, { height: insets.top + TOP_BAR_HEIGHT }]}
      />
      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={goBack} />
      </View>
      {topRight ? <View style={[styles.topRight, { top: insets.top + spacing.xs }]}>{topRight}</View> : null}
      {footer ? (
        <View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={styles.footer}
        >
          <GlassSurface style={styles.footerSurface} />
          <View style={[styles.footerContent, { paddingBottom: insets.bottom + spacing.md }]}>
            {footer}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
  },
  topRight: {
    position: 'absolute',
    right: spacing.lg,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footerSurface: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
