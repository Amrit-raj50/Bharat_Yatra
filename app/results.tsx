import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RatingBadge } from '@/components/RatingBadge';
import { SampleBanner } from '@/components/SampleBanner';
import { formatDurationLocalized, formatIsoDateShort } from '@/components/formatters';
import { formatClockMinutes } from '@/domain/time';
import type { ConnectionOption } from '@/domain/types';
import { useAppStore } from '@/state/useAppStore';

export default function ResultsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { sourceStation, destinationStation, travelDate, results } = useAppStore();

  const headerComponent = (
    <View style={styles.headerBlock}>
      <SampleBanner />
      <Text style={styles.routeSummary}>
        {t('results.routeSummary', {
          from: sourceStation?.code ?? '---',
          to: destinationStation?.code ?? '---',
          date: formatIsoDateShort(travelDate),
        })}
      </Text>
      <Text style={styles.countText}>
        {t('results.count', { count: results.length })}
      </Text>
      <Text style={styles.subNote}>{t('results.sortedByTotal')}</Text>
      <Text style={styles.disclaimer}>{t('common.scheduleDisclaimer')}</Text>
    </View>
  );

  const renderCard = ({ item }: { item: ConnectionOption }) => {
    const leg1Dep = formatClockMinutes(item.leg1.departureMinutesFromMidnight);
    const leg1Arr = formatClockMinutes(item.leg1.arrivalMinutesFromMidnight);
    const leg2Dep = formatClockMinutes(item.leg2.departureMinutesFromMidnight);
    const leg2Arr = formatClockMinutes(item.leg2.arrivalMinutesFromMidnight);

    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/connection/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
      >
        <View style={styles.cardTop}>
          <RatingBadge rating={item.rating} />
          <View style={styles.timeSummary}>
            <Text style={styles.totalTime}>
              {t('results.totalTime', {
                duration: formatDurationLocalized(item.totalJourneyMinutes, t),
              })}
            </Text>
            <Text style={styles.layoverText}>
              {t('results.layover', {
                duration: formatDurationLocalized(item.layoverMinutes, t),
              })}
            </Text>
          </View>
        </View>

        <View style={styles.legBlock}>
          <Text style={styles.trainLine} numberOfLines={1}>
            {item.leg1.trainNumber} • {item.leg1.trainName}
          </Text>
          <Text style={styles.timingLine}>
            {item.leg1.boardStation.code} {leg1Dep} → {item.leg1.alightStation.code} {leg1Arr}
            {item.leg1.arrivalIsoDate !== item.leg1.departureIsoDate ? ' (+1d)' : ''}
          </Text>
        </View>

        {item.isStationChange ? (
          <View
            style={[
              styles.transferBox,
              item.unknownTransferTime ? styles.transferUnknownBox : styles.transferChangeBox,
            ]}
          >
            <Text style={styles.transferWarningTitle}>
              {item.hubClusterName
                ? t('results.stationChangeCluster', {
                    cluster: item.hubClusterName,
                    from: item.leg1.alightStation.code,
                    to: item.leg2.boardStation.code,
                  })
                : t('results.stationChangeWarning', {
                    from: item.leg1.alightStation.code,
                    to: item.leg2.boardStation.code,
                  })}
            </Text>
            <Text style={styles.transferDetailText}>
              {item.unknownTransferTime
                ? t('results.transferUnknown')
                : t('results.transferEstimate', {
                    minutes: item.transferMinutes ?? 0,
                    note: item.transferInfo?.modeNote ?? '',
                  })}
            </Text>
          </View>
        ) : (
          <View style={styles.sameStationBox}>
            <Text style={styles.sameStationText}>
              {t('results.sameStation', { code: item.leg1.alightStation.code })}
            </Text>
          </View>
        )}

        <View style={styles.legBlock}>
          <Text style={styles.trainLine} numberOfLines={1}>
            {item.leg2.trainNumber} • {item.leg2.trainName}
          </Text>
          <Text style={styles.timingLine}>
            {item.leg2.boardStation.code} {leg2Dep} → {item.leg2.alightStation.code} {leg2Arr}
            {item.leg2.arrivalIsoDate !== item.leg2.departureIsoDate ? ' (+1d)' : ''}
          </Text>
        </View>

        {item.effectiveBufferMinutes !== null ? (
          <Text style={styles.bufferFoot}>
            {t('results.effectiveBuffer', {
              duration: formatDurationLocalized(item.effectiveBufferMinutes, t),
            })}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={renderCard}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{t('results.noResultsTitle')}</Text>
          <Text style={styles.emptyBody}>
            {t('results.noResultsBody', { date: formatIsoDateShort(travelDate) })}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerBlock: {
    marginBottom: 12,
  },
  routeSummary: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  subNote: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  timeSummary: {
    alignItems: 'flex-end',
  },
  totalTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  layoverText: {
    fontSize: 12,
    color: '#475569',
  },
  legBlock: {
    marginBottom: 8,
  },
  trainLine: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  timingLine: {
    fontSize: 14,
    color: '#334155',
    marginTop: 2,
  },
  transferBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  transferChangeBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  transferUnknownBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  transferWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
  },
  transferDetailText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  sameStationBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 6,
  },
  sameStationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  bufferFoot: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
});
