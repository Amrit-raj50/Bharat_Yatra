import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { formatClockMinutes } from '@/domain/time';
import type { ConnectionLeg, ConnectionOption } from '@/domain/types';
import { COLORS, ELEVATION, RADII, SPACING, STATUS_COLORS, TOUCH_MIN } from '@/theme/theme';
import { DayChips } from './DayChips';
import { formatDurationLocalized, formatIsoDateShort } from './formatters';

interface TimelineProps {
  connection: ConnectionOption;
}

function LegSegment({ leg }: { leg: ConnectionLeg }): React.ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.legSegment}>
      <View style={styles.nodeRow}>
        <View style={styles.railCol}>
          <View style={styles.nodeDot} />
          <View style={styles.railLine} />
        </View>
        <View style={styles.nodeBody}>
          <View style={styles.nodeHeader}>
            <Text style={styles.stationTitle} numberOfLines={1}>
              {leg.boardStation.name}{' '}
              <Text style={styles.codeInline}>({leg.boardStation.code})</Text>
            </Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{t('detail.board')}</Text>
            </View>
          </View>
          <Text style={styles.timeMeta}>
            {formatClockMinutes(leg.departureMinutesFromMidnight)} ·{' '}
            {formatIsoDateShort(leg.departureIsoDate)}
          </Text>
        </View>
      </View>

      <View style={styles.trainRow}>
        <View style={styles.railCol}>
          <View style={styles.railLine} />
        </View>
        <View style={styles.trainBox}>
          <View style={styles.trainTop}>
            <MaterialCommunityIcons name="train" size={16} color={COLORS.primary} />
            <Text style={styles.trainTitle} numberOfLines={2}>
              {leg.trainNumber} · {leg.trainName}
            </Text>
          </View>
          <View style={styles.trainMetaRow}>
            <Text style={styles.durationText}>
              {t('detail.duration')}: {formatDurationLocalized(leg.durationMinutes, t)}
            </Text>
            <DayChips runningDays={leg.runningDays} />
          </View>

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={styles.collapseBtn}
            accessibilityRole="button"
            accessibilityLabel={t('detail.toggleStops')}
          >
            <Text style={styles.collapseText}>
              {expanded ? t('detail.hideLegDetails') : t('detail.showLegDetails')}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.primary}
            />
          </Pressable>

          {expanded ? (
            <View style={styles.expandedBox}>
              <Text style={styles.expandedLine}>
                {t('detail.board')}: {leg.boardStation.name} ({leg.boardStation.code}) ·{' '}
                {formatClockMinutes(leg.departureMinutesFromMidnight)}
              </Text>
              <Text style={styles.expandedLine}>
                {t('detail.alight')}: {leg.alightStation.name} ({leg.alightStation.code}) ·{' '}
                {formatClockMinutes(leg.arrivalMinutesFromMidnight)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.nodeRow}>
        <View style={styles.railCol}>
          <View style={[styles.nodeDot, styles.nodeDotEnd]} />
        </View>
        <View style={styles.nodeBody}>
          <View style={styles.nodeHeader}>
            <Text style={styles.stationTitle} numberOfLines={1}>
              {leg.alightStation.name}{' '}
              <Text style={styles.codeInline}>({leg.alightStation.code})</Text>
            </Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{t('detail.alight')}</Text>
            </View>
          </View>
          <Text style={styles.timeMeta}>
            {formatClockMinutes(leg.arrivalMinutesFromMidnight)} ·{' '}
            {formatIsoDateShort(leg.arrivalIsoDate)}
            {leg.arrivalIsoDate !== leg.departureIsoDate ? ` ${t('common.nextDayTag')}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function Timeline({ connection }: TimelineProps): React.ReactElement {
  const { t } = useTranslation();
  const statusStyle = STATUS_COLORS[connection.rating];

  return (
    <View style={styles.card}>
      <LegSegment leg={connection.leg1} />

      <View
        style={[
          styles.transferBlock,
          {
            backgroundColor: connection.isStationChange ? '#FFF4DB' : COLORS.primarySoft,
            borderColor: connection.isStationChange ? '#F7D99C' : '#C5D8FA',
          },
        ]}
      >
        <View style={styles.transferHeader}>
          <MaterialCommunityIcons
            name={connection.isStationChange ? 'map-marker-path' : 'walk'}
            size={18}
            color={connection.isStationChange ? '#B26A00' : COLORS.primary}
          />
          <Text style={styles.transferTitle}>
            {connection.isStationChange
              ? t('detail.transferChangeBanner', {
                  from: connection.leg1.alightStation.code,
                  to: connection.leg2.boardStation.code,
                  layover: formatDurationLocalized(connection.layoverMinutes, t),
                })
              : t('detail.transferSameBanner', {
                  station: connection.leg1.alightStation.name,
                  layover: formatDurationLocalized(connection.layoverMinutes, t),
                })}
          </Text>
        </View>

        {connection.isStationChange ? (
          <Text style={styles.transferNote}>
            {connection.unknownTransferTime
              ? t('detail.transferUnknownDetail', {
                  fromCode: connection.leg1.alightStation.code,
                  toCode: connection.leg2.boardStation.code,
                })
              : `${t('detail.transferDurationRow', { minutes: connection.transferMinutes ?? 0 })}${
                  connection.transferInfo?.modeNote ? ` · ${connection.transferInfo.modeNote}` : ''
                }`}
          </Text>
        ) : null}

        {connection.isLateNightTransfer ? (
          <View style={styles.moonRow}>
            <MaterialCommunityIcons name="weather-night" size={15} color={statusStyle.text} />
            <Text style={styles.moonText}>{t('detail.lateNightDetailWarning')}</Text>
          </View>
        ) : null}
      </View>

      <LegSegment leg={connection.leg2} />
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
    ...ELEVATION.card,
  },
  legSegment: {
    gap: 0,
  },
  nodeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  railCol: {
    width: 18,
    alignItems: 'center',
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  nodeDotEnd: {
    backgroundColor: COLORS.accent,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#B8CCF0',
    minHeight: 16,
  },
  nodeBody: {
    flex: 1,
    paddingBottom: SPACING.sm,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  stationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  codeInline: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tagPill: {
    backgroundColor: COLORS.badgeBg,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  timeMeta: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  trainRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  trainBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  trainTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  trainTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  trainMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  durationText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  collapseBtn: {
    minHeight: TOUCH_MIN - 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  collapseText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  expandedBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.xs,
    gap: 2,
  },
  expandedLine: {
    fontSize: 12,
    color: COLORS.text,
  },
  transferBlock: {
    borderWidth: 1,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: SPACING.xs,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  transferTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  transferNote: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  moonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  moonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#7A4900',
  },
});
