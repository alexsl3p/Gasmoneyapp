import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface ShimmerProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

export function Shimmer({ width = '100%', height = 16, style }: ShimmerProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: 6, backgroundColor: Colors.surface, opacity }, style]}
    />
  );
}

export function ScanningOverlay() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });
  const opacity = anim.interpolate({ inputRange: [0, 0.05, 0.95, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.scanLine, { transform: [{ translateY }], opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scanLine: {
    height: 2,
    backgroundColor: Colors.fuel95,
    elevation: 8,
  },
});
