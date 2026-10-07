import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useSetSymbol } from '@/hooks/useSetSymbol';
import { useTheme } from '@/hooks/useTheme';
import { radius, typography } from '@/theme';
import type { GameSet } from '@/types/gameSet';

type Props = {
  set: Pick<GameSet, 'id' | 'code' | 'icon' | 'iconIsSymbol'>;
  width: number;
  height: number;
};

export function GameSetIcon({ set, width, height }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const symbol = useSetSymbol(set.iconIsSymbol ? set.icon : null);
  const showImage = !set.iconIsSymbol && set.icon !== null && failed !== set.icon;
  const symbolPending = set.iconIsSymbol && set.icon !== null && !symbol.xml && !symbol.failed;

  return (
    <View style={[styles.box, { width, height }]}>
      {symbol.xml ? (
        <View style={styles.symbol}>
          <SvgXml xml={symbol.xml} width="100%" height="100%" color={theme.colors.text} />
        </View>
      ) : symbolPending ? null : showImage && set.icon ? (
        <Image source={set.icon} style={styles.art} contentFit="contain" recyclingKey={set.id} onError={() => setFailed(set.icon)} />
      ) : (
        <Text style={[styles.code, { color: theme.colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
          {set.code.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  symbol: {
    width: '62%',
    height: '62%',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  code: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
