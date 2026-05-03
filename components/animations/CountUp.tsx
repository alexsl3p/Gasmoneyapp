import React from 'react';
import { Text, TextStyle } from 'react-native';

interface CountUpProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: TextStyle;
  duration?: number;
}

export function CountUp({ value, suffix = '', prefix = '', decimals = 2, style }: CountUpProps) {
  return (
    <Text style={style}>{`${prefix}${value.toFixed(decimals)}${suffix}`}</Text>
  );
}
