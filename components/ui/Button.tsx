import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, FontSize } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  color?: string;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, color }: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bg = color
    ? color
    : variant === 'primary'
    ? Colors.fuel95
    : variant === 'danger'
    ? Colors.error
    : variant === 'secondary'
    ? Colors.surface
    : 'transparent';

  const textColor = variant === 'ghost' ? Colors.muted : variant === 'secondary' ? Colors.text : Colors.background;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === 'ghost' && styles.ghost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  ghost: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
