import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { CardIdentify } from '@/hooks/useCardIdentify';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { Rect, ScanPhoto, Size } from '@/types/scan';

import { IdentifyingBeam } from './IdentifyingBeam';
import { ScanPreviewActions } from './ScanPreviewActions';
import { ShineSweep } from './ShineSweep';

type Props = {
  photo: ScanPhoto;
  origin: Rect | null;
  view: Size;
  topInset: number;
  bottomInset: number;
  identify: CardIdentify;
  onRetake: () => void;
  onIdentify: () => void;
  onOpenCard: (card: Card) => void;
  onSearchName: (name: string) => void;
  ripTitle?: string | null;
};

const HEADER_SPACE = 76;
const ACTIONS_SPACE = 280;
const MAX_WIDTH = 320;
const CORNER = 16;

export function ScanPreview({
  photo,
  origin,
  view,
  topInset,
  bottomInset,
  identify,
  onRetake,
  onIdentify,
  onOpenCard,
  onSearchName,
  ripTitle = null,
}: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [progress] = useState(() => new Animated.Value(0));
  const busy = identify.stage === 'reading' || identify.stage === 'matching';

  const target = fitTarget(photo, view, topInset, bottomInset);

  useEffect(() => {
    progress.setValue(0);
    haptics.reveal();
    Animated.spring(progress, {
      toValue: 1,
      speed: 9,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  }, [photo.uri, progress, haptics]);

  const from = origin ?? {
    x: target.x + target.width * 0.1,
    y: target.y + 80,
    width: target.width * 0.8,
    height: target.height * 0.8,
  };
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from.x + from.width / 2 - (target.x + target.width / 2), 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from.y + from.height / 2 - (target.y + target.height / 2), 0],
  });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [from.width / target.width, 1] });
  const rotateY = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: ['0deg', '-16deg', '0deg'],
  });
  const fadeIn = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const actionsOpacity = progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, 0, 1] });
  const actionsShift = progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const heading = headingFor(identify, photo, ripTitle);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]}>
        <BlurView tint="dark" intensity={70} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
      </Animated.View>

      <Animated.View style={[styles.header, { top: topInset + spacing.lg, opacity: fadeIn }]}>
        <Text style={styles.title} accessibilityRole="header">
          {heading.title}
        </Text>
        <Text style={styles.subtitle}>{heading.subtitle}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.cardShadow,
          {
            left: target.x,
            top: target.y,
            width: target.width,
            height: target.height,
            shadowColor: theme.colors.accent,
            transform: [{ perspective: 1000 }, { translateX }, { translateY }, { scale }, { rotateY }],
          },
        ]}
      >
        <View style={[styles.cardClip, busy && { borderColor: theme.colors.accent, borderWidth: 2 }]}>
          <Image
            source={photo.uri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel="Captured card photo"
          />
          {busy ? (
            <IdentifyingBeam height={target.height} />
          ) : (
            <ShineSweep width={target.width} height={target.height} delayMs={450} />
          )}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.actions,
          { bottom: bottomInset + spacing.lg, opacity: actionsOpacity, transform: [{ translateY: actionsShift }] },
        ]}
      >
        <ScanPreviewActions
          photo={photo}
          identify={identify}
          onRetake={onRetake}
          onIdentify={onIdentify}
          onOpenCard={onOpenCard}
          onSearchName={onSearchName}
          ripping={ripTitle !== null}
        />
      </Animated.View>
    </View>
  );
}

function headingFor(identify: CardIdentify, photo: ScanPhoto, ripTitle: string | null): { title: string; subtitle: string } {
  switch (identify.stage) {
    case 'reading':
    case 'matching':
      return { title: 'Identifying…', subtitle: 'Hold tight, this takes a few seconds' };
    case 'error':
      return { title: 'Hmm', subtitle: 'Something got in the way' };
    case 'done':
      if (identify.match?.status === 'single') {
        return ripTitle
          ? { title: 'Pulled!', subtitle: 'Added to this opening' }
          : { title: 'Found it!', subtitle: 'Opening the card' };
      }
      if (identify.match?.status === 'multiple') return { title: 'Close match', subtitle: 'Pick your exact printing' };
      return { title: 'No match', subtitle: 'Try a clearer shot or search by name' };
    default:
      return {
        title: photo.source === 'camera' ? 'Got it' : 'Photo ready',
        subtitle: photo.cropped ? 'Cropped to the card frame' : 'Using the full photo',
      };
  }
}

function fitTarget(photo: Size, view: Size, topInset: number, bottomInset: number): Rect {
  const maxWidth = Math.min(view.width * 0.68, MAX_WIDTH);
  const maxHeight = Math.max(120, view.height - topInset - bottomInset - HEADER_SPACE - ACTIONS_SPACE - spacing.xl);
  const aspect = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 63 / 88;
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return {
    x: (view.width - width) / 2,
    y: topInset + HEADER_SPACE + spacing.lg,
    width,
    height,
  };
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(5,3,10,0.55)',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  cardShadow: {
    position: 'absolute',
    borderRadius: CORNER,
    shadowOpacity: 0.7,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  cardClip: {
    flex: 1,
    borderRadius: CORNER,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  actions: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
});
