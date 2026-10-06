import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

import { PressableScale } from './PressableScale';

type Props = {
  owned: number;
  onCollect: () => void;
  detail?: string | null;
};

const CONFIRM_MS = 1600;

export function CollectButton({ owned, onCollect, detail }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [presses, setPresses] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [pop] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming, presses]);

  const handlePress = () => {
    haptics.collect();
    onCollect();
    setPresses((value) => value + 1);
    setConfirming(true);
    pop.setValue(0.94);
    Animated.spring(pop, { toValue: 1, speed: 16, bounciness: 8, useNativeDriver: true }).start();
  };

  const label = confirming
    ? owned > 1
      ? `Added · you own ${owned}`
      : 'Added to collection'
    : owned > 0
      ? 'Add another copy'
      : 'Add to collection';

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <PressableScale
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={detail ? `${label}, ${detail}` : label}
          style={[styles.button, { backgroundColor: confirming ? theme.colors.gain : theme.colors.accent }]}
        >
          <View style={styles.content}>
            <Ionicons name={confirming ? 'checkmark' : 'add'} size={20} color={theme.colors.onAccent} />
            <View style={styles.text}>
              <Text style={[styles.label, { color: theme.colors.onAccent }]}>{label}</Text>
              {detail ? (
                <Text style={[styles.detail, { color: theme.colors.onAccent }]} numberOfLines={1}>
                  {detail}
                </Text>
              ) : null}
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  button: {
    borderRadius: radius.md + 2,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  text: {
    alignItems: 'center',
  },
  label: {
    ...typography.label,
    fontSize: 17,
  },
  detail: {
    ...typography.caption,
    fontSize: 12,
    opacity: 0.8,
  },
});
