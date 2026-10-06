import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { AutoScanGuess } from '@/hooks/useAutoScan';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useScanCard } from '@/hooks/useScanCard';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { previewCard } from '@/services/tcgdex';
import { radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import { cardVersionPrice, defaultVersion, resolveVersion } from '@/utils/cardVersion';
import { formatPrice } from '@/utils/price';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  guess: AutoScanGuess | null;
  ripping: boolean;
  bottom: number;
  onOpen: () => void;
  onAdded: () => void;
  onAddPull: (card: Card) => void;
};

const FADE_OUT_MS = 420;
const RIP_AUTO_ADD_MS = 1100;
const BIG_PULL_USD = 20;
const THUMB_HEIGHT = 74;

export function ScanGuess({ guess, ripping, bottom, onOpen, onAdded, onAddPull }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { addCard } = useCollection();
  const { fulfill } = useWishlist();
  const [shown, setShown] = useState<AutoScanGuess | null>(guess);
  const [added, setAdded] = useState<number | null>(null);
  const [presence] = useState(() => new Animated.Value(0));
  const guessId = guess?.id ?? null;

  if (guess && guess.id !== shown?.id) setShown(guess);

  useEffect(() => {
    if (guessId === null) {
      Animated.timing(presence, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShown(null);
      });
      return;
    }
    haptics.ready();
    Animated.spring(presence, { toValue: 1, speed: 14, bounciness: 5, useNativeDriver: true }).start();
  }, [guessId, presence, haptics]);

  const candidate = shown?.candidates[0] ?? null;
  const { data: card } = useScanCard(candidate);
  const preview = useMemo(
    () => (candidate ? previewCard(candidate.card, candidate.language) : null),
    [candidate],
  );
  const priced = card ?? preview;
  const price = priced ? cardVersionPrice(priced, defaultVersion(priced)) : null;
  const done = shown !== null && added === shown.id;
  const others = (shown?.candidates.length ?? 1) - 1;

  const add = useCallback(() => {
    if (!card || !shown || added === shown.id) return;
    const version = resolveVersion(card, defaultVersion(card));
    const value = cardVersionPrice(card, version);
    if (value && value.currency === 'USD' && value.amount >= BIG_PULL_USD) haptics.hit();
    else haptics.collect();
    if (ripping) onAddPull(card);
    else {
      addCard(card, version);
      fulfill([card.id]);
    }
    setAdded(shown.id);
    onAdded();
  }, [card, shown, added, ripping, haptics, onAddPull, addCard, fulfill, onAdded]);

  useEffect(() => {
    if (!ripping || !shown?.confirmed || !card || done) return;
    const timer = setTimeout(add, RIP_AUTO_ADD_MS);
    return () => clearTimeout(timer);
  }, [ripping, shown, card, done, add]);

  if (!shown || !candidate) return null;

  const image = candidate.card.image ? `${candidate.card.image}/low.webp` : null;
  const name = card?.name ?? candidate.card.name;
  const setName = card?.set.name ?? candidate.card.set.name;
  const number = card?.number ?? candidate.card.localId;
  const translateY = presence.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const scale = presence.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <Animated.View
      pointerEvents={guess ? 'box-none' : 'none'}
      style={[styles.anchor, { bottom, opacity: presence, transform: [{ translateY }, { scale }] }]}
    >
      <GlassSurface variant="sheet" style={[styles.panel, { borderColor: theme.colors.border }]}>
        <View style={styles.flex}>
          <PressableScale
            onPress={() => {
              haptics.tap();
              onOpen();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Is this it? ${name}. Open details`}
            scaleTo={0.98}
          >
            <View style={styles.row}>
              <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceRaised }]}>
                {image ? (
                  <Image source={image} style={styles.fill} contentFit="cover" transition={140} recyclingKey={image} />
                ) : null}
              </View>
              <View style={styles.text}>
                <Text style={[styles.ask, { color: theme.colors.textMuted }]}>
                  {others > 0 ? `Is this it? · ${others + 1} printings` : 'Is this it?'}
                </Text>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {setName} · #{number}
                </Text>
                {price ? (
                  <Text style={[styles.price, { color: theme.colors.price }]}>{formatPrice(price)}</Text>
                ) : null}
              </View>
            </View>
          </PressableScale>
        </View>
        <PressableScale
          onPress={add}
          disabled={!card || done}
          accessibilityRole="button"
          accessibilityLabel={done ? 'Added' : ripping ? 'Add to pull' : 'Add to collection'}
          accessibilityState={{ disabled: !card || done }}
          scaleTo={0.94}
        >
          <View style={[styles.add, { backgroundColor: done ? theme.colors.gain : theme.colors.accent }]}>
            {card || done ? (
              <Ionicons name={done ? 'checkmark' : 'add'} size={24} color={theme.colors.onAccent} />
            ) : (
              <ActivityIndicator color={theme.colors.onAccent} />
            )}
          </View>
        </PressableScale>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg + 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm + 2,
    paddingRight: spacing.md,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    height: THUMB_HEIGHT,
    width: THUMB_HEIGHT * (63 / 88),
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  ask: {
    ...typography.caption,
  },
  name: {
    ...typography.heading,
    fontSize: 17,
  },
  meta: {
    ...typography.caption,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  add: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
