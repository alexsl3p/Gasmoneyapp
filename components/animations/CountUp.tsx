import React, { useEffect } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface CountUpProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: TextStyle;
  duration?: number;
}

export function CountUp({ value, suffix = '', prefix = '', decimals = 2, style, duration = 800 }: CountUpProps) {
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${animValue.value.toFixed(decimals)}${suffix}`,
  }));

  // @ts-ignore – animatedProps text is valid for AnimatedText
  return <AnimatedText animatedProps={animatedProps} style={style} />;
}
