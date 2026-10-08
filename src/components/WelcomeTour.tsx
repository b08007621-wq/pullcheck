import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { Settings } from '@/state/settingsContext';
import { type AppTheme, radius, spacing, type ThemeId, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { Game } from '@/types/card';
import type { IconName } from '@/types/icon';
import { layoutFor, type LayoutPreset, recommendedLayout, type TourFocus } from '@/utils/tourPresets';

import { ActionButton } from './ActionButton';
import { AuroraBackground } from './AuroraBackground';
import { Gloss } from './Gloss';
import { PagerDots } from './PagerDots';
import { ArrangeDemo, PriceDemo, ScanDemo } from './TourDemos';
import { FocusStep, GamesStep, LayoutStep, LookStep } from './TourSetup';

type Props = {
  onDone: () => void;
};

type Tip = { icon: IconName; text: string };

type Slide =
  | {
      kind: 'info';
      icon: IconName;
      eyebrow: string;
      title: string;
      body: string;
      tips: Tip[];
      demo?: 'scan' | 'price' | 'arrange';
    }
  | {
      kind: 'games' | 'focus' | 'look' | 'layout';
      icon: IconName;
      eyebrow: string;
      title: string;
      body: string;
      tips: Tip[];
    };

const SLIDES: Slide[] = [
  {
    kind: 'info',
    icon: 'sparkles',
    eyebrow: 'Welcome to PullCheck',
    title: 'Know what your pulls are worth',
    body: 'Scan, price and track your trading cards and sealed product in one place. Here’s a quick, hands-on look around.',
    tips: [
      { icon: 'scan-outline', text: 'Scan cards with your camera' },
      { icon: 'albums-outline', text: 'Watch your collection’s value' },
      { icon: 'grid-outline', text: 'Complete sets and chase wishlists' },
    ],
  },
  {
    kind: 'info',
    icon: 'scan',
    eyebrow: 'Scan tab',
    title: 'Point, check, add',
    body: 'Hold a card in front of the camera. PullCheck finds it, asks “Is this it?”, and adds it when you say yes.',
    tips: [
      { icon: 'flash-outline', text: 'Auto-scan picks cards up on its own' },
      { icon: 'gift-outline', text: 'Open a pack with Pull to log every card' },
    ],
    demo: 'scan',
  },
  {
    kind: 'info',
    icon: 'search',
    eyebrow: 'Search tab',
    title: 'Look anything up',
    body: 'Find any card or sealed product with live market prices and history, raw and graded.',
    tips: [
      { icon: 'swap-horizontal-outline', text: 'Swipe a card left or right for the next one' },
      { icon: 'cube-outline', text: 'Tilt cards in 3D to see the real foil' },
    ],
    demo: 'price',
  },
  {
    kind: 'info',
    icon: 'albums',
    eyebrow: 'Collection tab',
    title: 'Your cards, your way',
    body: 'Every page is a board you can rearrange. Hold a tile until it wiggles, then drag it. Drag the corner handle to make it wider, narrower, taller or shorter.',
    tips: [{ icon: 'hand-left-outline', text: 'Hold a card for quick actions' }],
    demo: 'arrange',
  },
  {
    kind: 'info',
    icon: 'grid',
    eyebrow: 'Sets & more',
    title: 'Chase every set',
    body: 'Track how close you are to finishing each set, and keep a wishlist with price targets.',
    tips: [
      { icon: 'heart-outline', text: 'Wishlist alerts when prices drop' },
      { icon: 'git-compare-outline', text: 'Check trades and grading odds' },
      { icon: 'cloud-download-outline', text: 'Back up or import from other apps' },
    ],
  },
  {
    kind: 'games',
    icon: 'game-controller',
    eyebrow: 'Make it yours · 1 of 4',
    title: 'What do you collect?',
    body: 'Pick every game you play. We’ll start your search there and tidy up the collection page to match. Skip it any time.',
    tips: [],
  },
  {
    kind: 'focus',
    icon: 'compass',
    eyebrow: 'Make it yours · 2 of 4',
    title: 'What matters most?',
    body: 'Choose as many as you like. Those sections move to the top of your collection.',
    tips: [],
  },
  {
    kind: 'look',
    icon: 'color-palette',
    eyebrow: 'Make it yours · 3 of 4',
    title: 'Pick your look',
    body: 'Both are the classic Aero look, glass, gloss and bubbles. Tap one and the whole app changes right now.',
    tips: [],
  },
  {
    kind: 'layout',
    icon: 'apps',
    eyebrow: 'Make it yours · 4 of 4',
    title: 'How packed should it be?',
    body: 'A starting layout for your collection. You can change every detail later in Appearance.',
    tips: [],
  },
];

const FIRST_SETUP = SLIDES.findIndex((slide) => slide.kind !== 'info');

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function WelcomeTour({ onDone }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [pagerLocked, setPagerLocked] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [focus, setFocus] = useState<TourFocus[]>([]);
  const [layout, setLayout] = useState<LayoutPreset | null>(null);
  const [fade] = useState(() => new Animated.Value(0));
  const [startTheme] = useState(settings.themeId);
    const closing = useRef(false);
  const slide = SLIDES[index] ?? SLIDES[0]!;
  const last = index === SLIDES.length - 1;
  const inSetup = index >= FIRST_SETUP;
  const suggested = useMemo(() => recommendedLayout({ games, focus }), [games, focus]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fade]);

  const goTo = (next: number) => {
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const close = (changes: Partial<Settings> = {}) => {
    if (closing.current) return;
    closing.current = true;
    haptics.collect();
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
      updateSettings({ ...changes, tourDone: true });
      onDone();
    });
  };

  const skipSetup = () => close({ themeId: startTheme });

  const finish = () => {
    const changes: Partial<Settings> = {};
    if (games.length > 0) changes.searchGame = games[0];
    if (games.length > 0 || focus.length > 0 || layout) {
      const result = layoutFor({ games, focus, layout }, settings.collectionLayout, settings.collectionView);
      changes.collectionLayout = result.layout;
      changes.collectionView = result.view;
    }
    close(changes);
  };

  const answered = games.length > 0 || focus.length > 0 || layout !== null || settings.themeId !== startTheme;

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

  const stage = (entry: Slide) => {
    if (entry.kind === 'games') {
      return <GamesStep value={games} onToggle={(game) => setGames((current) => toggled(current, game))} />;
    }
    if (entry.kind === 'focus') {
      return <FocusStep value={focus} onToggle={(item) => setFocus((current) => toggled(current, item))} />;
    }
    if (entry.kind === 'look') {
      return <LookStep value={settings.themeId} onPick={(id: ThemeId) => updateSettings({ themeId: id })} />;
    }
    if (entry.kind === 'layout') {
      return <LayoutStep value={layout} recommended={suggested} onPick={setLayout} />;
    }
    if (entry.kind !== 'info') return null;
    if (entry.demo === 'scan') return <ScanDemo />;
    if (entry.demo === 'price') return <PriceDemo />;
    if (entry.demo === 'arrange') return <ArrangeDemo onLock={setPagerLocked} />;
    return null;
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]} accessibilityViewIsModal>
      <AuroraBackground />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.step}>
          {index + 1} of {SLIDES.length}
        </Text>
        {last ? null : (
          <Pressable
            onPress={inSetup ? skipSetup : () => close()}
            accessibilityRole="button"
            accessibilityLabel={inSetup ? 'Skip setup' : 'Skip the tour'}
            hitSlop={12}
          >
            <Text style={styles.skip}>{inSetup ? 'Skip setup' : 'Skip'}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        scrollEnabled={!pagerLocked}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((entry) => (
          <View key={entry.title} style={[styles.slide, { width }]}>
            <ScrollView
              scrollEnabled={!pagerLocked}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.slideBody}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                <Gloss />
                <Ionicons name={entry.icon} size={38} color={theme.colors.onAccent} />
              </View>
              <Text style={styles.eyebrow}>{entry.eyebrow}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {entry.title}
              </Text>
              <Text style={styles.body}>{entry.body}</Text>
              {entry.kind === 'info' || entry.kind === 'look' ? null : <View style={styles.stage} />}
              {stage(entry)}
              {entry.tips.length > 0 ? (
                <View style={styles.tips}>
                  {entry.tips.map((tip) => (
                    <View key={tip.text} style={styles.tip}>
                      <View style={styles.tipIcon}>
                        <Ionicons name={tip.icon} size={18} color={theme.colors.accent} />
                      </View>
                      <Text style={styles.tipText}>{tip.text}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PagerDots count={SLIDES.length} index={index} />
        <ActionButton
          label={last ? (answered ? 'Apply and finish' : 'Finish') : slide.kind === 'info' && index === FIRST_SETUP - 1 ? 'Set it up' : 'Next'}
          icon={last ? 'checkmark' : 'arrow-forward'}
          onPress={() => {
            if (last) finish();
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
    stage: {
      marginTop: spacing.sm,
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
    },
    slideBody: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    badge: {
      width: 72,
      height: 72,
      borderRadius: 24,
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
      marginTop: spacing.sm,
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
