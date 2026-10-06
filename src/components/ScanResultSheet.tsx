import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { AutoScanResult } from '@/hooks/useAutoScan';
import { useCelebrate } from '@/hooks/useCelebrate';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { loadScanCard, useLocalizedCards, useScanCard } from '@/hooks/useScanCard';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { previewCard } from '@/services/tcgdex';
import { cardKey } from '@/state/collectionContext';
import { radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { Binder } from '@/types/collection';
import type { DexLanguage } from '@/types/tcgdex';
import { binderLabel } from '@/utils/binder';
import { cardVersionPrice, resolveVersion } from '@/utils/cardVersion';
import { defaultVariant, getVariantOptions } from '@/utils/price';

import { CandidateCarousel } from './CandidateCarousel';
import { VariantPills } from './VariantPills';
import { GlassSurface } from './GlassSurface';
import { LanguagePills } from './LanguagePills';
import { PagerDots } from './PagerDots';
import { ScanResultActions } from './ScanResultActions';
import { ScanResultBody } from './ScanResultBody';

type Props = {
  result: AutoScanResult;
  ripping: boolean;
  bottomInset: number;
  onClose: () => void;
  onOpenCard: (card: Card) => void;
  onAddPull: (card: Card) => void;
  onAdded?: (key: string, variant: string | null) => void;
  onSearch?: (name: string) => void;
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 1.1;
const CLOSE_AFTER_ADD_MS = 650;
const BIG_PULL_USD = 20;
const IMAGE_HEIGHT = 236;

export function ScanResultSheet({
  result,
  ripping,
  bottomInset,
  onClose,
  onOpenCard,
  onAddPull,
  onAdded,
  onSearch,
}: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { height } = useWindowDimensions();
  const { addCard, setBinder } = useCollection();
  const { fulfill } = useWishlist();
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState<DexLanguage>(result.language ?? 'en');
  const [added, setAdded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { celebrate } = useCelebrate();
  const stageRef = useRef<View>(null);
  const [offset] = useState(() => new Animated.Value(height));
  const closingRef = useRef(false);
  const dragRef = useRef({ x: 0, y: 0, lastY: 0, lastT: 0, velocity: 0 });
  const candidate = result.candidates[index] ?? null;
  const { data: card, error } = useScanCard(candidate);
  const localized = useLocalizedCards(candidate);
  const preview = useMemo(
    () => (candidate ? previewCard(candidate.card, candidate.language) : null),
    [candidate],
  );
  const count = result.candidates.length;
  const [variantPick, setVariantPick] = useState<{ index: number; variant: string } | null>(null);
  const priced = card ?? preview;
  const variants = priced ? getVariantOptions(priced) : [];
  const variant =
    variantPick && variantPick.index === index ? variantPick.variant : priced ? defaultVariant(priced) : null;

  useEffect(() => {
    Animated.spring(offset, { toValue: 0, speed: 16, bounciness: 3, useNativeDriver: true }).start();
  }, [offset]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(offset, {
      toValue: height,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  }, [offset, height, onClose]);

  const pick = useCallback(
    (next: number) => {
      if (next === index) return;
      haptics.selection();
      setIndex(next);
      setLanguage(result.language ?? 'en');
    },
    [index, haptics, result.language],
  );

  const settle = () => {
    Animated.spring(offset, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }).start();
  };

  const startDrag = (event: GestureResponderEvent) => {
    const { pageX, pageY, timestamp } = event.nativeEvent;
    dragRef.current = { x: pageX, y: pageY, lastY: pageY, lastT: timestamp, velocity: 0 };
    return false;
  };

  const wantsDrag = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const dy = pageY - dragRef.current.y;
    return dy > 8 && Math.abs(dy) > Math.abs(pageX - dragRef.current.x) * 1.2;
  };

  const moveDrag = (event: GestureResponderEvent) => {
    const { pageX, pageY, timestamp } = event.nativeEvent;
    const drag = dragRef.current;
    const dy = pageY - drag.y;
    const elapsed = Math.max(1, timestamp - drag.lastT);
    drag.velocity = (pageY - drag.lastY) / elapsed;
    drag.lastY = pageY;
    drag.lastT = timestamp;
    if (Math.abs(dy) >= Math.abs(pageX - drag.x)) offset.setValue(Math.max(0, dy));
  };

  const endDrag = (event: GestureResponderEvent) => {
    const dy = event.nativeEvent.pageY - dragRef.current.y;
    if (dy > DISMISS_DISTANCE || dragRef.current.velocity > DISMISS_VELOCITY) {
      close();
      return;
    }
    settle();
  };

  const shown = localized.find((entry) => entry.language === language) ?? null;
  const images = result.candidates.map((entry, position) =>
    position === index
      ? (shown?.image ?? (card?.images.large || (entry.card.image ? `${entry.card.image}/high.webp` : null)))
      : entry.card.image
        ? `${entry.card.image}/high.webp`
        : null,
  );

  const add = useCallback(
    async (binder: Binder | null) => {
      if (!candidate || added || adding) return;
      setAdding(true);
      try {
        const target = card ?? (await loadScanCard(candidate));
        const version = resolveVersion(target, { variant, condition: 'NM' });
        const price = cardVersionPrice(target, version);
        if (price && price.currency === 'USD' && price.amount >= BIG_PULL_USD) haptics.hit();
        else haptics.collect();
        if (ripping) {
          onAddPull(target);
          setAdded('Added to pull');
        } else {
          addCard(target, version);
          if (binder) setBinder(cardKey(target.id, version), binder);
          fulfill([target.id]);
          setAdded(binder ? `Added to ${binderLabel(binder)}` : 'Added to collection');
        }
        onAdded?.(`${candidate.language}:${candidate.card.id}`, version.variant);
        const image = images[index] ?? target.images.small ?? null;
        const amount = price?.currency === 'USD' ? price.amount : null;
        stageRef.current?.measureInWindow((x, y, width) => {
          const cardWidth = IMAGE_HEIGHT * (63 / 88);
          const from = width > 0 ? { x: x + (width - cardWidth) / 2, y, width: cardWidth, height: IMAGE_HEIGHT } : null;
          celebrate({ image, amount, from, delay: CLOSE_AFTER_ADD_MS + 200 });
        });
      } catch {
        haptics.remove();
      } finally {
        setAdding(false);
      }
    },
    [candidate, added, adding, card, variant, ripping, haptics, onAddPull, addCard, setBinder, fulfill, onAdded, celebrate, images, index],
  );

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(close, CLOSE_AFTER_ADD_MS);
    return () => clearTimeout(timer);
  }, [added, close]);

  const backdrop = offset.interpolate({ inputRange: [0, height], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[styles.anchor, { transform: [{ translateY: offset }] }]}
        onStartShouldSetResponderCapture={startDrag}
        onMoveShouldSetResponderCapture={wantsDrag}
        onResponderMove={moveDrag}
        onResponderRelease={endDrag}
        onResponderTerminate={settle}
        onResponderTerminationRequest={() => false}
      >
        <GlassSurface
          variant="sheet"
          style={[styles.sheet, { paddingBottom: bottomInset + spacing.lg, borderColor: theme.colors.border }]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.colors.textFaint }]} />
          {count > 1 || !result.confirmed ? (
            <View style={styles.pickHeader}>
              <Text style={[styles.pickTitle, { color: theme.colors.textMuted }]}>
                {count > 1
                  ? `${result.printed ? `${result.printed} matches ${count} cards` : `${count} possible cards`} · swipe to pick`
                  : `Best guess${result.printed ? ` for ${result.printed}` : ''} · check it’s yours`}
              </Text>
              <PagerDots count={count} index={index} />
            </View>
          ) : null}
          {candidate ? (
            <ScanResultBody
              media={
                <View ref={stageRef} style={styles.bleed}>
                  <CandidateCarousel images={images} index={index} height={IMAGE_HEIGHT} onIndex={pick} />
                </View>
              }
              name={shown?.name ?? card?.name ?? candidate.card.name}
              image={images[index] ?? null}
              setName={shown?.setName ?? card?.set.name ?? candidate.card.set.name}
              number={card?.number ?? preview?.number ?? candidate.card.localId}
              card={priced}
              variant={variant}
              pricing={card === null && error === null}
              failed={error !== null}
            />
          ) : null}
          {variants.length > 1 && !added ? (
            <View style={styles.languages}>
              <VariantPills
                variants={variants}
                value={variant}
                onChange={(next) => setVariantPick({ index, variant: next })}
              />
            </View>
          ) : null}
          <View style={styles.languages}>
            <LanguagePills
              languages={localized.map((entry) => entry.language)}
              value={shown ? language : 'en'}
              onChange={setLanguage}
            />
          </View>
          <ScanResultActions
            ready={!adding}
            added={added}
            primaryLabel={ripping ? 'Add to pull' : 'Add to collection'}
            onAdd={add}
            onOpen={async () => {
              if (!candidate || adding) return;
              setAdding(true);
              const target = card ?? (await loadScanCard(candidate).catch(() => null));
              setAdding(false);
              if (!target) return;
              closingRef.current = true;
              onOpenCard(target);
            }}
            showBinder={!ripping}
          />
          {onSearch && (count > 1 || !result.confirmed) ? (
            <Pressable
              onPress={() => {
                closingRef.current = true;
                onSearch(candidate?.card.name ?? '');
              }}
              accessibilityRole="button"
              accessibilityLabel="None of these, search instead"
              style={styles.searchLink}
            >
              <Text style={[styles.searchText, { color: theme.colors.textMuted }]}>None of these? Search instead</Text>
            </Pressable>
          ) : null}
        </GlassSurface>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: radius.lg + 12,
    borderTopRightRadius: radius.lg + 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    opacity: 0.6,
  },
  pickHeader: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  pickTitle: {
    ...typography.caption,
  },
  languages: {
    alignItems: 'center',
    minHeight: 4,
  },
  bleed: {
    alignSelf: 'stretch',
    marginHorizontal: -spacing.lg,
  },
  searchLink: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  searchText: {
    ...typography.caption,
    fontSize: 14,
  },
});
