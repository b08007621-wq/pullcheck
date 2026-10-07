import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { BINDER_COVER } from '@/components/binderArt';
import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { Holdable, type Point } from '@/components/Holdable';
import { IconButton } from '@/components/IconButton';
import { SheetModal } from '@/components/SheetModal';
import { useBinders } from '@/hooks/useBinders';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { setBrowseList } from '@/services/cardBrowse';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { CollectedCard } from '@/types/collection';
import { BINDER_COLOR_LABEL, BINDER_COLORS, pageCount, POCKETS, slotKeys } from '@/utils/binderPages';
import { itemPrice } from '@/utils/collectionValue';
import { formatMoney } from '@/utils/price';

type Geometry = {
  pad: number;
  gap: number;
  pocketW: number;
  pocketH: number;
  pageW: number;
  pageH: number;
  left: number;
  top: number;
};

type Drag = {
  key: string;
  from: number | null;
  image: string;
};

type TraySort = 'set' | 'value' | 'recent';

const CARD_RATIO = 88 / 63;
const EDGE = 28;
const TURN_MS = 650;
const TRAY_CARD = 64;

export default function BinderScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { width: screenWidth } = useWindowDimensions();
  const { binders, place, unplace, fill, update, removeBinder } = useBinders();
  const { items } = useCollection();
  const binder = binders.find((entry) => entry.id === id) ?? null;
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [flip] = useState(() => new Animated.Value(0));
  const [floating] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [lift] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<number | 'tray' | null>(null);
  const [sort, setSort] = useState<TraySort>('set');
  const [editing, setEditing] = useState(false);
  const [live] = useState(() => new PagerState());
  const areaView = useRef<View | null>(null);
  const trayView = useRef<View | null>(null);
  const frame = useRef<Point | null>(null);
  const trayTop = useRef<number | null>(null);
  const pageRef = useRef(0);
  const hoverRef = useRef<number | 'tray' | null>(null);
  const edgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justDropped = useRef(false);

  const cards = useMemo(() => items.filter((item): item is CollectedCard => item.kind === 'card'), [items]);
  const byKey = useMemo(() => new Map(cards.map((item) => [item.key, item])), [cards]);
  const placed = useMemo(() => (binder ? slotKeys(binder) : new Set<string>()), [binder]);
  const tray = useMemo(() => sortTray(cards.filter((item) => !placed.has(item.key)), sort), [cards, placed, sort]);
  const stats = useMemo(() => {
    let count = 0;
    let value = 0;
    for (const key of placed) {
      const item = byKey.get(key);
      if (!item) continue;
      count += 1;
      const price = itemPrice(item);
      if (price?.currency === 'USD') value += price.amount;
    }
    return { count, value };
  }, [placed, byKey]);
  const geometry = area ? layoutPage(area.w, area.h) : null;
  const total = binder ? pageCount(binder) + 1 : 1;

  useEffect(() => {
    live.sync(drag !== null, total, geometry?.pageW ?? 1);
  });

  useEffect(() => {
    const listener = flip.addListener(({ value }) => {
      const next = Math.round(value);
      live.page = next;
      if (next !== pageRef.current) {
        pageRef.current = next;
        setPage(next);
      }
    });
    return () => flip.removeListener(listener);
  }, [flip, live]);

  const [swipe] = useState(() => {
    let start = 0;
    const settle = (target: number) =>
      Animated.spring(flip, { toValue: target, damping: 20, stiffness: 170, mass: 0.9, useNativeDriver: true }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !live.dragging && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderGrant: () => {
        flip.stopAnimation();
        start = live.page;
      },
      onPanResponderMove: (_, gesture) => {
        const next = start - gesture.dx / Math.max(live.width, 1);
        flip.setValue(Math.min(Math.max(next, Math.max(0, start - 1)), Math.min(live.total - 1, start + 1)));
      },
      onPanResponderRelease: (_, gesture) => {
        const moved = start - gesture.dx / Math.max(live.width, 1) - gesture.vx * 0.35;
        const target = Math.round(Math.min(Math.max(moved, start - 1), start + 1));
        settle(Math.min(Math.max(target, 0), live.total - 1));
      },
      onPanResponderTerminate: () => settle(live.page),
    });
  });

  useEffect(
    () => () => {
      if (edgeTimer.current) clearTimeout(edgeTimer.current);
    },
    [],
  );

  if (!binder) {
    return (
      <DetailLayout centered>
        <EmptyState icon="book-outline" title="Binder not found" message="It may have been deleted." />
      </DetailLayout>
    );
  }

  const measure = () => {
    areaView.current?.measureInWindow((x, y) => {
      if (geometry) frame.current = { x: x + geometry.left, y: y + geometry.top };
    });
    trayView.current?.measureInWindow((_, y) => {
      trayTop.current = y;
    });
  };

  const goTo = (next: number) => {
    if (!area) return;
    const target = Math.min(Math.max(next, 0), total - 1);
    Animated.spring(flip, { toValue: target, damping: 20, stiffness: 170, mass: 0.9, useNativeDriver: true }).start();
  };

  const slotAt = (point: Point): number | null => {
    const origin = frame.current;
    if (!origin || !geometry || pageRef.current < 1) return null;
    const x = point.x - origin.x - geometry.pad;
    const y = point.y - origin.y - geometry.pad;
    const col = Math.floor(x / (geometry.pocketW + geometry.gap));
    const row = Math.floor(y / (geometry.pocketH + geometry.gap));
    if (col < 0 || col > 2 || row < 0 || row > 2) return null;
    return (pageRef.current - 1) * POCKETS + row * 3 + col;
  };

  const targetAt = (point: Point): number | 'tray' | null => {
    if (trayTop.current !== null && point.y >= trayTop.current) return 'tray';
    return slotAt(point);
  };

  const stopEdge = () => {
    if (edgeTimer.current) clearTimeout(edgeTimer.current);
    edgeTimer.current = null;
  };

  const watchEdge = (point: Point) => {
    const side = point.x > screenWidth - EDGE ? 1 : point.x < EDGE ? -1 : 0;
    if (side === 0 || (trayTop.current !== null && point.y >= trayTop.current)) {
      stopEdge();
      return;
    }
    if (edgeTimer.current) return;
    edgeTimer.current = setTimeout(() => {
      edgeTimer.current = null;
      const next = pageRef.current + side;
      if (next >= 1 && next < total) {
        haptics.selection();
        goTo(next);
      }
    }, TURN_MS);
  };

  const floatSize = geometry ? { w: geometry.pocketW, h: geometry.pocketH } : { w: TRAY_CARD, h: TRAY_CARD * CARD_RATIO };

  const startDrag = (key: string, from: number | null, image: string, point: Point): boolean => {
    if (drag) return false;
    measure();
    haptics.collect();
    floating.setValue({ x: point.x - floatSize.w / 2, y: point.y - floatSize.h / 2 });
    lift.setValue(0);
    Animated.spring(lift, { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }).start();
    hoverRef.current = from;
    setHover(from);
    setDrag({ key, from, image });
    return true;
  };

  const moveDrag = (point: Point) => {
    floating.setValue({ x: point.x - floatSize.w / 2, y: point.y - floatSize.h / 2 });
    const target = targetAt(point);
    if (target !== hoverRef.current) {
      hoverRef.current = target;
      if (target !== null) haptics.selection();
      setHover(target);
    }
    watchEdge(point);
  };

  const endDrag = (point: Point) => {
    stopEdge();
    const current = drag;
    const target = targetAt(point);
    justDropped.current = true;
    setTimeout(() => {
      justDropped.current = false;
    }, 400);
    if (current) {
      if (typeof target === 'number') {
        if (target !== current.from) place(binder.id, target, current.key, current.from);
        haptics.tap();
      } else if (target === 'tray' && current.from !== null) {
        unplace(binder.id, current.from);
        haptics.remove();
      }
    }
    hoverRef.current = null;
    setHover(null);
    setDrag(null);
  };

  const openCard = (item: CollectedCard) => {
    if (justDropped.current) return;
    haptics.tap();
    const ordered = Object.entries(binder.slots)
      .sort((first, second) => Number(first[0]) - Number(second[0]))
      .flatMap(([, key]) => {
        const entry = byKey.get(key);
        return entry ? [{ id: entry.card.id, entry: entry.key }] : [];
      });
    setBrowseList(ordered);
    router.push({ pathname: '/card/[id]', params: { id: item.card.id, entry: item.key } });
  };

  const renderPocket = (slot: number) => {
    if (!geometry) return null;
    const key = binder.slots[String(slot)];
    const item = key ? byKey.get(key) : undefined;
    const lifting = drag?.from === slot;
    const highlighted = hover === slot && drag !== null;
    return (
      <View
        key={slot}
        style={[
          styles.pocket,
          { width: geometry.pocketW, height: geometry.pocketH },
          highlighted && styles.pocketHover,
        ]}
      >
        {item ? (
          <Holdable
            style={StyleSheet.absoluteFill}
            enabled={!drag}
            onLift={(point) => startDrag(item.key, slot, item.card.images.small, point)}
            onMove={moveDrag}
            onDrop={endDrag}
          >
            <Pressable
              onPress={() => openCard(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.card.name}. Hold to move it.`}
              style={StyleSheet.absoluteFill}
            >
              <Image
                source={item.card.images.small}
                style={[styles.pocketCard, lifting && styles.pocketLifting]}
                contentFit="contain"
                recyclingKey={item.key}
              />
            </Pressable>
          </Holdable>
        ) : (
          <Text style={styles.pocketNumber}>{(slot % POCKETS) + 1}</Text>
        )}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.12)']}
          locations={[0, 0.35, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sleeve}
        />
      </View>
    );
  };

  const renderTrayItem = ({ item }: ListRenderItemInfo<CollectedCard>) => {
    const price = itemPrice(item);
    return (
      <Holdable
        enabled={!drag}
        delay={260}
        onLift={(point) => startDrag(item.key, null, item.card.images.small, point)}
        onMove={moveDrag}
        onDrop={endDrag}
        style={styles.trayCard}
      >
        <Pressable onPress={() => openCard(item)} accessibilityRole="button" accessibilityLabel={`${item.card.name}. Hold and drag into a pocket.`}>
          <Image source={item.card.images.small} style={styles.trayImage} contentFit="contain" recyclingKey={item.key} />
          <Text style={styles.trayPrice} numberOfLines={1}>
            {price ? formatMoney(price.amount, price.currency) : '—'}
          </Text>
        </Pressable>
      </Holdable>
    );
  };

  const pageLabel = page === 0 ? 'Cover' : `Page ${page} of ${total - 1}`;

  return (
    <DetailLayout
      centered
      topRight={
        <IconButton
          icon="create-outline"
          accessibilityLabel="Edit binder"
          onPress={() => {
            haptics.tap();
            setEditing(true);
          }}
        />
      }
    >
      <View style={styles.root}>
        <View style={styles.heading}>
          <Text style={styles.title} numberOfLines={1}>
            {binder.name}
          </Text>
          <Text style={styles.meta}>
            {`${stats.count} ${stats.count === 1 ? 'card' : 'cards'} · ${formatMoney(stats.value, 'USD')} · ${pageLabel}`}
          </Text>
        </View>

        <View
          ref={areaView}
          style={styles.area}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setArea({ w: width, h: height });
          }}
        >
          {area && geometry ? (
            <View style={StyleSheet.absoluteFill} {...swipe.panHandlers}>
              {Array.from({ length: total }, (_, order) => total - 1 - order).map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.page,
                    index === 0 && styles.coverPage,
                    {
                      left: geometry.left,
                      top: geometry.top,
                      width: geometry.pageW,
                      height: geometry.pageH,
                      transformOrigin: 'left center',
                      transform: [
                        { perspective: 1400 },
                        {
                          rotateY: flip.interpolate({
                            inputRange: [index, index + 1],
                            outputRange: ['0deg', '-180deg'],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {index === 0 ? (
                    <Pressable
                      onPress={() => goTo(1)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${binder.name}`}
                      style={StyleSheet.absoluteFill}
                    >
                      <Image source={BINDER_COVER[binder.color]} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <View style={styles.coverHint}>
                        <Text style={styles.coverHintText}>Swipe or tap to open</Text>
                      </View>
                    </Pressable>
                  ) : Math.abs(index - page) <= 1 ? (
                    <View style={[styles.grid, { padding: geometry.pad, gap: geometry.gap }]}>
                      {Array.from({ length: POCKETS }, (_, pocket) => renderPocket((index - 1) * POCKETS + pocket))}
                    </View>
                  ) : null}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.shade,
                      {
                        opacity: flip.interpolate({
                          inputRange: [index, index + 0.5],
                          outputRange: [0, 0.45],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  />
                </Animated.View>
              ))}
            </View>
          ) : null}
        </View>

        <View
          ref={trayView}
          style={[styles.tray, hover === 'tray' && drag?.from !== null && drag !== null && styles.trayHover]}
          onLayout={measure}
        >
          <View style={styles.trayHeader}>
            <Text style={styles.trayTitle}>
              {drag?.from !== null && drag ? 'Drop here to take it out' : `Not in this binder · ${tray.length}`}
            </Text>
            {tray.length > 0 ? (
              <Pressable
                onPress={() => {
                  haptics.collect();
                  fill(binder.id, sortTray(tray, 'set').map((item) => item.key));
                  goTo(Math.max(1, page));
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.fill}>Fill empty pockets</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.sorts}>
            <FilterChip label="By set" selected={sort === 'set'} onPress={() => setSort('set')} />
            <FilterChip label="By value" selected={sort === 'value'} onPress={() => setSort('value')} />
            <FilterChip label="Newest" selected={sort === 'recent'} onPress={() => setSort('recent')} />
          </View>
          {tray.length > 0 ? (
            <FlatList
              horizontal
              data={tray}
              keyExtractor={(item) => item.key}
              renderItem={renderTrayItem}
              scrollEnabled={!drag}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trayList}
              initialNumToRender={8}
              windowSize={5}
            />
          ) : (
            <Text style={styles.trayEmpty}>
              {cards.length === 0 ? 'Add cards to your collection to fill this binder.' : 'Every card is in this binder.'}
            </Text>
          )}
        </View>
      </View>

      {drag ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floating,
            {
              width: floatSize.w,
              height: floatSize.h,
              transform: [
                { translateX: floating.x },
                { translateY: floating.y },
                { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
              ],
            },
          ]}
        >
          <Image source={drag.image} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      ) : null}

      {editing ? (
        <SheetModal onClose={() => setEditing(false)}>
          <Text style={styles.sheetTitle}>Edit binder</Text>
          <TextInput
            defaultValue={binder.name}
            onEndEditing={(event) => {
              const name = event.nativeEvent.text.trim();
              if (name) update(binder.id, { name: name.slice(0, 32) });
            }}
            onSubmitEditing={(event) => {
              const name = event.nativeEvent.text.trim();
              if (name) update(binder.id, { name: name.slice(0, 32) });
            }}
            placeholder="Binder name"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            returnKeyType="done"
            maxLength={32}
          />
          <View style={styles.colors}>
            {BINDER_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => {
                  haptics.selection();
                  update(binder.id, { color });
                }}
                accessibilityRole="button"
                accessibilityLabel={BINDER_COLOR_LABEL[color]}
                accessibilityState={{ selected: binder.color === color }}
                style={[styles.colorOption, binder.color === color && styles.colorSelected]}
              >
                <Image source={BINDER_COVER[color]} style={styles.colorImage} contentFit="cover" />
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() =>
              Alert.alert('Delete this binder?', 'Your cards stay in your collection. Only the binder pages go away.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    setEditing(false);
                    removeBinder(binder.id);
                    router.back();
                  },
                },
              ])
            }
            accessibilityRole="button"
            style={styles.delete}
          >
            <Ionicons name="trash-outline" size={18} color={styles.deleteText.color} />
            <Text style={styles.deleteText}>Delete binder</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(false)} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </SheetModal>
      ) : null}
    </DetailLayout>
  );
}

