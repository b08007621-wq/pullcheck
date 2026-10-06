import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { Card } from '@/types/card';

import { PressableScale } from './PressableScale';

type Props = {
  card: Card;
  onPress?: () => void;
};

const CARD_RATIO = 63 / 88;

export function CardHero({ card, onPress }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.7, 340);
  const cardHeight = cardWidth / CARD_RATIO;
  const cornerRadius = cardWidth * 0.045;

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        scaleTo={0.98}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityHint={onPress ? 'Opens the card in 3D' : undefined}
        style={[
          styles.glow,
          { width: cardWidth, height: cardHeight, borderRadius: cornerRadius, shadowColor: theme.colors.accent },
        ]}
      >
        <Image
          source={card.images.large}
          placeholder={card.images.small}
          placeholderContentFit="contain"
          style={[styles.image, { borderRadius: cornerRadius }]}
          contentFit="contain"
          transition={250}
          accessibilityLabel={`${card.name} from ${card.set.name}`}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  glow: {
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
