import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { itemTitle } from '@/utils/collectionValue';

import { GlassSurface } from './GlassSurface';

const SHOW_MS = 6000;
const TOP_OFFSET = 64;

export function UndoToast() {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { removed, undoRemove, dismissRemoved } = useCollection();
  const [slide] = useState(() => new Animated.Value(0));
  const [timer] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!removed) return;
    slide.setValue(0);
    timer.setValue(1);
    Animated.spring(slide, { toValue: 1, damping: 16, stiffness: 220, useNativeDriver: true }).start();
    const countdown = Animated.timing(timer, { toValue: 0, duration: SHOW_MS, useNativeDriver: true });
    countdown.start(({ finished }) => {
      if (!finished) return;
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => dismissRemoved());
    });
    return () => countdown.stop();
  }, [removed, slide, timer, dismissRemoved]);

  if (!removed) return null;

  const title = itemTitle(removed.item);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + TOP_OFFSET,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
        },
      ]}
    >
      <GlassSurface style={styles.toast}>
        <View style={styles.icon}>
          <Ionicons name="trash-outline" size={16} color={styles.iconColor.color} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          Removed {title}
        </Text>
        <Pressable
          onPress={() => {
            haptics.collect();
            undoRemove();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Undo removing ${title}`}
          hitSlop={10}
          style={styles.undo}
        >
          <Ionicons name="arrow-undo" size={15} color={styles.undoText.color} />
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
        <Animated.View style={[styles.progress, { transform: [{ scaleX: timer }] }]} />
      </GlassSurface>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 90,
      elevation: 90,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceRaised,
    },
    iconColor: {
      color: theme.colors.loss,
    },
    text: {
      ...typography.label,
      fontSize: 15,
      flex: 1,
      color: theme.colors.text,
    },
    undo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    undoText: {
      ...typography.label,
      fontSize: 14,
      color: theme.colors.onAccent,
    },
    progress: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      backgroundColor: theme.colors.accent,
    },
  });
}
