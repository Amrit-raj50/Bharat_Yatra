import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RatingBadge } from '@/components/RatingBadge';
import { SampleBanner } from '@/components/SampleBanner';
import {
  formatDurationLocalized,
  formatIsoDateShort,
  formatRunningDays,
} from '@/components/formatters';
import { BUFFER_PROFILE_EXTRA_MINUTES } from '@/config/ratingThresholds';
import { addDaysIsoDate, formatClockMinutes } from '@/domain/time';
import type { ConnectionOption, DirectTrainOption } from '@/domain/types';
import { useAppStore } from '@/state/useAppStore';

type SortMode = 'total' | 'layover' | 'departure';
type FilterMode = 'all' | 'direct' | 'safe' | 'sameStation' | 'stationChange' | 'tight';

export default function ResultsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    sourceStation,
    destinationStation,
    travelDate,
    results,
    directTrains,
    isSearching,
    bufferProfile,
    savedConnections,
    toggleSaveConnection,
    setTravelDateAndSearch,
  } = useAppStore();

  const extraBufferMinutes = BUFFER_PROFILE_EXTRA_MINUTES[bufferProfile];
  const savedIds = useMemo(() => new Set(savedConnections.map((c) => c.id)), [savedConnections]);

  const [sortMode, setSortMode] = useState<SortMode>('total');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const displayedResults = useMemo(() => {
    const filtered = results.filter((item) => {
      switch (filterMode) {
        case 'safe':
          return item.rating === 'COMFORTABLE' || item.rating === 'OK';
        case 'sameStation':
          return !item.isStationChange;
        case 'stationChange':
          return item.isStationChange;
        case 'tight':
          return item.rating === 'TIGHT';
        case 'all':
        default:
          return true;
      }
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === 'layover') {
        if (a.layoverMinutes !== b.layoverMinutes) {
          return a.layoverMinutes - b.layoverMinutes;
        }
        return a.totalJourneyMinutes - b.totalJourneyMinutes;
      }
      if (sortMode === 'departure') {
        if (a.leg1.departureMinutesFromMidnight !== b.leg1.departureMinutesFromMidnight) {
          return a.leg1.departureMinutesFromMidnight - b.leg1.departureMinutesFromMidnight;
        }
        return a.totalJourneyMinutes - b.totalJourneyMinutes;
      }
      if (a.totalJourneyMinutes !== b.totalJourneyMinutes) {
        return a.totalJourneyMinutes - b.totalJourneyMinutes;
      }
      return a.layoverMinutes - b.layoverMinutes;
    });
    return sorted;
  }, [results, filterMode, sortMode]);

  const displayedDirectTrains = useMemo(() => {
    const sorted = [...directTrains];
    sorted.sort((a, b) => {
      if (sortMode === 'departure') {
        return a.departureMinutesFromMidnight - b.departureMinutesFromMidnight;
      }
      return a.durationMinutes - b.durationMinutes;
    });
    return sorted;
  }, [directTrains, sortMode]);

  const headerComponent = (
    <View style={styles.headerBlock}>
      <SampleBanner />
      <View style={styles.routeBar}>
        <Text style={styles.routeSummary}>
          {t('results.routeSummary', {
            from: sourceStation?.code ?? '---',
            to: destinationStation?.code ?? '---',
            date: formatIsoDateShort(travelDate),
          })}
        </Text>
        <View style={styles.dateStepperRow}>
          <Pressable
            style={styles.dateStepBtn}
            onPress={() => setTravelDateAndSearch(addDaysIsoDate(travelDate, -1))}
            accessibilityRole="button"
          >
            <Text style={styles.dateStepText}>{t('home.prevDay')}</Text>
          </Pressable>
          <Pressable
            style={styles.dateStepBtn}
            onPress={() => setTravelDateAndSearch(addDaysIsoDate(travelDate, 1))}
            accessibilityRole="button"
          >
            <Text style={styles.dateStepText}>{t('home.nextDay')}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.countText}>
        {filterMode === 'direct'
          ? t('results.directCount', { count: displayedDirectTrains.length })
          : t('results.count', { count: displayedResults.length })}
      </Text>
      <Text style={styles.subNote}>{t('results.sortedByTotal')}</Text>
      <Text style={styles.disclaimer}>{t('common.scheduleDisclaimer')}</Text>
      {extraBufferMinutes > 0 ? (
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>
            {t('results.bufferProfileBadge', { minutes: extraBufferMinutes })}
          </Text>
        </View>
      ) : null}
      {directTrains.length > 0 ? (
        <View style={styles.directNoticeBox}>
          <Text style={styles.directNoticeText}>
            {t('results.directTrainsNotice', {
              count: directTrains.length,
              date: formatIsoDateShort(travelDate),
              trains: directTrains
                .slice(0, 3)
                .map((d) => `${d.trainNumber} (${formatClockMinutes(d.departureMinutesFromMidnight)})`)
                .join(', '),
            })}
          </Text>
        </View>
      ) : null}

      <View style={styles.controlsBlock}>
        <Text style={styles.controlLabel}>{t('results.sortBy')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {(
            [
              { key: 'total', label: t('results.sortTotal') },
              { key: 'layover', label: t('results.sortLayover') },
              { key: 'departure', label: t('results.sortDeparture') },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.chip, sortMode === opt.key && styles.chipActive]}
              onPress={() => setSortMode(opt.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.chipText, sortMode === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.controlLabel}>{t('results.filterBy')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {(
            [
              { key: 'all', label: t('results.filterAll') },
              { key: 'direct', label: t('results.filterDirect') },
              { key: 'safe', label: t('results.filterSafe') },
              { key: 'sameStation', label: t('results.filterSameStation') },
              { key: 'stationChange', label: t('results.filterStationChange') },
              { key: 'tight', label: t('results.filterTight') },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.chip, filterMode === opt.key && styles.chipActive]}
              onPress={() => setFilterMode(opt.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.chipText, filterMode === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
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
          <Text style={styles.runsLine}>
            {t('common.runsOn', { days: formatRunningDays(item.leg1.runningDays, t) })}
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
          <Text style={styles.runsLine}>
            {t('common.runsOn', { days: formatRunningDays(item.leg2.runningDays, t) })}
          </Text>
        </View>

        {item.isLateNightTransfer ? (
          <View style={styles.lateNightBox}>
            <Text style={styles.lateNightText}>🌙 {t('results.lateNightWarning')}</Text>
          </View>
        ) : null}

        <View style={styles.cardFooterRow}>
          {item.effectiveBufferMinutes !== null ? (
            <Text style={styles.bufferFoot}>
              {t('results.effectiveBuffer', {
                duration: formatDurationLocalized(item.effectiveBufferMinutes, t),
              })}
            </Text>
          ) : (
            <View />
          )}
          <Pressable
            style={[styles.saveBtn, savedIds.has(item.id) && styles.saveBtnActive]}
            onPress={() => toggleSaveConnection(item)}
            accessibilityRole="button"
          >
            <Text style={[styles.saveBtnText, savedIds.has(item.id) && styles.saveBtnTextActive]}>
              {savedIds.has(item.id) ? `★ ${t('results.savedButton')}` : `☆ ${t('results.saveButton')}`}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderDirectCard = ({ item }: { item: DirectTrainOption }) => {
    const dep = formatClockMinutes(item.departureMinutesFromMidnight);
    const arr = formatClockMinutes(item.arrivalMinutesFromMidnight);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.directBadge}>
            <Text style={styles.directBadgeText}>{t('results.directBadge')}</Text>
          </View>
          <Text style={styles.totalTime}>
            {t('results.totalTime', {
              duration: formatDurationLocalized(item.durationMinutes, t),
            })}
          </Text>
        </View>
        <View style={styles.legBlock}>
          <Text style={styles.trainLine} numberOfLines={1}>
            {item.trainNumber} • {item.trainName}
          </Text>
          <Text style={styles.timingLine}>
            {sourceStation?.code ?? '---'} {dep} → {destinationStation?.code ?? '---'} {arr}
            {item.arrivalIsoDate !== item.departureIsoDate ? ' (+1d)' : ''}
          </Text>
          <Text style={styles.runsLine}>
            {t('common.runsOn', { days: formatRunningDays(item.runningDays, t) })}
          </Text>
        </View>
      </View>
    );
  };

  if (filterMode === 'direct') {
    return (
      <FlatList
        data={displayedDirectTrains}
        keyExtractor={(item) => `${item.trainNumber}_${item.departureIsoDate}`}
        renderItem={renderDirectCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          isSearching ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#1D4ED8" />
              <Text style={[styles.emptyBody, { marginTop: 10 }]}>{t('results.searching')}</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{t('results.noDirectTrainsTitle')}</Text>
              <Text style={styles.emptyBody}>
                {t('results.noDirectTrainsBody', { date: formatIsoDateShort(travelDate) })}
              </Text>
            </View>
          )
        }
      />
    );
  }

  return (
    <FlatList
      data={displayedResults}
      keyExtractor={(item) => item.id}
      renderItem={renderCard}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={
        isSearching ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color="#1D4ED8" />
            <Text style={[styles.emptyBody, { marginTop: 10 }]}>{t('results.searching')}</Text>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('results.noResultsTitle')}</Text>
            <Text style={styles.emptyBody}>
              {results.length > 0
                ? t('results.noFilterMatchBody')
                : t('results.noResultsBody', { date: formatIsoDateShort(travelDate) })}
            </Text>
          </View>
        )
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
  routeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  routeSummary: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateStepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dateStepBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateStepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  subNote: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730A3',
  },
  directNoticeBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  directNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  directBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  directBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  lateNightBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  lateNightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saveBtnActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  saveBtnTextActive: {
    color: '#1E40AF',
  },
  controlsBlock: {
    marginTop: 10,
    gap: 6,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
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
    marginTop: 2,
  },
  legBlock: {
    paddingVertical: 4,
  },
  trainLine: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timingLine: {
    fontSize: 14,
    color: '#334155',
    marginTop: 2,
  },
  runsLine: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sameStationBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 8,
  },
  sameStationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  transferBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 8,
  },
  transferChangeBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  transferUnknownBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  transferWarningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  transferDetailText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  bufferFoot: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
    paddingTop: 8,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
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
    color: '#475569',
    lineHeight: 20,
  },
});
