import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { formatClockMinutes } from '@/domain/time';
import type { ConnectionOption } from '@/domain/types';
import { COLORS, ELEVATION, RADII, SPACING, STATUS_COLORS, TOUCH_MIN } from '@/theme/theme';
import { DayChips } from './DayChips';
import { StatusPill } from './StatusPill';
import { formatDurationLocalized } from './formatters';

interface TrainCardProps {
  item: ConnectionOption;
  similarOptions?: ConnectionOption[];
  isSaved: boolean;
  onPress: (option: ConnectionOption) => void;
  onToggleSave: (option: ConnectionOption) => void;
}

export function TrainCard({
  item,
  similarOptions = [],
  isSaved,
  onPress,
  onToggleSave,
}: TrainCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [showSimilar, setShowSimilar] = useState(false);

  const leg1Dep = formatClockMinutes(item.leg1.departureMinutesFromMidnight);
  const leg1Arr = formatClockMinutes(item.leg1.arrivalMinutesFromMidnight);
  const leg2Dep = formatClockMinutes(item.leg2.departureMinutesFromMidnight);
  const leg2Arr = formatClockMinutes(item.leg2.arrivalMinutesFromMidnight);
  const isTight = item.rating === 'TIGHT';

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={[
        styles.card,
        isTight && styles.tightCardBorder,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.leg1.trainNumber} to ${item.leg2.trainNumber}, ${t(`ratings.${item.rating}`)}`}
    >
      <View style={styles.topRow}>
        <StatusPill rating={item.rating} />
        <Text style={styles.totalDuration}>
          {t('results.totalTime', {
            duration: formatDurationLocalized(item.totalJourneyMinutes, t),
          })}
        </Text>
      </View>

      <View style={styles.legRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{leg1Dep}</Text>
          <Text style={styles.codeText}>{item.leg1.boardStation.code}</Text>
        </View>
        <View style={styles.midCol}>
          <Text style={styles.trainName} numberOfLines={1}>
            {item.leg1.trainNumber} · {item.leg1.trainName}
          </Text>
          <DayChips runningDays={item.leg1.runningDays} />
        </View>
        <View style={[styles.timeCol, styles.timeColRight]}>
          <Text style={styles.timeText}>{leg1Arr}</Text>
          <Text style={styles.codeText}>{item.leg1.alightStation.code}</Text>
        </View>
      </View>

      <View
        style={[
          styles.layoverStrip,
          item.isStationChange && styles.layoverStripChange,
        ]}
      >
        <MaterialCommunityIcons
          name={item.isStationChange ? 'map-marker-path' : 'clock-outline'}
          size={15}
          color={item.isStationChange ? '#B26A00' : COLORS.primary}
        />
        <Text style={styles.layoverText} numberOfLines={2}>
          {item.isStationChange
            ? t('results.layoverChangeShort', {
                duration: formatDurationLocalized(item.layoverMinutes, t),
                from: item.leg1.alightStation.code,
                to: item.leg2.boardStation.code,
              })
            : t('results.layoverSameShort', {
                duration: formatDurationLocalized(item.layoverMinutes, t),
                code: item.leg1.alightStation.code,
              })}
        </Text>
      </View>

      <View style={styles.legRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{leg2Dep}</Text>
          <Text style={styles.codeText}>{item.leg2.boardStation.code}</Text>
        </View>
        <View style={styles.midCol}>
          <Text style={styles.trainName} numberOfLines={1}>
            {item.leg2.trainNumber} · {item.leg2.trainName}
          </Text>
          <DayChips runningDays={item.leg2.runningDays} />
        </View>
        <View style={[styles.timeCol, styles.timeColRight]}>
          <Text style={styles.timeText}>
            {leg2Arr}
            {item.leg2.arrivalIsoDate !== item.leg1.departureIsoDate ? (
              <Text style={styles.plusDay}> +1d</Text>
            ) : null}
          </Text>
          <Text style={styles.codeText}>{item.leg2.alightStation.code}</Text>
        </View>
      </View>

      {isTight ? (
        <View style={styles.tightWarning}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={14}
            color={STATUS_COLORS.TIGHT.text}
          />
          <Text style={styles.tightWarningText}>{t('results.tightWarningLine')}</Text>
        </View>
      ) : null}

      {item.isLateNightTransfer ? (
        <View style={styles.nightWarning}>
          <MaterialCommunityIcons name="weather-night" size={14} color="#B26A00" />
          <Text style={styles.nightWarningText}>{t('results.lateNightWarning')}</Text>
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <Text style={styles.bufferText}>
          {item.effectiveBufferMinutes !== null
            ? t('results.effectiveBuffer', {
                duration: formatDurationLocalized(item.effectiveBufferMinutes, t),
              })
            : t('results.transferUnknownShort')}
        </Text>

        <Pressable
          onPress={() => onToggleSave(item)}
          style={styles.bookmarkBtn}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? t('results.savedButton') : t('results.saveButton')}
        >
          <MaterialCommunityIcons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? COLORS.primary : COLORS.muted}
          />
        </Pressable>
      </View>

      {similarOptions.length > 0 ? (
        <View style={styles.similarWrap}>
          <Pressable
            onPress={() => setShowSimilar((v) => !v)}
            style={styles.similarToggle}
            accessibilityRole="button"
          >
            <Text style={styles.similarToggleText}>
              {showSimilar
                ? t('results.hideSimilar')
                : t('results.moreSimilar', { count: similarOptions.length })}
            </Text>
            <MaterialCommunityIcons
              name={showSimilar ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.primary}
            />
          </Pressable>
          {showSimilar
            ? similarOptions.map((sim) => (
                <Pressable
                  key={sim.id}
                  onPress={() => onPress(sim)}
                  style={styles.similarRow}
                  accessibilityRole="button"
                >
                  <Text style={styles.similarRowText}>
                    {sim.leg1.trainNumber} → {sim.leg2.trainNumber} ·{' '}
                    {formatClockMinutes(sim.leg1.departureMinutesFromMidnight)} →{' '}
                    {formatClockMinutes(sim.leg2.arrivalMinutesFromMidnight)}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.primary} />
                </Pressable>
              ))
            : null}
        </View>
      ) : null}
    </Pressable>
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
    gap: SPACING.sm + 2,
    ...ELEVATION.card,
  },
  tightCardBorder: {
    borderLeftWidth: 4,
    borderLeftColor: STATUS_COLORS.TIGHT.text,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  totalDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeCol: {
    minWidth: 56,
  },
  timeColRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  plusDay: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  midCol: {
    flex: 1,
    gap: 4,
  },
  trainName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  layoverStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#C5D8FA',
    backgroundColor: COLORS.background,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
  },
  layoverStripChange: {
    borderColor: '#F7D99C',
    backgroundColor: '#FFF9EC',
  },
  layoverText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  tightWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: STATUS_COLORS.TIGHT.bg,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  tightWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: STATUS_COLORS.TIGHT.text,
  },
  nightWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: '#FFF4DB',
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  nightWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#8C5200',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
  },
  bufferText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  bookmarkBtn: {
    minWidth: TOUCH_MIN,
    minHeight: TOUCH_MIN - 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  similarWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.xs,
  },
  similarToggle: {
    minHeight: TOUCH_MIN - 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  similarToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  similarRow: {
    minHeight: TOUCH_MIN - 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
  },
  similarRowText: {
    fontSize: 12,
    color: COLORS.text,
  },
});
