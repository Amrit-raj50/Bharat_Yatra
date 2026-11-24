import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { addDaysIsoDate, getTodayIsoDateLocal } from '@/domain/time';
import { formatIsoDateShort } from './formatters';

interface Props {
  value: string;
  onChange: (isoDate: string) => void;
}

export function DateSelector({ value, onChange }: Props): React.ReactElement {
  const { t } = useTranslation();
  const today = getTodayIsoDateLocal();
  const tomorrow = addDaysIsoDate(today, 1);

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

      <View style={styles.quickRow}>
        <Pressable
          style={[styles.quickChip, value === today && styles.quickChipActive]}
          onPress={() => onChange(today)}
          accessibilityRole="button"
        >
          <Text style={[styles.quickText, value === today && styles.quickTextActive]}>
            {t('home.today')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.quickChip, value === tomorrow && styles.quickChipActive]}
          onPress={() => onChange(tomorrow)}
          accessibilityRole="button"
        >
          <Text style={[styles.quickText, value === tomorrow && styles.quickTextActive]}>
            {t('home.tomorrow')}
          </Text>
        </Pressable>
      </View>
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
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  quickChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  quickTextActive: {
    color: '#1E40AF',
  },
});
