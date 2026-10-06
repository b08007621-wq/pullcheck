import { useEffect, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PADDING = 2;

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(0));
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segmentWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;
  const thumb = theme.mode === 'light' ? '#FFFFFF' : '#636366';

  useEffect(() => {
    Animated.spring(position, {
      toValue: index * segmentWidth,
      speed: 22,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }, [index, segmentWidth, position]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.track,
        { backgroundColor: theme.mode === 'light' ? 'rgba(118,118,128,0.12)' : 'rgba(118,118,128,0.24)' },
      ]}
      accessibilityRole="tablist"
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { width: segmentWidth, backgroundColor: thumb, transform: [{ translateX: position }] },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
          >
            <Text
              style={[styles.label, { color: theme.colors.text, fontWeight: selected ? '600' : '500' }]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PADDING,
    borderRadius: radius.sm + 3,
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: radius.sm + 1,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
  },
});
