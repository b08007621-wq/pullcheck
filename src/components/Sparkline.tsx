import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = {
  values: number[];
  width: number;
  height: number;
  color: string;
  surface: string;
  gridColor?: string;
  activeIndex?: number | null;
  guides?: number;
};

export const SPARK_PAD = 6;
const PAD = SPARK_PAD;

export function Sparkline({ values, width, height, color, surface, gridColor, activeIndex = null, guides = 0 }: Props) {
  const gradientId = `spark${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (values.length < 2 || width <= PAD * 2) return <View style={{ width, height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const x = (index: number) => PAD + (index / (values.length - 1)) * (width - PAD * 2);
  const y = (value: number) => (range === 0 ? height / 2 : PAD + (1 - (value - min) / range) * (height - PAD * 2));

  const points = values.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`);
  const line = `M${points.join(' L')}`;
  const area = `${line} L${x(values.length - 1).toFixed(2)},${height} L${x(0).toFixed(2)},${height} Z`;
  const focus = activeIndex ?? values.length - 1;
  const focusValue = values[focus] ?? values[values.length - 1] ?? 0;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {gridColor
        ? Array.from({ length: guides }, (_, index) => {
            const level = PAD + (index / Math.max(guides - 1, 1)) * (height - PAD * 2);
            return (
              <Line
                key={index}
                x1={0}
                x2={width}
                y1={level}
                y2={level}
                stroke={gridColor}
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.6}
              />
            );
          })
        : null}
      {gridColor ? (
        <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={gridColor} strokeWidth={1} />
      ) : null}
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
      {activeIndex !== null ? (
        <Line
          x1={x(focus)}
          x2={x(focus)}
          y1={0}
          y2={height}
          stroke={gridColor ?? color}
          strokeWidth={1}
        />
      ) : null}
      <Circle cx={x(focus)} cy={y(focusValue)} r={4.5} fill={color} stroke={surface} strokeWidth={2} />
    </Svg>
  );
}
