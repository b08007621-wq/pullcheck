import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle: string;
  logo?: string | number | null;
  logoLabel?: string;
  logoCaption?: string;
  chips?: ReactNode;
  onLogoPress?: () => void;
  logoAction?: string;
};

export function DetailTitle({ title, subtitle, logo, logoLabel, logoCaption, chips, onLogoPress, logoAction }: Props) {
  const theme = useTheme();
  const [failedLogo, setFailedLogo] = useState<string | number | null>(null);
  const showLogo = Boolean(logo) && failedLogo !== logo;
  const action =
    onLogoPress && logoAction ? (
      <View style={styles.action}>
        <Text style={[styles.actionText, { color: theme.colors.accent }]}>{logoAction}</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.accent} />
      </View>
    ) : null;

  return (
    <View style={styles.block}>
      <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Pressable
        onPress={onLogoPress}
        disabled={!onLogoPress}
        accessibilityRole={onLogoPress ? 'button' : undefined}
        accessibilityLabel={onLogoPress && logoAction ? `${logoLabel ?? subtitle}. ${logoAction}` : undefined}
        style={({ pressed }) => [styles.logoRow, pressed && styles.pressed]}
      >
        {showLogo && logo ? (
          <>
            <Image
              source={logo}
              style={styles.logo}
              contentFit="contain"
              transition={200}
              accessibilityLabel={logoLabel ?? subtitle}
              onError={() => setFailedLogo(logo)}
            />
            {logoCaption ? (
              <Text style={[styles.caption, { color: theme.colors.textMuted }]}>{logoCaption}</Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
        )}
        {action}
      </Pressable>
      {chips ? <View style={styles.chips}>{chips}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  logoRow: {
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '700',
  },
  logo: {
    width: 200,
    height: 52,
  },
  caption: {
    ...typography.caption,
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
