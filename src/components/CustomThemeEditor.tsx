import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import {
  ACCENT_SWATCHES,
  type CustomThemeSettings,
  type GlowLevel,
  radius,
  spacing,
  type ThemeMode,
  typography,
} from '@/theme';

import { GlassSurface } from './GlassSurface';
import { HueSlider } from './HueSlider';
import { HueSwatches } from './HueSwatches';
import { SegmentedControl } from './SegmentedControl';
import { SettingToggleRow } from './SettingToggleRow';

type Props = {
  value: CustomThemeSettings;
  onDraft: (changes: Partial<CustomThemeSettings>) => void;
  onCommit: (changes: Partial<CustomThemeSettings>) => void;
};

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const GLOWS: { value: GlowLevel; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'soft', label: 'Soft' },
  { value: 'vivid', label: 'Vivid' },
];

export function CustomThemeEditor({ value, onDraft, onCommit }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <GlassSurface style={styles.panel}>
        <HueSlider
          label="Accent color"
          value={value.accentHue}
          saturation={85}
          lightness={58}
          onChange={(accentHue) => onDraft({ accentHue })}
          onCommit={(accentHue) => onCommit({ accentHue })}
        />
        <HueSwatches
          hues={ACCENT_SWATCHES}
          value={value.accentHue}
          saturation={85}
          lightness={58}
          onSelect={(accentHue) => onCommit({ accentHue })}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <HueSlider
          label="Background tint"
          value={value.backgroundHue}
          saturation={value.mode === 'light' ? 60 : 55}
          lightness={value.mode === 'light' ? 85 : 30}
          onChange={(backgroundHue) => onDraft({ backgroundHue })}
          onCommit={(backgroundHue) => onCommit({ backgroundHue })}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.option}>
          <Text style={[styles.optionLabel, { color: theme.colors.text }]}>Mode</Text>
          <SegmentedControl options={MODES} value={value.mode} onChange={(mode) => onCommit({ mode })} />
        </View>
        <View style={styles.option}>
          <Text style={[styles.optionLabel, { color: theme.colors.text }]}>Background glow</Text>
          <SegmentedControl options={GLOWS} value={value.glow} onChange={(glow) => onCommit({ glow })} />
        </View>
      </GlassSurface>
      <SettingToggleRow
        icon="water-outline"
        title="Glass surfaces"
        description="See-through panels that let the colors behind them glow."
        value={value.glass}
        onChange={(glass) => onCommit({ glass })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  panel: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  option: {
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.label,
    fontSize: 15,
  },
});
