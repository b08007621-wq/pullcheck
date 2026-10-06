import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CelebrateBurst } from '@/state/celebrateContext';

import { FlyingBurst } from './FlyingBurst';

type Props = {
  bursts: CelebrateBurst[];
  target: RefObject<{ x: number; y: number } | null>;
  onArrive: (burst: CelebrateBurst) => void;
  onLand: (burst: CelebrateBurst) => void;
};

export function CelebrateLayer({ bursts, target, onArrive, onLand }: Props) {
  if (bursts.length === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((burst) => (
        <FlyingBurst key={burst.id} burst={burst} target={target.current} onArrive={onArrive} onLand={onLand} />
      ))}
    </View>
  );
}
