import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, FontSize } from '@/constants/theme';
import { FuelType } from '@/lib/types';

interface BadgeProps {
  fuelType: FuelType;
  style?: ViewStyle;
}

export function FuelBadge({ fuelType, style }: BadgeProps) {
  const accent = fuelType === '95' ? Colors.fuel95 : Colors.fuel98;
  return (
    <View style={[styles.badge, { borderColor: accent, backgroundColor: `${accent}18` }, style]}>
      <Text style={[styles.text, { color: accent }]}>
        {fuelType === '95' ? 'Bensiin 95' : 'Bensiin 98'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
