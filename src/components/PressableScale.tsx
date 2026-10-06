import { type ReactNode, useState } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export function PressableScale({ children, style, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: toValue === 1 ? 8 : 0,
      useNativeDriver: true,
    }).start();

  const handlePressIn = (event: GestureResponderEvent) => {
    animateTo(scaleTo);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1);
    onPressOut?.(event);
  };

  return (
    <Pressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
