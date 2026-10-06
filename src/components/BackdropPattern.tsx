import { type ReactNode, useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import type { BackdropPreset } from '@/theme/backdrop';

type Props = {
  preset: BackdropPreset;
  color: string;
  accent: string;
  opacity: number;
};

export function BackdropPattern({ preset, color, accent, opacity }: Props) {
  const id = `bd${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const tile = TILES[preset];

  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none" opacity={opacity}>
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={accent} />
          <Stop offset="1" stopColor={color} />
        </LinearGradient>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={tile.size} height={tile.size}>
          {tile.draw(color, accent, `url(#${id}g)`)}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

type Tile = {
  size: number;
  draw: (color: string, accent: string, gradient: string) => ReactNode;
};

const TILES: Record<BackdropPreset, Tile> = {
  pokeballs: {
    size: 72,
    draw: (color, accent) => (
      <G>
        <G transform="translate(18 18) rotate(-18)">
          <Circle r={13} fill="none" stroke={color} strokeWidth={2.5} />
          <Line x1={-13} y1={0} x2={13} y2={0} stroke={color} strokeWidth={2.5} />
          <Circle r={4.5} fill="none" stroke={accent} strokeWidth={2.5} />
        </G>
        <G transform="translate(54 54) rotate(22)">
          <Circle r={9} fill="none" stroke={color} strokeWidth={2} />
          <Line x1={-9} y1={0} x2={9} y2={0} stroke={color} strokeWidth={2} />
          <Circle r={3} fill="none" stroke={accent} strokeWidth={2} />
        </G>
      </G>
    ),
  },
  energy: {
    size: 56,
    draw: (color, accent) => (
      <G>
        <Circle cx={14} cy={14} r={9} fill="none" stroke={color} strokeWidth={2} />
        <Path d="M14 8 L17 14 L14 20 L11 14 Z" fill={accent} />
        <Circle cx={42} cy={42} r={9} fill="none" stroke={color} strokeWidth={2} />
        <Circle cx={42} cy={42} r={3} fill={color} />
      </G>
    ),
  },
  lightning: {
    size: 64,
    draw: (color, accent) => (
      <G>
        <Path d="M20 6 L12 26 L20 26 L14 42 L30 20 L22 20 L28 6 Z" fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M50 36 L45 48 L50 48 L46 58 L56 44 L51 44 L55 36 Z" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </G>
    ),
  },
  holo: {
    size: 48,
    draw: (_color, _accent, gradient) => (
      <G>
        <Path d="M-12 48 L48 -12" stroke={gradient} strokeWidth={10} />
        <Path d="M12 60 L60 12" stroke={gradient} strokeWidth={4} />
      </G>
    ),
  },
  stars: {
    size: 60,
    draw: (color, accent) => (
      <G>
        <Path d="M16 6 L18.5 13.5 L26 16 L18.5 18.5 L16 26 L13.5 18.5 L6 16 L13.5 13.5 Z" fill={accent} />
        <Path d="M44 36 L45.5 41.5 L51 43 L45.5 44.5 L44 50 L42.5 44.5 L37 43 L42.5 41.5 Z" fill={color} />
        <Circle cx={46} cy={12} r={1.6} fill={color} />
        <Circle cx={12} cy={46} r={1.2} fill={accent} />
      </G>
    ),
  },
};
