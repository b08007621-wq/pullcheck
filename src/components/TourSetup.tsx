import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, type ThemeId, THEMES, typography } from '@/theme';
import { withAlpha } from '@/theme/color';
import type { Game } from '@/types/card';
import type { IconName } from '@/types/icon';
import { GAMES } from '@/utils/game';
import { FOCUS_OPTIONS, LAYOUT_OPTIONS, type LayoutPreset, type TourFocus } from '@/utils/tourPresets';

import { GameEmblem } from './GameEmblem';
import { PressableScale } from './PressableScale';
import { ThemePreview } from './ThemePreview';

const LOOKS: ThemeId[] = ['aero', 'aeroBlack'];

type OptionProps = {
  label: string;
  detail?: string;
  selected: boolean;
  badge?: string;
  onPress: () => void;
  leading: ReactNode;
};

function Option({ label, detail, selected, badge, onPress, leading }: OptionProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      scaleTo={0.98}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      <View style={[styles.option, selected && styles.optionSelected]}>
        <View style={styles.leading}>{leading}</View>
        <View style={styles.optionText}>
          <View style={styles.optionHead}>
            <Text style={styles.optionLabel}>{label}</Text>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          {detail ? <Text style={styles.optionDetail}>{detail}</Text> : null}
        </View>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? theme.colors.accent : theme.colors.textFaint}
        />
      </View>
    </PressableScale>
  );
}

function IconBubble({ icon }: { icon: IconName }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.bubble}>
      <Ionicons name={icon} size={20} color={theme.colors.accent} />
    </View>
  );
}

type GamesProps = {
  value: Game[];
  onToggle: (game: Game) => void;
};

export function GamesStep({ value, onToggle }: GamesProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {GAMES.map((entry) => (
        <Option
          key={entry.game}
          label={entry.label}
          selected={value.includes(entry.game)}
          onPress={() => onToggle(entry.game)}
          leading={<GameEmblem game={entry.game} size={30} />}
        />
      ))}
    </View>
  );
}

type FocusProps = {
  value: TourFocus[];
  onToggle: (focus: TourFocus) => void;
};

export function FocusStep({ value, onToggle }: FocusProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {FOCUS_OPTIONS.map((entry) => (
        <Option
          key={entry.value}
          label={entry.label}
          detail={entry.detail}
          selected={value.includes(entry.value)}
          onPress={() => onToggle(entry.value)}
          leading={<IconBubble icon={entry.icon} />}
        />
      ))}
    </View>
  );
}

type LookProps = {
  value: string;
  onPick: (id: ThemeId) => void;
};

export function LookStep({ value, onPick }: LookProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  return (
    <View style={styles.looks}>
      {LOOKS.map((id) => {
        const look = THEMES[id];
        const selected = value === id;
        return (
          <PressableScale
            key={id}
            style={styles.look}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={look.name}
            scaleTo={0.97}
            onPress={() => {
              haptics.selection();
              onPick(id);
            }}
          >
            <View style={[styles.lookFrame, selected && { borderColor: theme.colors.accent, borderWidth: 2 }]}>
              <ThemePreview theme={look} compact />
            </View>
            <View style={styles.lookCaption}>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={selected ? theme.colors.accent : theme.colors.textFaint}
              />
              <Text style={styles.lookName}>{look.name}</Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

type LayoutProps = {
  value: LayoutPreset | null;
  recommended: LayoutPreset;
  onPick: (layout: LayoutPreset) => void;
};

export function LayoutStep({ value, recommended, onPick }: LayoutProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {LAYOUT_OPTIONS.map((entry) => (
        <Option
          key={entry.value}
          label={entry.label}
          detail={entry.detail}
          badge={entry.value === recommended ? 'Suggested' : undefined}
          selected={value === entry.value}
          onPress={() => onPick(entry.value)}
          leading={<IconBubble icon={entry.icon} />}
        />
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    optionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: withAlpha(theme.colors.accent, 0.12),
    },
    leading: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubble: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.accent, 0.14),
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    optionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    optionLabel: {
      ...typography.label,
      color: theme.colors.text,
    },
    optionDetail: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.onAccent,
    },
    looks: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    look: {
      flex: 1,
      gap: spacing.sm,
    },
    lookFrame: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    lookCaption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    lookName: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
  });
}
