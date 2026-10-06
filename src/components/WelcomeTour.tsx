import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/hooks/useTheme';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { IconName } from '@/types/icon';

import { ActionButton } from './ActionButton';
import { AuroraBackground } from './AuroraBackground';
import { Gloss } from './Gloss';
import { PagerDots } from './PagerDots';

type Props = {
  onDone: () => void;
};

type Slide = {
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  tips: { icon: IconName; text: string }[];
};

const SLIDES: Slide[] = [
  {
    icon: 'sparkles',
    eyebrow: 'Welcome to PullCheck',
    title: 'Know what your pulls are worth',
    body: 'Scan, price and track your Pokémon cards and sealed product in one place. Here’s a quick look around.',
    tips: [
      { icon: 'scan-outline', text: 'Scan cards with your camera' },
      { icon: 'albums-outline', text: 'Watch your collection’s value' },
      { icon: 'grid-outline', text: 'Complete sets and chase wishlists' },
    ],
  },
  {
    icon: 'scan',
    eyebrow: 'Scan tab',
    title: 'Point, check, add',
    body: 'Hold a card in front of the camera. PullCheck finds it, asks “Is this it?”, and adds it when you say yes.',
    tips: [
      { icon: 'flash-outline', text: 'Auto-scan picks cards up on its own' },
      { icon: 'gift-outline', text: 'Open a pack with Pull to log every card' },
      { icon: 'barcode-outline', text: 'Scan a barcode to find sealed product' },
    ],
  },
  {
    icon: 'search',
    eyebrow: 'Search tab',
    title: 'Look anything up',
    body: 'Find any card or sealed product, English or Japanese, with live market prices and history.',
    tips: [
      { icon: 'pricetag-outline', text: 'Raw and graded prices on every card' },
      { icon: 'swap-horizontal-outline', text: 'Swipe a card left or right for the next one' },
      { icon: 'cube-outline', text: 'Tilt cards in 3D to see the real foil' },
    ],
  },
  {
    icon: 'albums',
    eyebrow: 'Collection tab',
    title: 'Your cards, your way',
    body: 'See your total value, what’s rising and falling, and every card in a list, grid or 3D shelf.',
    tips: [
      { icon: 'hand-left-outline', text: 'Hold a card for quick actions' },
      { icon: 'move-outline', text: 'Hold a section to rearrange the page' },
      { icon: 'create-outline', text: 'Customize sections, columns and backups' },
    ],
  },
  {
    icon: 'grid',
    eyebrow: 'Sets & more',
    title: 'Chase every set',
    body: 'Track how close you are to finishing each set, and keep a wishlist with price targets.',
    tips: [
      { icon: 'apps-outline', text: 'Hold a set until it wiggles, then drag it' },
      { icon: 'heart-outline', text: 'Wishlist alerts when prices drop' },
      { icon: 'git-compare-outline', text: 'Check trades and grading odds' },
    ],
  },
  {
    icon: 'color-palette',
    eyebrow: 'All yours',
    title: 'You’re in control',
    body: 'Make it look and feel how you like. Themes, backgrounds, haptics and sounds live in Appearance.',
    tips: [
      { icon: 'brush-outline', text: 'Tap the palette button to change the look' },
      { icon: 'cloud-download-outline', text: 'Back up or import from other apps' },
      { icon: 'refresh-outline', text: 'Replay this tour any time in Appearance' },
    ],
  },
];

export function WelcomeTour({ onDone }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fade]);

  const goTo = (next: number) => {
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    haptics.collect();
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => onDone());
  };

  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (indexRef.current > 0) {
        setIndex(indexRef.current - 1);
        scroller.current?.scrollTo({ x: (indexRef.current - 1) * width, animated: true });
      }
      return true;
    });
    return () => subscription.remove();
  }, [width]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      haptics.selection();
      setIndex(next);
    }
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]} accessibilityViewIsModal>
      <AuroraBackground />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.step}>
          {index + 1} of {SLIDES.length}
        </Text>
        {last ? null : (
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Skip the tour" hitSlop={12}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
              <Gloss />
              <Ionicons name={slide.icon} size={52} color={theme.colors.onAccent} />
            </View>
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text style={styles.title} accessibilityRole="header">
              {slide.title}
            </Text>
            <Text style={styles.body}>{slide.body}</Text>
            <View style={styles.tips}>
              {slide.tips.map((tip) => (
                <View key={tip.text} style={styles.tip}>
                  <View style={styles.tipIcon}>
                    <Ionicons name={tip.icon} size={18} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PagerDots count={SLIDES.length} index={index} />
        <ActionButton
          label={last ? 'Get started' : 'Next'}
          icon={last ? 'checkmark' : 'arrow-forward'}
          onPress={() => {
            if (last) close();
            else {
              haptics.tap();
              goTo(index + 1);
            }
          }}
        />
        {index > 0 ? (
          <Pressable onPress={() => goTo(index - 1)} accessibilityRole="button" hitSlop={8} style={styles.backButton}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      zIndex: 100,
      elevation: 100,
      backgroundColor: theme.colors.background,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      minHeight: 44,
    },
    step: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    skip: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.accent,
    },
    pager: {
      flex: 1,
    },
    slide: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    badge: {
      width: 104,
      height: 104,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: theme.gloss ? StyleSheet.hairlineWidth : 0,
      borderColor: 'rgba(255,255,255,0.8)',
    },
    eyebrow: {
      ...typography.caption,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.accent,
    },
    title: {
      ...typography.title,
      fontSize: 30,
      color: theme.colors.text,
    },
    body: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    tips: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    tipIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.accent, 0.14),
    },
    tipText: {
      ...typography.body,
      fontSize: 15,
      flex: 1,
      color: theme.colors.text,
    },
    bottom: {
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    backButton: {
      alignSelf: 'center',
      minHeight: 20,
    },
    back: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
  });
}
