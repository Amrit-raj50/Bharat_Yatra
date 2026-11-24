import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BufferRating } from '@/domain/types';

interface Props {
  rating: BufferRating;
}

const RATING_STYLES: Record<BufferRating, { bg: string; border: string; text: string }> = {
  TIGHT: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
  OK: { bg: '#FEF3C7', border: '#D97706', text: '#92400E' },
  COMFORTABLE: { bg: '#DCFCE7', border: '#16A34A', text: '#166534' },
  TOO_LONG: { bg: '#E0E7FF', border: '#4F46E5', text: '#3730A3' },
  TRANSFER_UNKNOWN: { bg: '#F3F4F6', border: '#6B7280', text: '#374151' },
};

export function RatingBadge({ rating }: Props): React.ReactElement {
  const { t } = useTranslation();
  const palette = RATING_STYLES[rating];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.text }]}>{t(`ratings.${rating}`)}</Text>
      <Text style={[styles.estimate, { color: palette.text }]}>{t('common.estimate')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  estimate: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.9,
  },
});
