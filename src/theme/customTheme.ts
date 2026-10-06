import { hsl, readableOn } from './color';
import type { AppTheme, ThemeMode } from './themes';

export type GlowLevel = 'off' | 'soft' | 'vivid';

export type CustomThemeSettings = {
  accentHue: number;
  backgroundHue: number;
  mode: ThemeMode;
  glass: boolean;
  glow: GlowLevel;
};

export const DEFAULT_CUSTOM_THEME: CustomThemeSettings = {
  accentHue: 318,
  backgroundHue: 265,
  mode: 'dark',
  glass: false,
  glow: 'soft',
};

export const ACCENT_SWATCHES = [275, 318, 345, 18, 45, 140, 178, 212];

const GLOW_OPACITY: Record<GlowLevel, number> = { off: 0, soft: 0.5, vivid: 0.9 };

export function buildCustomTheme(settings: CustomThemeSettings): AppTheme {
  const { accentHue: a, backgroundHue: b, glass, glow } = settings;
  const auroraOpacity = GLOW_OPACITY[glow];

  if (settings.mode === 'light') {
    const accent = hsl(a, 78, 46);
    return {
      id: 'custom',
      name: 'Custom',
      tagline: 'Your colors',
      mode: 'light',
      colors: {
        background: hsl(b, 32, 96),
        surface: glass ? 'rgba(255,255,255,0.62)' : '#FFFFFF',
        surfaceRaised: hsl(b, 26, 92),
        border: glass ? 'rgba(20,16,30,0.1)' : hsl(b, 16, 85),
        text: hsl(b, 28, 10),
        textMuted: hsl(b, 10, 38),
        textFaint: hsl(b, 8, 56),
        accent,
        onAccent: readableOn(accent),
        price: '#0E9F6E',
        gain: '#0E9F6E',
        loss: '#D92D20',
        danger: '#D92D20',
        tabBar: glass ? 'rgba(255,255,255,0.7)' : '#FFFFFF',
      },
      gradient: [hsl(a - 24, 82, 52), hsl(a, 80, 47), hsl(a + 24, 82, 50)],
      aurora: [hsl(a, 90, 82), hsl(b, 80, 88), hsl(a + 40, 85, 84), hsl(b, 50, 94)],
      auroraOpacity,
      glass,
    };
  }

  const accent = hsl(a, 88, 66);
  return {
    id: 'custom',
    name: 'Custom',
    tagline: 'Your colors',
    mode: 'dark',
    colors: {
      background: hsl(b, 34, 6),
      surface: glass ? 'rgba(255,255,255,0.08)' : hsl(b, 26, 11),
      surfaceRaised: glass ? 'rgba(255,255,255,0.14)' : hsl(b, 22, 16),
      border: glass ? 'rgba(255,255,255,0.18)' : hsl(b, 20, 22),
      text: hsl(b, 30, 97),
      textMuted: hsl(b, 14, 70),
      textFaint: hsl(b, 10, 46),
      accent,
      onAccent: readableOn(hsl(a, 82, 52)),
      price: '#5EE6A8',
      gain: '#5EE6A8',
      loss: '#FF6B87',
      danger: '#FF5C7A',
      tabBar: glass ? 'rgba(12,10,20,0.55)' : hsl(b, 30, 8),
    },
    gradient: [hsl(a - 26, 84, 54), hsl(a, 82, 52), hsl(a + 26, 86, 56)],
    aurora: [hsl(b, 72, 30), hsl(a, 74, 34), hsl(b + 38, 62, 26), hsl(b, 50, 12)],
    auroraOpacity,
    glass,
  };
}

export function sanitizeCustomTheme(value: unknown): CustomThemeSettings {
  const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<CustomThemeSettings>;
  return {
    accentHue: validHue(input.accentHue) ?? DEFAULT_CUSTOM_THEME.accentHue,
    backgroundHue: validHue(input.backgroundHue) ?? DEFAULT_CUSTOM_THEME.backgroundHue,
    mode: input.mode === 'light' || input.mode === 'dark' ? input.mode : DEFAULT_CUSTOM_THEME.mode,
    glass: typeof input.glass === 'boolean' ? input.glass : DEFAULT_CUSTOM_THEME.glass,
    glow: input.glow === 'off' || input.glow === 'soft' || input.glow === 'vivid' ? input.glow : DEFAULT_CUSTOM_THEME.glow,
  };
}

function validHue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? ((value % 360) + 360) % 360 : null;
}
