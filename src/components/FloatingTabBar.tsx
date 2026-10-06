import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, type GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCelebrate } from '@/hooks/useCelebrate';
import { useHaptics } from '@/hooks/useHaptics';

import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';

import { GlassSurface } from './GlassSurface';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { active: IconName; idle: IconName; label: string }> = {
  index: { active: 'scan', idle: 'scan-outline', label: 'Scan' },
  search: { active: 'search', idle: 'search-outline', label: 'Search' },
  collection: { active: 'albums', idle: 'albums-outline', label: 'Collection' },
};

const PADDING = 6;

export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const [width, setWidth] = useState(0);
  const [slide] = useState(() => new Animated.Value(state.index));
  const haptics = useHaptics();
  const rowRef = useRef<View>(null);
  const rowLeft = useRef(0);
  const dragIndex = useRef<number | null>(null);
  const startX = useRef(0);
  const count = state.routes.length;
  const itemWidth = width > 0 ? (width - PADDING * 2) / count : 0;

  useEffect(() => {
    if (dragIndex.current !== null) return;
    if (!motion) {
      slide.setValue(state.index);
      return;
    }
    Animated.spring(slide, { toValue: state.index, speed: 16, bounciness: 7, useNativeDriver: true }).start();
  }, [slide, state.index, motion]);

  const goTo = (index: number) => {
    const route = state.routes[index];
    if (!route || index === state.index) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const drag = (event: GestureResponderEvent) => {
    if (itemWidth <= 0) return;
    const x = event.nativeEvent.pageX - rowLeft.current - PADDING;
    const position = Math.min(Math.max(x / itemWidth - 0.5, 0), count - 1);
    slide.setValue(position);
    const index = Math.round(position);
    if (index !== dragIndex.current) {
      dragIndex.current = index;
      haptics.selection();
      goTo(index);
    }
  };

  const endDrag = () => {
    const index = dragIndex.current ?? state.index;
    dragIndex.current = null;
    Animated.spring(slide, { toValue: index, speed: 18, bounciness: 6, useNativeDriver: true }).start();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
    >
      <GlassSurface style={styles.bar} interactive>
        <View
          ref={rowRef}
          style={styles.row}
          onLayout={(event) => {
            setWidth(event.nativeEvent.layout.width);
            rowRef.current?.measureInWindow((x) => {
              rowLeft.current = x;
            });
          }}
          onTouchStart={(event) => {
            startX.current = event.nativeEvent.pageX;
          }}
          onMoveShouldSetResponderCapture={(event) => Math.abs(event.nativeEvent.pageX - startX.current) > 8}
          onResponderGrant={(event) => {
            dragIndex.current = state.index;
            rowRef.current?.measureInWindow((x) => {
              rowLeft.current = x;
            });
            drag(event);
          }}
          onResponderMove={drag}
          onResponderRelease={endDrag}
          onResponderTerminate={endDrag}
          onResponderTerminationRequest={() => false}
        >
          {itemWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                { width: itemWidth, transform: [{ translateX: Animated.multiply(slide, itemWidth) }] },
              ]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icon = ICONS[route.name];
            const options = descriptors[route.key]?.options;
            const badge = options?.tabBarBadge;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={icon?.label ?? route.name}
                onPress={onPress}
                style={styles.item}
              >
                <TabIcon focused={focused} icon={icon} landing={route.name === 'collection'} />
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{String(badge)}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

function TabIcon({
  focused,
  icon,
  landing,
}: {
  focused: boolean;
  icon: (typeof ICONS)[string] | undefined;
  landing: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const haptics = useHaptics();
  const { bump, setTarget } = useCelebrate();
  const wrapRef = useRef<View>(null);
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));
  const [kick] = useState(() => new Animated.Value(1));
  const [bubble] = useState(() => new Animated.Value(0));
  const bumpId = landing ? (bump?.id ?? null) : null;
  const bumpCount = landing ? (bump?.count ?? 0) : 0;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: motion ? 260 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, motion, progress]);

  useEffect(() => {
    if (bumpId === null) return;
    haptics.tap();
    if (!motion) return;
    kick.setValue(1);
    bubble.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(kick, { toValue: 1.38, speed: 40, bounciness: 14, useNativeDriver: true }),
        Animated.spring(kick, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      ]),
      Animated.timing(bubble, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [bumpId, haptics, motion, kick, bubble]);

  if (!icon) return null;
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const bubbleRise = bubble.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const bubbleFade = bubble.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      ref={wrapRef}
      onLayout={() => {
        if (!landing) return;
        wrapRef.current?.measureInWindow((x, y, width, height) => setTarget({ x: x + width / 2, y: y + height / 2 }));
      }}
      style={[styles.iconWrap, { transform: [{ translateY: lift }, { scale: Animated.multiply(scale, kick) }] }]}
    >
      <Ionicons
        name={focused ? icon.active : icon.idle}
        size={22}
        color={focused ? styles.activeColor.color : styles.idleColor.color}
      />
      <Text style={[styles.label, focused ? styles.activeColor : styles.idleColor]}>{icon.label}</Text>
      {landing && bumpCount > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.bubble, { opacity: bubbleFade, transform: [{ translateY: bubbleRise }] }]}
        >
          <Text style={styles.bubbleText}>{`+${bumpCount}`}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    bar: {
      width: '100%',
      maxWidth: 420,
      borderRadius: radius.lg + 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      padding: PADDING,
    },
    indicator: {
      position: 'absolute',
      top: PADDING,
      left: PADDING,
      bottom: PADDING,
      borderRadius: radius.lg + 6,
      backgroundColor: theme.colors.surfaceRaised,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    iconWrap: {
      alignItems: 'center',
      gap: 2,
    },
    label: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
    },
    activeColor: {
      color: theme.colors.accent,
    },
    idleColor: {
      color: theme.colors.textMuted,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: '24%',
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: theme.colors.gain,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.colors.background,
      fontSize: 11,
      fontWeight: '700',
    },
    bubble: {
      position: 'absolute',
      top: -6,
      right: -14,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: theme.colors.gain,
    },
    bubbleText: {
      color: theme.colors.background,
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
