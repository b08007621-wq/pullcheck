export type BackdropPreset = 'pokeballs' | 'energy' | 'lightning' | 'holo' | 'stars';

export type BackdropKind = 'none' | 'preset' | 'image';

export type Backdrop = {
  kind: BackdropKind;
  preset: BackdropPreset;
  uri: string | null;
  strength: number;
  glass: boolean;
};

export const DEFAULT_BACKDROP: Backdrop = { kind: 'none', preset: 'pokeballs', uri: null, strength: 0.14, glass: false };

export const BACKDROP_PRESETS: { value: BackdropPreset; label: string }[] = [
  { value: 'pokeballs', label: 'Poké Balls' },
  { value: 'energy', label: 'Energy' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'holo', label: 'Holo' },
  { value: 'stars', label: 'Stars' },
];

export const BACKDROP_STRENGTHS: { value: string; label: string; amount: number }[] = [
  { value: 'subtle', label: 'Subtle', amount: 0.08 },
  { value: 'medium', label: 'Medium', amount: 0.14 },
  { value: 'bold', label: 'Bold', amount: 0.26 },
];

export function sanitizeBackdrop(value: unknown): Backdrop {
  if (!value || typeof value !== 'object') return DEFAULT_BACKDROP;
  const raw = value as Partial<Backdrop>;
  const kind: BackdropKind = raw.kind === 'preset' || raw.kind === 'image' ? raw.kind : 'none';
  const preset = BACKDROP_PRESETS.some((entry) => entry.value === raw.preset) ? (raw.preset as BackdropPreset) : 'pokeballs';
  const uri = typeof raw.uri === 'string' ? raw.uri : null;
  const strength = typeof raw.strength === 'number' ? Math.min(0.5, Math.max(0.03, raw.strength)) : DEFAULT_BACKDROP.strength;
  return { kind: kind === 'image' && !uri ? 'none' : kind, preset, uri, strength, glass: raw.glass === true };
}
