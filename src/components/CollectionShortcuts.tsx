import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useBinders } from "@/hooks/useBinders";
import { useCollection } from "@/hooks/useCollection";
import { useHaptics } from "@/hooks/useHaptics";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useWishlist } from "@/hooks/useWishlist";
import { type AppTheme, radius, spacing, typography } from "@/theme";
import type { IconName } from "@/types/icon";

import { PressableScale } from "./PressableScale";
import { ShortcutTile } from "./ShortcutTile";

type Props = {
  variant?: "list" | "row";
};

type Shortcut = {
  icon: IconName;
  title: string;
  short: string;
  detail: string;
  path: "/sets" | "/binders" | "/upcoming" | "/trade" | "/wishlist";
  highlight?: boolean;
};

export function CollectionShortcuts({ variant = "list" }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { items } = useCollection();
  const wishlist = useWishlist();
  const { binders } = useBinders();
  const started = useMemo(
    () =>
      new Set(
        items.flatMap((item) =>
          item.kind === "card" ? [item.card.set.id] : [],
        ),
      ).size,
    [items],
  );

  const wishDetail =
    wishlist.hits > 0
      ? `${wishlist.hits} under target`
      : wishlist.items.length > 0
        ? `${wishlist.items.length} ${wishlist.items.length === 1 ? "card" : "cards"}`
        : "Watch prices";

  const shortcuts: Shortcut[] = [
    {
      icon: "grid-outline",
      title: "Sets",
      short: "Sets",
      detail: started > 0 ? `${started} started` : "Every set",
      path: "/sets",
    },
    {
      icon: "book-outline",
      title: "Binders",
      short: "Binders",
      detail: binders.length > 0 ? `${binders.length} ${binders.length === 1 ? "binder" : "binders"}` : "Pages & pockets",
      path: "/binders",
    },
    {
      icon: "calendar-outline",
      title: "Upcoming sets",
      short: "Upcoming",
      detail: "Pre-orders",
      path: "/upcoming",
    },
    {
      icon: "swap-horizontal-outline",
      title: "Trade check",
      short: "Trade",
      detail: "Who wins?",
      path: "/trade",
    },
    {
      icon: "heart-outline",
      title: "Wishlist",
      short: "Wishlist",
      detail: wishDetail,
      path: "/wishlist",
      highlight: wishlist.hits > 0,
    },
  ];

  const open = (path: Shortcut["path"]) => {
    haptics.tap();
    router.push(path);
  };

  if (variant === "row") {
    return (
      <View style={styles.row}>
        {shortcuts.map((shortcut) => (
          <View key={shortcut.path} style={styles.cell}>
            <PressableScale
              onPress={() => open(shortcut.path)}
              accessibilityRole="button"
              accessibilityLabel={`${shortcut.title}, ${shortcut.detail}`}
              style={styles.tile}
            >
              <Ionicons
                name={shortcut.icon}
                size={22}
                color={styles.icon.color}
              />
              <Text style={styles.tileText} numberOfLines={1}>
                {shortcut.short}
              </Text>
              {shortcut.highlight ? <View style={styles.dot} /> : null}
            </PressableScale>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {shortcuts.map((shortcut, index) => (
        <ShortcutTile
          key={shortcut.path}
          icon={shortcut.icon}
          title={shortcut.title}
          detail={shortcut.detail}
          position={
            index === 0
              ? "first"
              : index === shortcuts.length - 1
                ? "last"
                : "middle"
          }
          highlight={shortcut.highlight}
          onPress={() => open(shortcut.path)}
        />
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    cell: {
      flex: 1,
    },
    tile: {
      alignItems: "center",
      gap: 4,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
    },
    icon: {
      color: theme.colors.accent,
    },
    tileText: {
      ...typography.caption,
      fontWeight: "600",
      color: theme.colors.text,
    },
    dot: {
      position: "absolute",
      top: 8,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.gain,
    },
  });
}
