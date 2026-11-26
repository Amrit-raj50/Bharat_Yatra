import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { addDaysIsoDate, getTodayIsoDateLocal } from '@/domain/time';
import { formatIsoDateShort } from './formatters';

interface Props {
  value: string;
  onChange: (isoDate: string) => void;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatStripChip(isoDate: string): { weekday: string; dayNum: string; month: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) {
    return { weekday: '', dayNum: isoDate, month: '' };
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: SHORT_DAYS[dt.getUTCDay()] ?? '',
    dayNum: String(d).padStart(2, '0'),
    month: SHORT_MONTHS[dt.getUTCMonth()] ?? '',
  };
}

export function DateSelector({ value, onChange }: Props): React.ReactElement {
  const { t } = useTranslation();
  const today = getTodayIsoDateLocal();
  const tomorrow = addDaysIsoDate(today, 1);

  const upcomingDates = useMemo(
    () => Array.from({ length: 14 }, (_, idx) => addDaysIsoDate(today, idx)),
    [today]
  );

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        <Pressable
          style={styles.stepButton}
          onPress={() => onChange(addDaysIsoDate(value, -1))}
          accessibilityRole="button"
        >
          <Text style={styles.stepText}>{t('home.prevDay')}</Text>
        </Pressable>

        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{formatIsoDateShort(value)}</Text>
        </View>

        <Pressable
          style={styles.stepButton}
          onPress={() => onChange(addDaysIsoDate(value, 1))}
          accessibilityRole="button"
        >
          <Text style={styles.stepText}>{t('home.nextDay')}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripRow}
      >
        {upcomingDates.map((isoDate) => {
          const active = value === isoDate;
          const { weekday, dayNum, month } = formatStripChip(isoDate);
          const tag =
            isoDate === today
              ? t('home.today')
              : isoDate === tomorrow
                ? t('home.tomorrow')
                : weekday;

          return (
            <Pressable
              key={isoDate}
              style={[styles.stripChip, active && styles.stripChipActive]}
              onPress={() => onChange(isoDate)}
              accessibilityRole="button"
            >
              <Text style={[styles.stripTop, active && styles.stripTextActive]}>{tag}</Text>
              <Text style={[styles.stripDay, active && styles.stripTextActive]}>
                {dayNum} {month}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dateBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  stripRow: {
    gap: 8,
    paddingVertical: 2,
  },
  stripChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  stripChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  stripTop: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stripDay: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  stripTextActive: {
    color: '#1E40AF',
  },
});
