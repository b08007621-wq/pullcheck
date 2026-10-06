export type ThemeId = 'aero' | 'graphite' | 'paper' | 'amethyst' | 'liquidGlass' | 'pokeball' | 'cardBack' | 'midnight';

export type ThemeChoice = ThemeId | 'custom' | `saved:${string}`;

export type ThemeMode = 'dark' | 'light';

export type GradientStops = readonly [string, string, ...string[]];

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  onAccent: string;
  price: string;
  gain: string;
  loss: string;
  danger: string;
  tabBar: string;
};

export type AppTheme = {
  id: ThemeChoice;
  name: string;
  tagline: string;
  mode: ThemeMode;
  colors: ThemeColors;
  gradient: GradientStops;
  aurora: GradientStops;
  auroraOpacity: number;
  glass: boolean;
  gloss?: boolean;
};

const aero: AppTheme = {
  id: 'aero',
  name: 'Default',
  tagline: 'Sky, glass and bubbles',
  mode: 'light',
  colors: {
    background: '#EAF7FF',
    surface: 'rgba(255,255,255,0.62)',
    surfaceRaised: 'rgba(255,255,255,0.84)',
    border: 'rgba(0,92,153,0.16)',
    text: '#06283D',
    textMuted: '#3A5F76',
    textFaint: '#7D9CAF',
    accent: '#0A8FDC',
    onAccent: '#FFFFFF',
    price: '#06283D',
    gain: '#1E9E48',
    loss: '#DE3B40',
    danger: '#DE3B40',
    tabBar: 'rgba(255,255,255,0.72)',
  },
  gradient: ['#6FD0FF', '#0A8FDC', '#0563B0'],
  aurora: ['#46B8F2', '#8ED6FA', '#D6F2FF', '#EEFBFF'],
  auroraOpacity: 0,
  glass: true,
  gloss: true,
};

const graphite: AppTheme = {
  id: 'graphite',
  name: 'Graphite',
  tagline: 'Quiet black, Pikachu yellow',
  mode: 'dark',
  colors: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceRaised: '#2C2C2E',
    border: '#38383A',
    text: '#FFFFFF',
    textMuted: '#AEAEB2',
    textFaint: '#6E6E73',
    accent: '#FFD60A',
    onAccent: '#1C1C1E',
    price: '#FFFFFF',
    gain: '#30D158',
    loss: '#FF453A',
    danger: '#FF453A',
    tabBar: '#0E0E10',
  },
  gradient: ['#FFD60A', '#FFD60A'],
  aurora: ['#000000', '#000000'],
  auroraOpacity: 0,
  glass: false,
};

const paper: AppTheme = {
  id: 'paper',
  name: 'Paper',
  tagline: 'Clean white, amber details',
  mode: 'light',
  colors: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceRaised: '#E5E5EA',
    border: '#D1D1D6',
    text: '#000000',
    textMuted: '#636366',
    textFaint: '#8E8E93',
    accent: '#B86E00',
    onAccent: '#FFFFFF',
    price: '#000000',
    gain: '#248A3D',
    loss: '#D70015',
    danger: '#D70015',
    tabBar: '#F9F9F9',
  },
  gradient: ['#B86E00', '#B86E00'],
  aurora: ['#F2F2F7', '#F2F2F7'],
  auroraOpacity: 0,
  glass: false,
};

const amethyst: AppTheme = {
  id: 'amethyst',
  name: 'Amethyst',
  tagline: 'Deep violet with a red pulse',
  mode: 'dark',
  colors: {
    background: '#0C0817',
    surface: '#17112A',
    surfaceRaised: '#221A3B',
    border: '#30264B',
    text: '#F7F3FF',
    textMuted: '#B2A8CC',
    textFaint: '#71688D',
    accent: '#EC5BC7',
    onAccent: '#FFFFFF',
    price: '#5EE6A8',
    gain: '#5EE6A8',
    loss: '#FF6B87',
    danger: '#FF5C7A',
    tabBar: '#110B20',
  },
  gradient: ['#7C3AED', '#C026D3', '#E11D48'],
  aurora: ['#5B21B6', '#86198F', '#9F1239', '#1E1040'],
  auroraOpacity: 0.22,
  glass: false,
};