class PagerState {
  dragging = false;
  total = 1;
  width = 1;
  page = 0;

  sync(dragging: boolean, total: number, width: number) {
    this.dragging = dragging;
    this.total = total;
    this.width = width;
  }
}

function layoutPage(width: number, height: number): Geometry {
  const pad = 10;
  const gap = 8;
  const fromWidth = (width - spacing.lg * 2 - pad * 2 - gap * 2) / 3;
  const fromHeight = ((height - spacing.md * 2 - pad * 2 - gap * 2) / 3) / CARD_RATIO;
  const pocketW = Math.max(40, Math.floor(Math.min(fromWidth, fromHeight)));
  const pocketH = Math.round(pocketW * CARD_RATIO);
  const pageW = pocketW * 3 + gap * 2 + pad * 2;
  const pageH = pocketH * 3 + gap * 2 + pad * 2;
  return { pad, gap, pocketW, pocketH, pageW, pageH, left: (width - pageW) / 2, top: (height - pageH) / 2 };
}

function sortTray(cards: CollectedCard[], sort: TraySort): CollectedCard[] {
  const list = [...cards];
  if (sort === 'value') {
    return list.sort((first, second) => (itemPrice(second)?.amount ?? 0) - (itemPrice(first)?.amount ?? 0));
  }
  if (sort === 'recent') return list.sort((first, second) => second.lastAddedAt.localeCompare(first.lastAddedAt));
  return list.sort(
    (first, second) =>
      first.card.set.releaseDate.localeCompare(second.card.set.releaseDate) ||
      first.card.set.name.localeCompare(second.card.set.name) ||
      numberOf(first.card.number) - numberOf(second.card.number) ||
      first.card.number.localeCompare(second.card.number),
  );
}

