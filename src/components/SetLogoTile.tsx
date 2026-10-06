import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { formatShortDate, parseDate } from '@/utils/date';

import { PressableScale } from './PressableScale';

type Props = {
  set: SetInfo;
  onPress: (set: SetInfo) => void;
};

export function SetLogoTile({ set, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const released = parseDate(set.releaseDate);

  return (
    <PressableScale
      onPress={() => onPress(set)}
      accessibilityRole="button"
      accessibilityLabel={`${set.name} set`}
      style={styles.tile}
    >
      <View style={styles.logoBox}>
        {set.logo ? <Image source={set.logo} style={styles.logo} contentFit="contain" recyclingKey={set.id} /> : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {set.name}
      </Text>
      {released ? <Text style={styles.date}>{formatShortDate(released)}</Text> : null}
    </PressableScale>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tile: {
      width: 150,
      gap: 2,
    },
    logoBox: {
      height: 78,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    logo: {
      width: '100%',
      height: '100%',
    },
    name: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
    },
    date: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
    },
  });
}
