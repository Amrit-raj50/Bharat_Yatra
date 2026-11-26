import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RatingBadge } from '@/components/RatingBadge';
import { SampleBanner } from '@/components/SampleBanner';
import {
  formatDurationLocalized,
  formatIsoDateShort,
  formatRunningDays,
} from '@/components/formatters';
import { formatClockMinutes } from '@/domain/time';
import type { ConnectionLeg } from '@/domain/types';
import { useAppStore } from '@/state/useAppStore';

function LegCard({ title, leg }: { title: string; leg: ConnectionLeg }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.trainHeading}>
        {leg.trainNumber} — {leg.trainName}
      </Text>

      <View style={styles.stopRow}>
        <Text style={styles.stopLabel}>{t('detail.board')}</Text>
        <Text style={styles.stopValue}>
          {leg.boardStation.name} ({leg.boardStation.code})
        </Text>
        <Text style={styles.stopTime}>
          {formatClockMinutes(leg.departureMinutesFromMidnight)} •{' '}
          {formatIsoDateShort(leg.departureIsoDate)}
        </Text>
      </View>

      <View style={styles.stopRow}>
        <Text style={styles.stopLabel}>{t('detail.alight')}</Text>
        <Text style={styles.stopValue}>
          {leg.alightStation.name} ({leg.alightStation.code})
        </Text>
        <Text style={styles.stopTime}>
          {formatClockMinutes(leg.arrivalMinutesFromMidnight)} •{' '}
          {formatIsoDateShort(leg.arrivalIsoDate)}
        </Text>
      </View>

      <Text style={styles.durationText}>
        {t('detail.duration')}: {formatDurationLocalized(leg.durationMinutes, t)}
      </Text>
      <Text style={styles.noteText}>
        {t('common.runsOn', { days: formatRunningDays(leg.runningDays, t) })}
      </Text>
    </View>
  );
}

export default function ConnectionDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const connection = useAppStore((s) => (id ? s.getConnectionById(id) : undefined));
  const isSaved = useAppStore((s) => (id ? s.isConnectionSaved(id) : false));
  const toggleSaveConnection = useAppStore((s) => s.toggleSaveConnection);

  if (!connection) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{t('detail.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SampleBanner />

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>{t('common.scheduleDisclaimer')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('detail.ratingSectionTitle')}</Text>
        <RatingBadge rating={connection.rating} />
        <Text style={styles.metaLine}>
          {t('detail.layoverRow', {
            duration: formatDurationLocalized(connection.layoverMinutes, t),
          })}
        </Text>
        <Text style={styles.metaLine}>
          {connection.effectiveBufferMinutes !== null
            ? t('detail.bufferRow', {
                duration: formatDurationLocalized(connection.effectiveBufferMinutes, t),
              })
            : t('detail.bufferUnknownRow')}
        </Text>
        <Text style={styles.noteText}>{t('detail.ratingRuleNote')}</Text>
        <Pressable
          style={[styles.saveButton, isSaved && styles.saveButtonActive]}
          onPress={() => toggleSaveConnection(connection)}
          accessibilityRole="button"
        >
          <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
            {isSaved ? `★ ${t('detail.savedConnection')}` : `☆ ${t('detail.saveConnection')}`}
          </Text>
        </Pressable>
      </View>

      {connection.isLateNightTransfer ? (
        <View style={styles.lateNightBox}>
          <Text style={styles.lateNightText}>🌙 {t('detail.lateNightDetailWarning')}</Text>
        </View>
      ) : null}

      <LegCard title={t('detail.leg1Title')} leg={connection.leg1} />

      <View
        style={[
          styles.card,
          connection.isStationChange
            ? connection.unknownTransferTime
              ? styles.transferUnknownCard
              : styles.transferChangeCard
            : undefined,
        ]}
      >
        <Text style={styles.sectionTitle}>{t('detail.transferSectionTitle')}</Text>
        {!connection.isStationChange ? (
          <Text style={styles.bodyText}>
            {t('detail.sameStationDetail', {
              station: connection.leg1.alightStation.name,
              code: connection.leg1.alightStation.code,
            })}
          </Text>
        ) : connection.unknownTransferTime ? (
          <>
            <Text style={styles.bodyText}>
              {t('detail.stationChangeDetail', {
                fromName: connection.leg1.alightStation.name,
                fromCode: connection.leg1.alightStation.code,
                toName: connection.leg2.boardStation.name,
                toCode: connection.leg2.boardStation.code,
              })}
            </Text>
            <Text style={styles.warningText}>
              {t('detail.transferUnknownDetail', {
                fromCode: connection.leg1.alightStation.code,
                toCode: connection.leg2.boardStation.code,
              })}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.bodyText}>
              {t('detail.stationChangeDetail', {
                fromName: connection.leg1.alightStation.name,
                fromCode: connection.leg1.alightStation.code,
                toName: connection.leg2.boardStation.name,
                toCode: connection.leg2.boardStation.code,
              })}
            </Text>
            <Text style={styles.metaLine}>
              {t('detail.transferDurationRow', { minutes: connection.transferMinutes ?? 0 })}
            </Text>
            {connection.transferInfo ? (
              <>
                <Text style={styles.metaLine}>
                  {t('detail.transferModeRow', { note: connection.transferInfo.modeNote })}
                </Text>
                <Text style={styles.noteText}>
                  {t('detail.transferSourceRow', {
                    source: connection.transferInfo.source,
                    verified: connection.transferInfo.lastVerified,
                  })}
                </Text>
              </>
            ) : null}
          </>
        )}
      </View>

      <LegCard title={t('detail.leg2Title')} leg={connection.leg2} />

      <Text style={styles.complementNote}>{t('detail.complementNote')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
  },
  disclaimerBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  saveButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  saveButtonTextActive: {
    color: '#1E40AF',
  },
  lateNightBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  lateNightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  transferChangeCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  transferUnknownCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  trainHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  stopRow: {
    marginBottom: 10,
  },
  stopLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stopValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  stopTime: {
    fontSize: 14,
    color: '#334155',
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
  },
  metaLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    marginTop: 6,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginTop: 8,
  },
  complementNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
});
