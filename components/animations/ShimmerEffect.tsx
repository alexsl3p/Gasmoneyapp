import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface ShimmerProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

export function Shimmer({ width = '100%', height = 16, style }: ShimmerProps) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 0.5, 1], [0.3, 0.8, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: 6,
          backgroundColor: Colors.surface,
        },
        shimmerStyle,
        style,
      ]}
    />
  );
}

export function ScanningOverlay() {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(anim.value, [0, 1], [0, 200]) }],
    opacity: interpolate(anim.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.scanLine, lineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scanLine: {
    height: 2,
    backgroundColor: Colors.fuel95,
    shadowColor: Colors.fuel95,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
});
