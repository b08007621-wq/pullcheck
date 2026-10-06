import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/theme';
import { supportsLiquidGlass } from '@/utils/glass';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  variant?: 'panel' | 'sheet';
};

export function GlassSurface({ children, style, interactive = false, variant = 'panel' }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const sheet = variant === 'sheet';

  if (!theme.glass) {
    return <View style={[styles.solid, sheet && styles.solidSheet, style]}>{children}</View>;
  }

  if (supportsLiquidGlass()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={theme.mode}
        isInteractive={interactive}
        tintColor={sheet ? styles.sheetTint.backgroundColor : undefined}
        style={[styles.glass, style]}
      >
        {children}
      </GlassView>
    );
  }

  const light = theme.mode === 'light';
  return (
    <BlurView
      tint={
        sheet
          ? light
            ? 'systemThickMaterialLight'
            : 'systemThickMaterialDark'
          : light
            ? 'systemUltraThinMaterialLight'
            : 'systemUltraThinMaterialDark'
      }
      intensity={sheet ? 100 : 70}
      style={[styles.glass, styles.blur, sheet && styles.sheetTint, style]}
    >
      {children}
    </BlurView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    solid: {
      backgroundColor: theme.colors.surface,
    },
    solidSheet: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    glass: {
      overflow: 'hidden',
    },
    blur: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    sheetTint: {
      backgroundColor: theme.mode === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(18,12,30,0.55)',
    },
  });
}
