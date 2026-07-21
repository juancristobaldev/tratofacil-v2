import React, { useId } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

interface GradientProps {
  colors?: { offset: string; color: string; opacity: number }[];
  style?: ViewStyle;
}

const DEFAULT_STOPS = [
  { offset: '0%', color: '#000000', opacity: 0 },
  { offset: '45%', color: '#000000', opacity: 0.55 },
  { offset: '100%', color: '#000000', opacity: 0.9 },
];

const gradientIdCounter = { current: 0 };
const nextId = () => `linearGrad-${++gradientIdCounter.current}`;

export const Gradient: React.FC<GradientProps> = ({
  colors = DEFAULT_STOPS,
  style,
}) => {
  const id = useId ? useId() : nextId();

  return (
    <Svg height="100%" width="100%" style={[StyleSheet.absoluteFill, style]}>
      <Defs>
        <SvgLinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          {colors.map((stop, idx) => (
            <Stop
              key={idx}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </SvgLinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
};
