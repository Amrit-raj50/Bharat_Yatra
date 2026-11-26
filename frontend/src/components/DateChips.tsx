import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { addDaysIsoDate, getTodayIsoDateLocal } from '@/domain/time';
import { COLORS, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';
import { formatIsoDateShort } from './formatters';

interface DateChipsProps {
  value: string;
  onChange: (isoDate: string) => void;
}

function getNextWeekdayIso(targetUtcDay: number, todayIso: string): string {
  const [y, m, d] = todayIso.split('-').map(Number);
  if (!y || !m || !d) return todayIso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const diff = (targetUtcDay - dt.getUTCDay() + 7) % 7 || 7;
  return addDaysIsoDate(todayIso, diff);
}

function parseIsoToLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatLocalDateToIso(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateChips({ value, onChange }: DateChipsProps): React.ReactElement {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  const today = getTodayIsoDateLocal();
  const tomorrow = addDaysIsoDate(today, 1);
  const nextSat = useMemo(() => getNextWeekdayIso(6, today), [today]);
  const nextSun = useMemo(() => getNextWeekdayIso(0, today), [today]);

  const chips = [
    { key: 'today', label: t('home.today'), iso: today },
    { key: 'tomorrow', label: t('home.tomorrow'), iso: tomorrow },
    { key: 'sat', label: t('weekdays.sat'), iso: nextSat },
    { key: 'sun', label: t('weekdays.sun'), iso: nextSun },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.dateRow}>
        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
        <Text style={styles.dateText}>{formatIsoDateShort(value)}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {chips.map((c) => {
          const active = value === c.iso;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange(c.iso)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${c.label} ${formatIsoDateShort(c.iso)}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.chip, styles.pickChip]}
          accessibilityRole="button"
          accessibilityLabel={t('home.pickDate')}
        >
          <MaterialCommunityIcons name="calendar-edit" size={14} color={COLORS.primary} />
          <Text style={styles.pickChipText}>{t('home.pickDate')}</Text>
        </Pressable>
      </ScrollView>

      {showPicker ? (
        <DateTimePicker
          value={parseIsoToLocalDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={parseIsoToLocalDate(today)}
          onChange={(_event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (selectedDate) {
              onChange(formatLocalDateToIso(selectedDate));
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipRow: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  chip: {
    minHeight: TOUCH_MIN - 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  pickChip: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  pickChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
