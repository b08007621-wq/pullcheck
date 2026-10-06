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
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useLocalizedCards, useScanCard } from '@/hooks/useScanCard';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { previewCard } from '@/services/tcgdex';
import { cardKey } from '@/state/collectionContext';
import { radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { Binder } from '@/types/collection';
import type { DexLanguage } from '@/types/tcgdex';
import { binderLabel } from '@/utils/binder';
import { cardVersionPrice, defaultVersion, resolveVersion } from '@/utils/cardVersion';

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
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 1.1;
const PAGE_DISTANCE = 60;
const CLOSE_AFTER_ADD_MS = 650;
const RIP_AUTO_ADD_MS = 1100;
const BIG_PULL_USD = 20;

export function ScanResultSheet({ result, ripping, bottomInset, onClose, onOpenCard, onAddPull }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { height } = useWindowDimensions();
  const { addCard, setBinder } = useCollection();
  const { fulfill } = useWishlist();
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState<DexLanguage>(result.language ?? 'en');
  const [added, setAdded] = useState<string | null>(null);
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

  const page = useCallback(
    (delta: number) => {
      setIndex((value) => {
        const next = Math.min(Math.max(value + delta, 0), count - 1);
        if (next !== value) haptics.selection();
        return next;
      });
    },
    [count, haptics],
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
    return Math.abs(pageY - dragRef.current.y) > 8 || Math.abs(pageX - dragRef.current.x) > 14;
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
    const { pageX, pageY } = event.nativeEvent;
    const drag = dragRef.current;
    const dx = pageX - drag.x;
    const dy = pageY - drag.y;
    const vertical = Math.abs(dy) >= Math.abs(dx);
    if (vertical && (dy > DISMISS_DISTANCE || drag.velocity > DISMISS_VELOCITY)) {
      close();
      return;
    }
    settle();
    if (!vertical && Math.abs(dx) > PAGE_DISTANCE) page(dx < 0 ? 1 : -1);
  };

  const add = useCallback(
    (binder: Binder | null) => {
      if (!card || added) return;
      const version = resolveVersion(card, defaultVersion(card));
      const price = cardVersionPrice(card, version);
      if (price && price.currency === 'USD' && price.amount >= BIG_PULL_USD) haptics.hit();
      else haptics.collect();
      if (ripping) {
        onAddPull(card);
        setAdded('Added to pull');
        return;
      }
      addCard(card, version);
      if (binder) setBinder(cardKey(card.id, version), binder);
      fulfill([card.id]);
      setAdded(binder ? `Added to ${binderLabel(binder)}` : 'Added to collection');
    },
    [card, added, ripping, haptics, onAddPull, addCard, setBinder, fulfill],
  );

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(close, CLOSE_AFTER_ADD_MS);
    return () => clearTimeout(timer);
  }, [added, close]);

  useEffect(() => {
    if (!ripping || !result.confirmed || !card || added) return;
    const timer = setTimeout(() => add(null), RIP_AUTO_ADD_MS);
    return () => clearTimeout(timer);
  }, [ripping, result.confirmed, card, added, add]);

  const shown = localized.find((entry) => entry.language === language) ?? null;
  const fallbackImage = candidate?.card.image ? `${candidate.card.image}/high.png` : null;
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
              name={shown?.name ?? card?.name ?? candidate.card.name}
              image={shown?.image ?? (card?.images.large || fallbackImage)}
              setName={shown?.setName ?? card?.set.name ?? candidate.card.set.name}
              number={card?.number ?? preview?.number ?? candidate.card.localId}
              card={card ?? preview}
              failed={error !== null}
            />
          ) : null}
          <View style={styles.languages}>
            <LanguagePills
              languages={localized.map((entry) => entry.language)}
              value={shown ? language : 'en'}
              onChange={setLanguage}
            />
          </View>
          <ScanResultActions
            ready={card !== null}
            added={added}
            primaryLabel={ripping ? 'Add to pull' : 'Add to collection'}
            onAdd={add}
            onOpen={() => {
              if (!card) return;
              closingRef.current = true;
              onOpenCard(card);
            }}
            showBinder={!ripping}
          />
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
});
