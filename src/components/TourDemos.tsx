import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Board } from '@/hooks/useBoard';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type BoardLayout, EMPTY_BOARD } from '@/state/settingsContext';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { ArrangeBoard, type BoardWidget } from './ArrangeBoard';
import { PressableScale } from './PressableScale';
import { SegmentedControl } from './SegmentedControl';

type ScanStage = 'idle' | 'found' | 'added';

const PRICES = { raw: 342.73, psa9: 612, psa10: 1480 } as const;

type PriceKey = keyof typeof PRICES;

const PRICE_OPTIONS: { value: PriceKey; label: string }[] = [
  { value: 'raw', label: 'Raw' },
  { value: 'psa9', label: 'PSA 9' },
  { value: 'psa10', label: 'PSA 10' },
];

const TILES: { key: string; label: string; icon: IconName }[] = [
  { key: 'value', label: 'Total value', icon: 'wallet-outline' },
  { key: 'movers', label: 'Movers', icon: 'trending-up-outline' },
  { key: 'top', label: 'Top cards', icon: 'diamond-outline' },
  { key: 'sets', label: 'Sets', icon: 'grid-outline' },
];

const SEED_LAYOUT: BoardLayout = {
  hidden: [],
  items: {
    value: { x: 0, y: 0, w: 0.5 },
    movers: { x: 0.5, y: 0, w: 0.5 },
    top: { x: 0, y: 100, w: 0.5 },
    sets: { x: 0.5, y: 100, w: 0.5 },
  },
};

function money(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ScanDemo() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [stage, setStage] = useState<ScanStage>('idle');
  const [pop] = useState(() => new Animated.Value(0));

  const advance = (next: ScanStage) => {
    setStage(next);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, damping: 12, stiffness: 220, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.demo}>
      <Text style={styles.demoTitle}>Try it</Text>
      <View style={styles.scanRow}>
        <Animated.View
          style={[
            styles.card,
            stage !== 'idle' && { borderColor: theme.colors.accent },
            { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
          ]}
        >
          <LinearGradient colors={theme.gradient} style={styles.cardArt}>
            <Ionicons name="flame" size={30} color={theme.colors.onAccent} />
          </LinearGradient>
          <View style={styles.cardLines}>
            <View style={[styles.line, { width: '78%', backgroundColor: theme.colors.text }]} />
            <View style={[styles.line, { width: '48%', backgroundColor: theme.colors.textFaint }]} />
          </View>
        </Animated.View>
        <View style={styles.scanSide}>
          {stage === 'idle' ? (
            <>
              <Text style={styles.prompt}>Hold a card up to the camera</Text>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Scan the sample card"
                onPress={() => {
                  haptics.tap();
                  advance('found');
                }}
              >
                <View style={styles.pill}>
                  <Ionicons name="scan" size={16} color={theme.colors.onAccent} />
                  <Text style={styles.pillText}>Scan it</Text>
                </View>
              </PressableScale>
            </>
          ) : null}
          {stage === 'found' ? (
            <>
              <Text style={styles.prompt}>Charizard ex · {money(PRICES.raw)}</Text>
              <Text style={styles.promptMuted}>Is this it?</Text>
              <View style={styles.pillRow}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Yes, add it"
                  onPress={() => {
                    haptics.collect();
                    advance('added');
                  }}
                >
                  <View style={styles.pill}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.onAccent} />
                    <Text style={styles.pillText}>Yes</Text>
                  </View>
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="No, scan again"
                  onPress={() => {
                    haptics.selection();
                    advance('idle');
                  }}
                >
                  <View style={[styles.pill, styles.pillQuiet]}>
                    <Text style={[styles.pillText, { color: theme.colors.text }]}>No</Text>
                  </View>
                </PressableScale>
              </View>
            </>
          ) : null}
          {stage === 'added' ? (
            <>
              <View style={styles.addedRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.gain} />
                <Text style={styles.prompt}>Added to your collection</Text>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Try again"
                onPress={() => {
                  haptics.selection();
                  advance('idle');
                }}
              >
                <Text style={styles.link}>Try again</Text>
              </PressableScale>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function PriceDemo() {
  const styles = useThemedStyles(createStyles);
  const [grade, setGrade] = useState<PriceKey>('raw');

  return (
    <View style={styles.demo}>
      <Text style={styles.demoTitle}>Try it</Text>
      <Text style={styles.priceName}>Charizard ex · 151</Text>
      <Text style={styles.price} accessibilityLiveRegion="polite">
        {money(PRICES[grade])}
      </Text>
      <SegmentedControl options={PRICE_OPTIONS} value={grade} onChange={setGrade} />
    </View>
  );
}

type ArrangeProps = {
  onLock: (locked: boolean) => void;
};

export function ArrangeDemo({ onLock }: ArrangeProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const [layout, setLayout] = useState<BoardLayout>(SEED_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [locked, setLocked] = useState(false);

  const board = useMemo<Board>(
    () => ({
      layout,
      editing,
      locked,
      canUndo: false,
      setEditing,
      setLocked: (next) => {
        setLocked(next);
        onLock(next);
      },
      save: setLayout,
      show: () => {},
      toggle: () => {},
      tidy: () => setLayout(SEED_LAYOUT),
      reset: () => setLayout(EMPTY_BOARD),
      undo: () => {},
      done: () => {
        setEditing(false);
        setLocked(false);
        onLock(false);
      },
    }),
    [layout, editing, locked, onLock],
  );

  const widgets = useMemo<BoardWidget[]>(
    () =>
      TILES.map((tile) => ({
        key: tile.key,
        label: tile.label,
        hideable: false,
        node: (
          <View style={styles.tile}>
            <Ionicons name={tile.icon} size={20} color={theme.colors.accent} />
            <Text style={styles.tileText}>{tile.label}</Text>
          </View>
        ),
      })),
    [styles, theme.colors.accent],
  );

  return (
    <View style={styles.demo}>
      <View style={styles.arrangeHead}>
        <Text style={styles.demoTitle}>{editing ? 'Drag a tile to a new spot' : 'Try it: hold a tile, then drag'}</Text>
        {editing ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Done"
            onPress={() => board.done()}
          >
            <View style={styles.pill}>
              <Text style={styles.pillText}>Done</Text>
            </View>
          </PressableScale>
        ) : null}
      </View>
      <ArrangeBoard widgets={widgets} board={board} gap={spacing.sm} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    demo: {
      marginTop: spacing.md,
      padding: spacing.lg,
      gap: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    demoTitle: {
      ...typography.caption,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.accent,
    },
    scanRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    card: {
      width: 92,
      height: 128,
      padding: 6,
      gap: 6,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    cardArt: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    cardLines: {
      gap: 4,
    },
    line: {
      height: 5,
      borderRadius: 3,
    },
    scanSide: {
      flex: 1,
      gap: spacing.sm,
    },
    prompt: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    promptMuted: {
      ...typography.body,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    pillRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    pillQuiet: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    pillText: {
      ...typography.label,
      fontSize: 14,
      color: theme.colors.onAccent,
    },
    addedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    link: {
      ...typography.label,
      fontSize: 14,
      color: theme.colors.accent,
    },
    priceName: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    price: {
      ...typography.title,
      fontSize: 34,
      color: theme.colors.price,
      fontVariant: ['tabular-nums'],
    },
    arrangeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 32,
    },
    tile: {
      height: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    tileText: {
      ...typography.label,
      fontSize: 14,
      flex: 1,
      color: theme.colors.text,
    },
  });
}
