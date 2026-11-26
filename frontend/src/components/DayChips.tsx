import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WEEKDAY_BITS } from '@/domain/time';
import { COLORS, SPACING } from '@/theme/theme';

interface DayChipsProps {
  runningDays: number;
}

const DAYS = [
  { bit: WEEKDAY_BITS.SUN, letter: 'S' },
  { bit: WEEKDAY_BITS.MON, letter: 'M' },
  { bit: WEEKDAY_BITS.TUE, letter: 'T' },
  { bit: WEEKDAY_BITS.WED, letter: 'W' },
  { bit: WEEKDAY_BITS.THU, letter: 'T' },
  { bit: WEEKDAY_BITS.FRI, letter: 'F' },
  { bit: WEEKDAY_BITS.SAT, letter: 'S' },
] as const;

export function DayChips({ runningDays }: DayChipsProps): React.ReactElement {
  return (
    <View style={styles.row} accessibilityLabel="Running days">
      {DAYS.map((d, idx) => {
        const active = (runningDays & d.bit) !== 0;
        return (
          <View key={idx} style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}>
            <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
              {d.letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  chip: {
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipInactive: {
    backgroundColor: COLORS.badgeBg,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
  textActive: {
    color: COLORS.white,
  },
  textInactive: {
    color: COLORS.muted,
  },
});
