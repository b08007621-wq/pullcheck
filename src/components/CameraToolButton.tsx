import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { PressableScale } from './PressableScale';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
};

const SIZE = 54;

export function CameraToolButton({ icon, label, onPress, active = false, disabled = false }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        scaleTo={0.88}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active, disabled }}
      >
        <BlurView
          tint="systemUltraThinMaterialDark"
          intensity={60}
          style={[styles.button, active && { backgroundColor: theme.colors.accent }, disabled && styles.disabled]}
        >
          <Ionicons name={icon} size={24} color={active ? theme.colors.onAccent : '#FFFFFF'} />
        </BlurView>
      </PressableScale>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
});
