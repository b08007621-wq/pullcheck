import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { COLLECTION_SECTIONS } from '@/state/settingsContext';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { CollectionSection } from '@/types/collection';
import { SECTION_LABEL } from '@/utils/collectionSections';

type Props = {
  order: CollectionSection[];
  hidden: CollectionSection[];
  onChange: (next: { order: CollectionSection[]; hidden: CollectionSection[] }) => void;
  onDragging?: (dragging: boolean) => void;
  liftDelay?: number;
};

type Drag = {
  section: CollectionSection;
  startY: number;
  startIndex: number;
  index: number;
  order: CollectionSection[];
  timer: ReturnType<typeof setTimeout> | null;
  lifted: boolean;
};

const TILE = 60;
const GAP = 8;
const SLOT = TILE + GAP;
const SLOP = 6;

export function SectionDragList({ order, hidden, onChange, onDragging, liftDelay = 260 }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [draft, setDraft] = useState<CollectionSection[] | null>(null);
  const [lifted, setLifted] = useState<CollectionSection | null>(null);
  const shown = draft ?? order;
  const [positions] = useState(() =>
    Object.fromEntries(COLLECTION_SECTIONS.map((section) => [section, new Animated.Value(Math.max(0, order.indexOf(section)) * SLOT)])) as Record<
      CollectionSection,
      Animated.Value
    >,
  );
  const [lift] = useState(() => new Animated.Value(0));
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    shown.forEach((section, index) => {
      if (section === lifted) return;
      Animated.spring(positions[section], { toValue: index * SLOT, damping: 22, stiffness: 260, useNativeDriver: true }).start();
    });
  }, [shown, lifted, positions]);

  const begin = (section: CollectionSection, event: GestureResponderEvent) => {
    const startIndex = shown.indexOf(section);
    const current: Drag = {
      section,
      startY: event.nativeEvent.pageY,
      startIndex,
      index: startIndex,
      order: shown,
      timer: null,
      lifted: false,
    };
    current.timer = setTimeout(() => {
      current.lifted = true;
      current.timer = null;
      haptics.collect();
      setDraft(shown);
      setLifted(section);
      onDragging?.(true);
      Animated.spring(lift, { toValue: 1, damping: 16, stiffness: 300, useNativeDriver: true }).start();
    }, liftDelay);
    drag.current = current;
  };

  const move = (event: GestureResponderEvent) => {
    const current = drag.current;
    if (!current) return;
    const dy = event.nativeEvent.pageY - current.startY;
    if (!current.lifted) {
      if (Math.abs(dy) > SLOP && current.timer) {
        clearTimeout(current.timer);
        current.timer = null;
      }
      return;
    }
    const count = current.order.length;
    const top = Math.min(Math.max(current.startIndex * SLOT + dy, -SLOT * 0.4), (count - 1) * SLOT + SLOT * 0.4);
    positions[current.section].setValue(top);
    const index = Math.min(Math.max(Math.round(top / SLOT), 0), count - 1);
    if (index !== current.index) {
      const next = current.order.filter((section) => section !== current.section);
      next.splice(index, 0, current.section);
      current.index = index;
      current.order = next;
      haptics.selection();
      setDraft(next);
    }
  };

  const end = () => {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (current.timer) clearTimeout(current.timer);
    if (!current.lifted) return;
    const finalOrder = current.order;
    Animated.spring(positions[current.section], {
      toValue: finalOrder.indexOf(current.section) * SLOT,
      damping: 20,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
    Animated.spring(lift, { toValue: 0, damping: 18, stiffness: 300, useNativeDriver: true }).start();
    setLifted(null);
    setDraft(null);
    onDragging?.(false);
    onChange({ order: finalOrder, hidden });
  };

  const toggle = (section: CollectionSection) => {
    haptics.selection();
    const isHidden = hidden.includes(section);
    onChange({ order: shown, hidden: isHidden ? hidden.filter((entry) => entry !== section) : [...hidden, section] });
  };

  return (
    <View style={[styles.list, { height: shown.length * SLOT - GAP }]}>
      {order.map((section) => {
        const isLifted = lifted === section;
        const isHidden = hidden.includes(section);
        const label = SECTION_LABEL[section];
        return (
          <Animated.View
            key={section}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(event) => begin(section, event)}
            onResponderMove={move}
            onResponderRelease={end}
            onResponderTerminate={end}
            onResponderTerminationRequest={() => !drag.current?.lifted}
            accessibilityRole="adjustable"
            accessibilityLabel={`${label.title}${isHidden ? ', hidden' : ''}. Hold and drag to move.`}
            style={[
              styles.tile,
              isLifted && styles.tileLifted,
              {
                zIndex: isLifted ? 2 : 1,
                transform: [
                  { translateY: positions[section] },
                  { scale: isLifted ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) : 1 },
                ],
              },
            ]}
          >
            <Ionicons name="reorder-three" size={22} color={styles.grip.color} />
            <View style={[styles.badge, isHidden && styles.badgeOff]}>
              <Ionicons name={label.icon} size={16} color={isHidden ? styles.grip.color : styles.icon.color} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, isHidden && styles.titleOff]} numberOfLines={1}>
                {label.title}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {isHidden ? 'Hidden' : label.detail}
              </Text>
            </View>
            <Pressable
              onPress={() => toggle(section)}
              accessibilityRole="switch"
              accessibilityState={{ checked: !isHidden }}
              accessibilityLabel={`Show ${label.title}`}
              hitSlop={10}
              style={styles.eye}
            >
              <Ionicons name={isHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={isHidden ? styles.grip.color : styles.icon.color} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    list: {
      position: 'relative',
    },
    tile: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: TILE,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    tileLifted: {
      shadowColor: '#000000',
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      borderColor: theme.colors.accent,
    },
    grip: {
      color: theme.colors.textFaint,
    },
    icon: {
      color: theme.colors.accent,
    },
    badge: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.accent, 0.14),
    },
    badgeOff: {
      backgroundColor: 'transparent',
    },
    text: {
      flex: 1,
      gap: 1,
    },
    title: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    titleOff: {
      color: theme.colors.textMuted,
    },
    detail: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    eye: {
      padding: 4,
    },
  });
}
