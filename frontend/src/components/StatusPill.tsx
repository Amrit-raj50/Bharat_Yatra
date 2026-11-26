import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { BufferRating } from '@/domain/types';
import { RADII, SPACING, STATUS_COLORS } from '@/theme/theme';

interface StatusPillProps {
  rating: BufferRating;
  size?: 'sm' | 'lg';
  showEstimate?: boolean;
}

export function StatusPill({
  rating,
  size = 'sm',
  showEstimate = true,
}: StatusPillProps): React.ReactElement {
  const { t } = useTranslation();
  const style = STATUS_COLORS[rating];
  const label = t(`ratings.${rating}`);
  const estimateLabel = t('common.estimate');
  const fullText = showEstimate ? `${label} · ${estimateLabel}` : label;

  return (
    <View
      style={[
        styles.pill,
        size === 'lg' && styles.pillLg,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
      accessibilityRole="text"
      accessibilityLabel={fullText}
    >
      <MaterialCommunityIcons
        name={style.icon}
        size={size === 'lg' ? 18 : 15}
        color={style.text}
      />
      <Text style={[styles.text, size === 'lg' && styles.textLg, { color: style.text }]}>
        {fullText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
  },
  pillLg: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textLg: {
    fontSize: 14,
  },
});
