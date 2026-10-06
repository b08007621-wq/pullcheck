import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { AutoScanGuess } from '@/hooks/useAutoScan';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { loadScanCard, useScanCard } from '@/hooks/useScanCard';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { previewCard } from '@/services/tcgdex';
import { looksReverseHolo } from '@/services/visionMatch';
import { radius, spacing, typography, withAlpha } from '@/theme';
import type { Card } from '@/types/card';
import { cardVersionPrice, resolveVersion } from '@/utils/cardVersion';
import { defaultVariant, formatPrice, getVariantOptions } from '@/utils/price';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';
import { VariantPills } from './VariantPills';

type Props = {
  guess: AutoScanGuess | null;
  ripping: boolean;
  bottom: number;
  onOpen: () => void;
  onAdded: (card: Card, variant: string | null) => void;
  onNotIt: () => Promise<void>;
  onAddPull: (card: Card) => void;
};

const FADE_OUT_MS = 420;
const BIG_PULL_USD = 20;
const THUMB_HEIGHT = 74;

export function ScanGuess({ guess, ripping, bottom, onOpen, onAdded, onNotIt, onAddPull }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { addCard } = useCollection();
  const { fulfill } = useWishlist();
  const [shown, setShown] = useState<AutoScanGuess | null>(guess);
  const [added, setAdded] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<{ id: number; variant: string } | null>(null);
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
  const variants = priced ? getVariantOptions(priced) : [];
  const detected = looksReverseHolo(shown?.foil) && variants.includes('reverseHolofoil') ? 'reverseHolofoil' : null;
  const variant =
    picked && shown && picked.id === shown.id ? picked.variant : (detected ?? (priced ? defaultVariant(priced) : null));
  const price = priced ? cardVersionPrice(priced, { variant, condition: 'NM' }) : null;
  const done = shown !== null && added === shown.id;
  const others = (shown?.candidates.length ?? 1) - 1;

  const add = useCallback(async () => {
    if (!shown || !candidate || added === shown.id || adding) return;
    const id = shown.id;
    setAdding(true);
    try {
      const target = card ?? (await loadScanCard(candidate));
      const version = resolveVersion(target, { variant, condition: 'NM' });
      const value = cardVersionPrice(target, version);
      if (value && value.currency === 'USD' && value.amount >= BIG_PULL_USD) haptics.hit();
      else haptics.collect();
      if (ripping) onAddPull(target);
      else {
        addCard(target, version);
        fulfill([target.id]);
      }
      setAdded(id);
      onAdded(target, version.variant);
    } catch {
      haptics.remove();
    } finally {
      setAdding(false);
    }
  }, [shown, candidate, added, adding, card, variant, ripping, haptics, onAddPull, addCard, fulfill, onAdded]);

  const reject = useCallback(async () => {
    if (rejecting) return;
    haptics.selection();
    setRejecting(true);
    try {
      await onNotIt();
    } finally {
      setRejecting(false);
    }
  }, [rejecting, haptics, onNotIt]);

  if (!shown || !candidate) return null;

  const image = candidate.card.image ? `${candidate.card.image}/low.webp` : null;
  const name = card?.name ?? candidate.card.name;
  const setName = card?.set.name ?? candidate.card.set.name;
  const number = card?.number ?? candidate.card.localId;
  const translateY = presence.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const scale = presence.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const quiet = { backgroundColor: withAlpha(theme.colors.text, 0.1) };
  const yesLabel = done ? (ripping ? 'Added to pull' : 'Added') : ripping ? 'Yes, add to pull' : 'Yes, add';

  return (
    <Animated.View
      pointerEvents={guess ? 'box-none' : 'none'}
      style={[styles.anchor, { bottom, opacity: presence, transform: [{ translateY }, { scale }] }]}
    >
      <GlassSurface variant="sheet" style={[styles.panel, { borderColor: theme.colors.border }]}>
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
            </View>
            <View style={styles.side}>
              {price ? <Text style={[styles.price, { color: theme.colors.price }]}>{formatPrice(price)}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textFaint} />
            </View>
          </View>
        </PressableScale>
        {variants.length > 1 && !done ? (
          <VariantPills
            variants={variants}
            value={variant}
            onChange={(next) => shown && setPicked({ id: shown.id, variant: next })}
          />
        ) : null}
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <PressableScale
              onPress={reject}
              disabled={done || rejecting}
              accessibilityRole="button"
              accessibilityLabel="Not it"
              scaleTo={0.96}
            >
              <View style={[styles.button, quiet]}>
                {rejecting ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <>
                    <Ionicons name="close" size={18} color={theme.colors.text} />
                    <Text style={[styles.buttonLabel, { color: theme.colors.text }]}>Not it</Text>
                  </>
                )}
              </View>
            </PressableScale>
          </View>
          <View style={styles.flex}>
            <PressableScale
              onPress={add}
              disabled={done || adding}
              accessibilityRole="button"
              accessibilityLabel={yesLabel}
              accessibilityState={{ disabled: done || adding }}
              scaleTo={0.96}
            >
              <View
                style={[
                  styles.button,
                  { backgroundColor: done ? theme.colors.gain : theme.colors.accent },
                ]}
              >
                {!adding ? (
                  <>
                    <Ionicons name="checkmark" size={18} color={theme.colors.onAccent} />
                    <Text style={[styles.buttonLabel, { color: theme.colors.onAccent }]}>{yesLabel}</Text>
                  </>
                ) : (
                  <ActivityIndicator color={theme.colors.onAccent} />
                )}
              </View>
            </PressableScale>
          </View>
        </View>
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
    borderRadius: radius.lg + 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm + 2,
    gap: spacing.sm + 2,
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
  side: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  button: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
