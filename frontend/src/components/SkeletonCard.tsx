import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, ELEVATION, RADII, SPACING } from '@/theme/theme';

export function SkeletonCard(): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.pill} />
        <View style={styles.shortLine} />
      </View>
      <View style={styles.lineLg} />
      <View style={styles.lineMd} />
      <View style={styles.divider} />
      <View style={styles.lineLg} />
      <View style={styles.lineSm} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...ELEVATION.subtle,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pill: {
    width: 110,
    height: 24,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.badgeBg,
  },
  shortLine: {
    width: 68,
    height: 16,
    borderRadius: 6,
    backgroundColor: COLORS.badgeBg,
  },
  lineLg: {
    width: '85%',
    height: 16,
    borderRadius: 6,
    backgroundColor: COLORS.badgeBg,
  },
  lineMd: {
    width: '62%',
    height: 14,
    borderRadius: 6,
    backgroundColor: COLORS.badgeBg,
  },
  lineSm: {
    width: '45%',
    height: 14,
    borderRadius: 6,
    backgroundColor: COLORS.badgeBg,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.xs,
  },
});
