import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Station } from '@/domain/types';
import { COLORS, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

interface StationInputProps {
  label: string;
  station: Station | null;
  placeholder: string;
  onPress: () => void;
  dotColor?: string;
}

export function StationInput({
  label,
  station,
  placeholder,
  onPress,
  dotColor = COLORS.primary,
}: StationInputProps): React.ReactElement {
  const accessibilityLabel = station
    ? `${label}: ${station.name}, ${station.code}`
    : `${label}: ${placeholder}`;

  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.dot, { borderColor: dotColor }]}>
        <View style={[styles.dotInner, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {station ? (
          <View style={styles.stationRow}>
            <Text style={styles.stationName} numberOfLines={1}>
              {station.name}
            </Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{station.code}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholder} numberOfLines={1}>
            {placeholder}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_MIN + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingRight: TOUCH_MIN,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stationName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  codeBadge: {
    backgroundColor: COLORS.badgeBg,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    fontSize: 15,
    color: COLORS.muted,
  },
});
