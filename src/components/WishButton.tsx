import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';

import { IconButton } from './IconButton';

type Props = {
  wished: boolean;
  onToggle: () => void;
};

export function WishButton({ wished, onToggle }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [pop] = useState(() => new Animated.Value(1));
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (!wished || first) return;
    pop.setValue(0.7);
    Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 18, useNativeDriver: true }).start();
  }, [wished, pop]);

  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <IconButton
        icon={wished ? 'heart' : 'heart-outline'}
        color={wished ? theme.colors.loss : undefined}
        accessibilityLabel={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        onPress={() => {
          if (wished) haptics.selection();
          else haptics.collect();
          onToggle();
        }}
      />
    </Animated.View>
  );
}
