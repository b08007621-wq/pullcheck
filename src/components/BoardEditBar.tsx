import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Board } from '@/hooks/useBoard';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { IconName } from '@/types/icon';

import { GlassSurface } from './GlassSurface';
import { Gloss } from './Gloss';

type Props = {
  hidden: { key: string; label: string }[];
  onShow: (key: string) => void;
  onTidy: () => void;
  onReset: () => void;
  onDone: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
};

export function BoardEditBar({ hidden, onShow, onTidy, onReset, onDone, onUndo, canUndo = false }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(rise, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }).start();
  }, [rise]);

  return (
    <Animated.View
      style={{
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
      }}
    >
      <GlassSurface style={styles.bar}>
        <View style={styles.top}>
          <View style={styles.text}>
            <Text style={styles.title}>Editing this page</Text>
            <Text style={styles.hint}>Hold and drag to move · Drag the corner to resize</Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.tap();
              onDone();
            }}
            accessibilityRole="button"
            style={styles.done}
          >
            <Gloss />
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          {onUndo ? (
            <BarButton
              icon="arrow-undo-outline"
              label="Undo"
              disabled={!canUndo}
              onPress={() => {
                haptics.selection();
                onUndo();
              }}
            />
          ) : null}
          <BarButton
            icon="reorder-four-outline"
            label="All full width"
            onPress={() => {
              haptics.selection();
              onTidy();
            }}
          />
          <BarButton
            icon="refresh-outline"
            label="Reset"
            onPress={() => {
              haptics.selection();
              onReset();
            }}
          />
        </View>
        {hidden.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hidden}>
            {hidden.map((entry) => (
              <Pressable
                key={entry.key}
                onPress={() => {
                  haptics.collect();
                  onShow(entry.key);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Show ${entry.label}`}
                style={styles.chip}
              >
                <Ionicons name="add" size={15} color={styles.chipText.color} />
                <Text style={styles.chipText}>{entry.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </GlassSurface>
    </Animated.View>
  );
}

export function BoardControls({ board, widgets }: { board: Board; widgets: { key: string; label: string }[] }) {
  return (
    <View style={fill}>
      <BoardEditBar
      hidden={widgets
        .filter((widget) => board.layout.hidden.includes(widget.key))
        .map((widget) => ({ key: widget.key, label: widget.label }))}
      onShow={board.show}
      onTidy={board.tidy}
      onReset={board.reset}
      onDone={board.done}
      onUndo={board.undo}
      canUndo={board.canUndo}
      />
    </View>
  );
}

const fill = { flex: 1 };

function BarButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={16} color={styles.buttonText.color} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    bar: {
      padding: spacing.md,
      gap: spacing.sm,
      borderRadius: radius.lg,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.label,
      color: theme.colors.text,
    },
    hint: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    done: {
      overflow: 'hidden',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    doneText: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.onAccent,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surfaceRaised,
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.4,
    },
    buttonText: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
    },
    hidden: {
      gap: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.accent,
      backgroundColor: withAlpha(theme.colors.accent, 0.1),
    },
    chipText: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.accent,
    },
  });
}