function numberOf(value: string): number {
  const parsed = Number.parseInt(value.replace(/\D+/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: spacing.sm,
    },
    heading: {
      paddingHorizontal: spacing.lg,
      gap: 2,
    },
    title: {
      ...typography.title,
      fontSize: 28,
      color: theme.colors.text,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    area: {
      flex: 1,
    },
    page: {
      position: 'absolute',
      borderRadius: radius.md,
      backgroundColor: '#1B2230',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    coverPage: {
      backgroundColor: 'transparent',
      borderRadius: radius.sm,
    },
    coverHint: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: spacing.md,
      alignItems: 'center',
    },
    coverHintText: {
      ...typography.caption,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.35)',
      overflow: 'hidden',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    pocket: {
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pocketHover: {
      borderWidth: 2,
      borderColor: theme.colors.accent,
      backgroundColor: withAlpha(theme.colors.accent, 0.25),
    },
    pocketCard: {
      position: 'absolute',
      top: 3,
      left: 3,
      right: 3,
      bottom: 3,
    },
    pocketLifting: {
      opacity: 0.25,
    },
    pocketNumber: {
      ...typography.caption,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.22)',
    },
    sleeve: {
      ...StyleSheet.absoluteFill,
    },
    shade: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#000000',
    },
    tray: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    trayHover: {
      backgroundColor: withAlpha(theme.colors.loss, 0.18),
      borderColor: theme.colors.loss,
    },
    trayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    trayTitle: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    fill: {
      ...typography.caption,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    sorts: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    trayList: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    trayCard: {
      width: TRAY_CARD,
    },
    trayImage: {
      width: TRAY_CARD,
      height: Math.round(TRAY_CARD * CARD_RATIO),
      borderRadius: 4,
    },
    trayPrice: {
      ...typography.caption,
      fontSize: 11,
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    trayEmpty: {
      ...typography.caption,
      color: theme.colors.textMuted,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    floating: {
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 100,
      elevation: 100,
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
    },
    sheetTitle: {
      ...typography.heading,
      color: theme.colors.text,
    },
    input: {
      ...typography.body,
      color: theme.colors.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    placeholder: {
      color: theme.colors.textFaint,
    },
    colors: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    colorOption: {
      flex: 1,
      aspectRatio: 0.83,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    colorSelected: {
      borderColor: theme.colors.accent,
    },
    colorImage: {
      width: '100%',
      height: '100%',
    },
    delete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    deleteText: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.loss,
    },
    done: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: theme.colors.accent,
    },
    doneText: {
      ...typography.label,
      color: theme.colors.onAccent,
    },
  });
}
