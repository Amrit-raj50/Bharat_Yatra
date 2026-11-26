import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { InfoStrip } from '@/components/InfoStrip';
import { SkeletonCard } from '@/components/SkeletonCard';
import { TrainCard } from '@/components/TrainCard';
import { formatDurationLocalized, formatIsoDateShort, formatRunningDays } from '@/components/formatters';
import { addDaysIsoDate, formatClockMinutes, getTodayIsoDateLocal } from '@/domain/time';
import type { BufferRating, ConnectionOption, DirectTrainOption } from '@/domain/types';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, ELEVATION, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

type SortMode = 'recommended' | 'total' | 'layover' | 'departure' | 'arrival';
type FilterMode = 'all' | 'direct' | 'safe' | 'sameStation' | 'hideTight' | 'hideNight';

interface GroupedConnection {
  primary: ConnectionOption;
  similar: ConnectionOption[];
}

const RATING_PRIORITY: Record<BufferRating, number> = {
  COMFORTABLE: 0,
  OK: 1,
  TRANSFER_UNKNOWN: 2,
  TOO_LONG: 3,
  TIGHT: 4,
};

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

export default function ResultsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    sourceStation,
    destinationStation,
    travelDate,
    results,
    directTrains,
    isSearching,
    savedConnections,
    toggleSaveConnection,
    setTravelDateAndSearch,
  } = useAppStore();

  const savedIds = useMemo(() => new Set(savedConnections.map((c) => c.id)), [savedConnections]);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDirectSheet, setShowDirectSheet] = useState(false);

  const groupedResults = useMemo((): GroupedConnection[] => {
    const filtered = results.filter((item) => {
      switch (filterMode) {
        case 'safe':
          return item.rating === 'COMFORTABLE' || item.rating === 'OK';
        case 'sameStation':
          return !item.isStationChange;
        case 'hideTight':
          return item.rating !== 'TIGHT';
        case 'hideNight':
          return !item.isLateNightTransfer;
        case 'all':
        default:
          return true;
      }
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === 'recommended') {
        const rankDiff = RATING_PRIORITY[a.rating] - RATING_PRIORITY[b.rating];
        if (rankDiff !== 0) return rankDiff;
        return a.totalJourneyMinutes - b.totalJourneyMinutes;
      }
      if (sortMode === 'layover') {
        return a.layoverMinutes - b.layoverMinutes || a.totalJourneyMinutes - b.totalJourneyMinutes;
      }
      if (sortMode === 'departure') {
        return (
          a.leg1.departureMinutesFromMidnight - b.leg1.departureMinutesFromMidnight ||
          a.totalJourneyMinutes - b.totalJourneyMinutes
        );
      }
      if (sortMode === 'arrival') {
        return (
          a.leg2.arrivalMinutesFromMidnight - b.leg2.arrivalMinutesFromMidnight ||
          a.totalJourneyMinutes - b.totalJourneyMinutes
        );
      }
      return a.totalJourneyMinutes - b.totalJourneyMinutes || a.layoverMinutes - b.layoverMinutes;
    });

    // Group near-duplicates (same train pair & hub codes)
    const groups = new Map<string, GroupedConnection>();
    for (const opt of sorted) {
      const key = `${opt.leg1.trainNumber}_${opt.leg2.trainNumber}_${opt.leg1.alightStation.code}_${opt.leg2.boardStation.code}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { primary: opt, similar: [] });
      } else {
        existing.similar.push(opt);
      }
    }
    return [...groups.values()];
  }, [results, filterMode, sortMode]);

  const displayedDirectTrains = useMemo(() => {
    const sorted = [...directTrains];
    sorted.sort((a, b) =>
      sortMode === 'departure'
        ? a.departureMinutesFromMidnight - b.departureMinutesFromMidnight
        : a.durationMinutes - b.durationMinutes
    );
    return sorted;
  }, [directTrains, sortMode]);

  const prevDate = addDaysIsoDate(travelDate, -1);
  const nextDate = addDaysIsoDate(travelDate, 1);
  const activeFilterCount = filterMode === 'all' ? 0 : 1;

  const calendarAction = (
    <Pressable
      onPress={() => setShowDatePicker(true)}
      style={styles.headerCalBtn}
      accessibilityRole="button"
      accessibilityLabel={t('home.pickDate')}
    >
      <MaterialCommunityIcons name="calendar" size={22} color={COLORS.white} />
    </Pressable>
  );

  const renderHeaderControls = () => (
    <View style={styles.controlsHeader}>
      <View style={styles.summaryRow}>
        <Text style={styles.countText}>
          {filterMode === 'direct'
            ? t('results.directCount', { count: displayedDirectTrains.length })
            : t('results.count', { count: groupedResults.length })}
        </Text>
        {activeFilterCount > 0 ? (
          <Pressable
            onPress={() => setFilterMode('all')}
            style={styles.clearBtn}
            accessibilityRole="button"
          >
            <Text style={styles.clearBtnText}>
              {t('results.clearFilters', { count: activeFilterCount })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {directTrains.length > 0 ? (
        <Pressable
          style={styles.directBanner}
          onPress={() => setShowDirectSheet(true)}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="train-variant" size={18} color="#1B7F3B" />
          <Text style={styles.directBannerText}>
            {t('results.directTrainsBanner', { count: directTrains.length })}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#1B7F3B" />
        </Pressable>
      ) : null}

      <View style={styles.chipSection}>
        <View style={styles.chipLabelRow}>
          <Text style={styles.controlLabel}>{t('results.sortBy')}</Text>
          <Text style={styles.scrollHint}>{t('results.scrollHint')}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(
            [
              { key: 'recommended', label: t('results.sortRecommended') },
              { key: 'total', label: t('results.sortTotal') },
              { key: 'layover', label: t('results.sortLayover') },
              { key: 'departure', label: t('results.sortDeparture') },
              { key: 'arrival', label: t('results.sortArrival') },
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(
            [
              { key: 'all', label: t('results.filterAll') },
              { key: 'direct', label: t('results.filterDirect') },
              { key: 'safe', label: t('results.filterSafe') },
              { key: 'sameStation', label: t('results.filterSameStation') },
              { key: 'hideTight', label: t('results.filterHideTight') },
              { key: 'hideNight', label: t('results.filterHideNight') },
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

  const renderDirectCard = ({ item }: { item: DirectTrainOption }) => (
    <View style={styles.directCard}>
      <View style={styles.directTop}>
        <View style={styles.directPill}>
          <MaterialCommunityIcons name="train" size={14} color="#1B7F3B" />
          <Text style={styles.directPillText}>{t('results.directBadge')}</Text>
        </View>
        <Text style={styles.directDuration}>
          {t('results.totalTime', { duration: formatDurationLocalized(item.durationMinutes, t) })}
        </Text>
      </View>
      <Text style={styles.directTrainTitle}>
        {item.trainNumber} · {item.trainName}
      </Text>
      <Text style={styles.directTimings}>
        {sourceStation?.code ?? '---'} {formatClockMinutes(item.departureMinutesFromMidnight)} →{' '}
        {destinationStation?.code ?? '---'} {formatClockMinutes(item.arrivalMinutesFromMidnight)}
        {item.arrivalIsoDate !== item.departureIsoDate ? ` ${t('common.nextDayTag')}` : ''}
      </Text>
      <Text style={styles.directRuns}>
        {t('common.runsOn', { days: formatRunningDays(item.runningDays, t) })}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title={t('results.routeSummary', {
          from: sourceStation?.code ?? '---',
          to: destinationStation?.code ?? '---',
        })}
        subtitle={formatIsoDateShort(travelDate)}
        onBack={() => router.back()}
        backLabel={t('common.back')}
        rightSlot={calendarAction}
      />

      <View style={styles.dayStepper}>
        <Pressable
          onPress={() => setTravelDateAndSearch(prevDate)}
          style={styles.dayStepBtn}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="chevron-left" size={18} color={COLORS.primary} />
          <Text style={styles.dayStepText}>{formatIsoDateShort(prevDate).slice(0, 11)}</Text>
        </Pressable>
        <View style={styles.dayCurrent}>
          <Text style={styles.dayCurrentText}>{formatIsoDateShort(travelDate).slice(0, 11)}</Text>
        </View>
        <Pressable
          onPress={() => setTravelDateAndSearch(nextDate)}
          style={styles.dayStepBtn}
          accessibilityRole="button"
        >
          <Text style={styles.dayStepText}>{formatIsoDateShort(nextDate).slice(0, 11)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.primary} />
        </Pressable>
      </View>

      {isSearching ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {renderHeaderControls()}
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : filterMode === 'direct' ? (
        <FlatList
          data={displayedDirectTrains}
          keyExtractor={(item) => `${item.trainNumber}_${item.departureIsoDate}`}
          renderItem={renderDirectCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, SPACING.lg) + SPACING.lg },
          ]}
          ListHeaderComponent={renderHeaderControls()}
          ListEmptyComponent={
            <EmptyState
              icon="train-variant"
              title={t('results.noDirectTrainsTitle')}
              body={t('results.noDirectTrainsBody', { date: formatIsoDateShort(travelDate) })}
              actions={[
                {
                  label: t('results.tryNearby'),
                  primary: true,
                  onPress: () => setFilterMode('all'),
                },
              ]}
            />
          }
          ListFooterComponent={<InfoStrip text={t('common.honestyFooter')} />}
        />
      ) : (
        <FlatList
          data={groupedResults}
          keyExtractor={(item) => item.primary.id}
          renderItem={({ item }) => (
            <TrainCard
              item={item.primary}
              similarOptions={item.similar}
              isSaved={savedIds.has(item.primary.id)}
              onPress={(opt) =>
                router.push({
                  pathname: '/connection/[id]',
                  params: { id: opt.id },
                })
              }
              onToggleSave={(opt) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleSaveConnection(opt);
              }}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, SPACING.lg) + SPACING.lg },
          ]}
          ListHeaderComponent={renderHeaderControls()}
          ListEmptyComponent={
            <EmptyState
              icon="train-variant"
              title={t('results.noResultsTitle')}
              body={
                results.length > 0
                  ? t('results.noFilterMatchBody')
                  : t('results.noResultsBody', { date: formatIsoDateShort(travelDate) })
              }
              actions={[
                {
                  label: t('results.tryNextDay'),
                  primary: true,
                  onPress: () => setTravelDateAndSearch(nextDate),
                },
                {
                  label: t('results.tryNearby'),
                  onPress: () => setFilterMode('all'),
                },
              ]}
            />
          }
          ListFooterComponent={<InfoStrip text={t('common.honestyFooter')} />}
        />
      )}

      {showDatePicker ? (
        <DateTimePicker
          value={parseIsoToLocalDate(travelDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={parseIsoToLocalDate(getTodayIsoDateLocal())}
          onChange={(_e, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setTravelDateAndSearch(formatLocalDateToIso(selectedDate));
            }
          }}
        />
      ) : null}

      <Modal
        visible={showDirectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDirectSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t('results.directTrainsSheetTitle', { date: formatIsoDateShort(travelDate) })}
              </Text>
              <Pressable
                onPress={() => setShowDirectSheet(false)}
                style={styles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <MaterialCommunityIcons name="close" size={22} color={COLORS.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList}>
              {displayedDirectTrains.map((d) => (
                <View key={`${d.trainNumber}_${d.departureIsoDate}`} style={styles.sheetItem}>
                  <Text style={styles.directTrainTitle}>
                    {d.trainNumber} · {d.trainName}
                  </Text>
                  <Text style={styles.directTimings}>
                    {formatClockMinutes(d.departureMinutesFromMidnight)} →{' '}
                    {formatClockMinutes(d.arrivalMinutesFromMidnight)} ·{' '}
                    {formatDurationLocalized(d.durationMinutes, t)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCalBtn: {
    minWidth: TOUCH_MIN,
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  dayStepBtn: {
    minHeight: TOUCH_MIN - 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  dayStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dayCurrent: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  dayCurrentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    padding: SPACING.lg,
  },
  controlsHeader: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearBtn: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  directBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#E6F6EC',
    borderColor: '#A7DFB9',
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  directBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1B7F3B',
  },
  chipSection: {
    gap: SPACING.xs + 2,
  },
  chipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  scrollHint: {
    fontSize: 11,
    color: COLORS.muted,
  },
  chipRow: {
    gap: SPACING.sm,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  chip: {
    minHeight: TOUCH_MIN - 10,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  directCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.xs + 2,
    ...ELEVATION.subtle,
  },
  directTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F6EC',
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  directPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B7F3B',
  },
  directDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  directTrainTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  directTimings: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  directRuns: {
    fontSize: 12,
    color: COLORS.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 56, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetClose: {
    minWidth: TOUCH_MIN,
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetList: {
    gap: SPACING.sm,
  },
  sheetItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingVertical: SPACING.md,
    gap: 4,
  },
});
