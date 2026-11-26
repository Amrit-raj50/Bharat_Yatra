import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADII, SPACING } from '@/theme/theme';

interface InfoStripProps {
  text: string;
  tone?: 'info' | 'warning';
}

export function InfoStrip({ text, tone = 'info' }: InfoStripProps): React.ReactElement {
  const isWarn = tone === 'warning';
  return (
    <View
      style={[
        styles.strip,
        isWarn ? styles.warnStrip : styles.infoStrip,
      ]}
      accessibilityRole="text"
    >
      <MaterialCommunityIcons
        name={isWarn ? 'alert-circle' : 'information'}
        size={16}
        color={isWarn ? '#B26A00' : COLORS.primary}
      />
      <Text style={[styles.text, isWarn && styles.warnText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  infoStrip: {
    backgroundColor: COLORS.primarySoft,
    borderColor: '#C5D8FA',
  },
  warnStrip: {
    backgroundColor: '#FFF4DB',
    borderColor: '#F7D99C',
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.primaryDark,
  },
  warnText: {
    color: '#7A4900',
  },
});
