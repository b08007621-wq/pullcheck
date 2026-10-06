import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { formatDate, parseDate } from '@/utils/date';

import { Chip } from './Chip';

type Props = {
  set: SetInfo;
};

export function SetHero({ set }: Props) {
  const styles = useThemedStyles(createStyles);
  const released = parseDate(set.releaseDate);
  const secrets = set.total - set.printedTotal;

  return (
    <View style={styles.hero}>
      {set.logo ? (
        <Image source={set.logo} style={styles.logo} contentFit="contain" accessibilityLabel={`${set.name} logo`} />
      ) : null}
      <Text style={styles.name} accessibilityRole="header">
        {set.name}
      </Text>
      <View style={styles.chips}>
        <View style={styles.series}>
          {set.symbol ? <Image source={set.symbol} style={styles.symbol} contentFit="contain" /> : null}
          <Text style={styles.seriesText}>{set.series}</Text>
        </View>
        {released ? <Chip label={formatDate(released)} /> : null}
        {set.ptcgoCode ? <Chip label={set.ptcgoCode} tone="accent" /> : null}
        {secrets > 0 ? <Chip label={`${secrets} secret rares`} tone="gain" /> : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    hero: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    logo: {
      width: '78%',
      height: 104,
    },
    name: {
      ...typography.heading,
      fontSize: 24,
      textAlign: 'center',
      color: theme.colors.text,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
    },
    series: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginRight: spacing.xs,
    },
    symbol: {
      width: 18,
      height: 18,
    },
    seriesText: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
