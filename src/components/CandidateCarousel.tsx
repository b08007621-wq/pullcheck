import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';
import { CARD_RATIO } from '@/utils/scanFrame';

type Props = {
  images: (string | null)[];
  index: number;
  height: number;
  onIndex: (index: number) => void;
};

const GAP = 14;

export function CandidateCarousel({ images, index, height, onIndex }: Props) {
  const theme = useTheme();
  const listRef = useRef<FlatList<string | null>>(null);
  const indexRef = useRef(index);
  const fromScroll = useRef(false);
  const [width, setWidth] = useState(0);
  const cardWidth = height * CARD_RATIO;
  const interval = cardWidth + GAP;
  const side = Math.max(0, (width - cardWidth) / 2);

  useEffect(() => {
    indexRef.current = index;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: index * interval, animated: true });
  }, [index, interval]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.x / interval), 0), images.length - 1);
    if (next === indexRef.current) return;
    indexRef.current = next;
    fromScroll.current = true;
    onIndex(next);
  };

  return (
    <View style={{ height }} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <FlatList
          ref={listRef}
          horizontal
          data={images}
          keyExtractor={(_, position) => String(position)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={interval}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEnabled={images.length > 1}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: side }}
          ItemSeparatorComponent={Separator}
          getItemLayout={(_, position) => ({ length: interval, offset: interval * position, index: position })}
          initialScrollIndex={index}
          renderItem={({ item, index: position }) => (
            <Pressable
              onPress={() => onIndex(position)}
              accessibilityRole="button"
              accessibilityLabel={`Card ${position + 1} of ${images.length}`}
              accessibilityState={{ selected: position === index }}
            >
              <View
                style={[
                  styles.frame,
                  { width: cardWidth, height, backgroundColor: theme.colors.surfaceRaised },
                  position !== index && styles.dim,
                ]}
              >
                {item ? (
                  <Image
                    source={item}
                    style={styles.image}
                    contentFit="cover"
                    transition={180}
                    recyclingKey={item}
                  />
                ) : null}
              </View>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}

function Separator() {
  return <View style={{ width: GAP }} />;
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  dim: {
    opacity: 0.45,
    transform: [{ scale: 0.92 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