const liquidGlass: AppTheme = {
  id: 'liquidGlass',
  name: 'Liquid Glass',
  tagline: 'Frosted glass over living color',
  mode: 'dark',
  colors: {
    background: '#09070F',
    surface: 'rgba(255,255,255,0.08)',
    surfaceRaised: 'rgba(255,255,255,0.14)',
    border: 'rgba(255,255,255,0.18)',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.74)',
    textFaint: 'rgba(255,255,255,0.5)',
    accent: '#F48AD8',
    onAccent: '#FFFFFF',
    price: '#7CF5BE',
    gain: '#7CF5BE',
    loss: '#FF8A9B',
    danger: '#FF7A93',
    tabBar: 'rgba(16,10,24,0.55)',
  },
  gradient: ['#8B5CF6', '#EC4899', '#F43F5E'],
  aurora: ['#7C3AED', '#DB2777', '#2563EB', '#4C1D95'],
  auroraOpacity: 0.9,
  glass: true,
};

const pokeball: AppTheme = {
  id: 'pokeball',
  name: 'Poké Ball',
  tagline: 'The classic red and white',
  mode: 'light',
  colors: {
    background: '#F5F2ED',
    surface: '#FFFFFF',
    surfaceRaised: '#EFEAE3',
    border: '#E2DBD1',
    text: '#1A1A1D',
    textMuted: '#5C5853',
    textFaint: '#938E87',
    accent: '#E3350D',
    onAccent: '#FFFFFF',
    price: '#0E9F6E',
    gain: '#0E9F6E',
    loss: '#D92D20',
    danger: '#D92D20',
    tabBar: '#FFFFFF',
  },
  gradient: ['#FF5F3A', '#E3350D', '#B81A05'],
  aurora: ['#FFD3C7', '#FFFFFF', '#FFE6DD', '#F5F2ED'],
  auroraOpacity: 0,
  glass: false,
};

const cardBack: AppTheme = {
  id: 'cardBack',
  name: 'Card Back',
  tagline: 'Classic TCG blue and gold',
  mode: 'dark',
  colors: {
    background: '#061A45',
    surface: '#0D2A63',
    surfaceRaised: '#14377B',
    border: '#1F4791',
    text: '#F3F6FF',
    textMuted: '#AFC0E4',
    textFaint: '#7186B5',
    accent: '#FFCB05',
    onAccent: '#1A1405',
    price: '#4ADE80',
    gain: '#4ADE80',
    loss: '#FF7A7A',
    danger: '#FF6B6B',
    tabBar: '#081F52',
  },
  gradient: ['#FFE066', '#FFCB05', '#F5A300'],
  aurora: ['#1D4ED8', '#0B2A6B', '#3B82F6', '#06163D'],
  auroraOpacity: 0.18,
  glass: false,
};

const midnight: AppTheme = {
  id: 'midnight',
  name: 'Midnight',
  tagline: 'Quiet graphite, electric blue',
  mode: 'dark',
  colors: {
    background: '#0A0A0D',
    surface: '#15151B',
    surfaceRaised: '#1D1D25',
    border: '#292932',
    text: '#F4F4F6',
    textMuted: '#A0A0AB',
    textFaint: '#65656F',
    accent: '#6FA0FF',
    onAccent: '#FFFFFF',
    price: '#5EE6A8',
    gain: '#5EE6A8',
    loss: '#FF6B81',
    danger: '#FF5C7A',
    tabBar: '#0F0F14',
  },
  gradient: ['#3B6FF0', '#5B8CFF', '#8FB0FF'],
  aurora: ['#18213F', '#0E1428', '#1B2547', '#0A0A0D'],
  auroraOpacity: 0,
  glass: false,
};

export const THEMES: Record<ThemeId, AppTheme> = { aero, graphite, paper, amethyst, liquidGlass, pokeball, cardBack, midnight };

export const THEME_ORDER: ThemeId[] = ['aero', 'graphite', 'paper', 'liquidGlass', 'midnight', 'cardBack', 'pokeball', 'amethyst'];

export const DEFAULT_THEME_ID: ThemeId = 'aero';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    value === 'custom' ||
    (typeof value === 'string' && (value in THEMES || value.startsWith('saved:')))
  );
}
