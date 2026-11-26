import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateSelector } from '@/components/DateSelector';
import { RatingBadge } from '@/components/RatingBadge';
import { SampleBanner } from '@/components/SampleBanner';
import { StationPickerModal } from '@/components/StationPickerModal';
import { formatIsoDateShort } from '@/components/formatters';
import { formatClockMinutes } from '@/domain/time';
import { useAppStore } from '@/state/useAppStore';

export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    datasetMeta,
    datasetStats,
    suggestedRoutes,
    recentSearches,
    savedConnections,
    sourceStation,
    destinationStation,
    travelDate,
    initError,
    setSourceStation,
    setDestinationStation,
    swapStations,
    setTravelDate,
    selectSampleRoute,
    removeSavedConnection,
    runSearch,
  } = useAppStore();

  const [pickerTarget, setPickerTarget] = useState<'source' | 'destination' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSearch = () => {
    if (!sourceStation || !destinationStation) {
      setValidationError(t('home.selectBothError'));
      return;
    }
    if (sourceStation.code === destinationStation.code) {
      setValidationError(t('home.sameStationError'));
      return;
    }
    setValidationError(null);
    runSearch();
    router.push('/results');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SampleBanner />

      {initError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{initError}</Text>
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.heading}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.statsPill}>
        <Text style={styles.statsText}>
          {t('home.datasetSummary', {
            stations: datasetStats.stations,
            trains: datasetStats.trains,
            version: datasetMeta.dataVersion,
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('home.fromLabel')}</Text>
        <Pressable
          style={styles.stationButton}
          onPress={() => setPickerTarget('source')}
          accessibilityRole="button"
        >
          {sourceStation ? (
            <Text style={styles.stationSelectedText}>
              {sourceStation.code} — {sourceStation.name}
            </Text>
          ) : (
            <Text style={styles.stationPlaceholder}>{t('home.selectStation')}</Text>
          )}
        </Pressable>

        <View style={styles.swapRow}>
          <Pressable style={styles.swapButton} onPress={swapStations} accessibilityRole="button">
            <Text style={styles.swapText}>⇅ {t('home.swap')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t('home.toLabel')}</Text>
        <Pressable
          style={styles.stationButton}
          onPress={() => setPickerTarget('destination')}
          accessibilityRole="button"
        >
          {destinationStation ? (
            <Text style={styles.stationSelectedText}>
              {destinationStation.code} — {destinationStation.name}
            </Text>
          ) : (
            <Text style={styles.stationPlaceholder}>{t('home.selectStation')}</Text>
          )}
        </Pressable>

        <Text style={[styles.label, styles.dateLabel]}>{t('home.dateLabel')}</Text>
        <DateSelector value={travelDate} onChange={setTravelDate} />

        {validationError ? <Text style={styles.validationText}>{validationError}</Text> : null}

        <Pressable style={styles.searchButton} onPress={handleSearch} accessibilityRole="button">
          <Text style={styles.searchButtonText}>{t('home.searchButton')}</Text>
        </Pressable>
      </View>

      {savedConnections.length > 0 ? (
        <View style={styles.quickBox}>
          <Text style={styles.quickTitle}>{t('home.savedConnectionsTitle')}</Text>
          {savedConnections.map((item) => (
            <View key={`saved-${item.id}`} style={styles.savedCard}>
              <Pressable
                style={styles.savedCardMain}
                onPress={() =>
                  router.push({
                    pathname: '/connection/[id]',
                    params: { id: item.id },
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.savedCardTop}>
                  <Text style={styles.savedRouteText}>
                    {item.leg1.boardStation.code} → {item.leg1.alightStation.code}
                    {item.isStationChange ? `/${item.leg2.boardStation.code}` : ''} →{' '}
                    {item.leg2.alightStation.code}
                  </Text>
                  <RatingBadge rating={item.rating} />
                </View>
                <Text style={styles.savedMetaText}>
                  {formatIsoDateShort(item.leg1.departureIsoDate)} •{' '}
                  {formatClockMinutes(item.leg1.departureMinutesFromMidnight)} •{' '}
                  {item.leg1.trainNumber} + {item.leg2.trainNumber}
                </Text>
              </Pressable>
              <Pressable
                style={styles.removeSavedBtn}
                onPress={() => removeSavedConnection(item.id)}
                accessibilityRole="button"
              >
                <Text style={styles.removeSavedText}>{t('home.removeSaved')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {recentSearches.length > 0 ? (
        <View style={styles.quickBox}>
          <Text style={styles.quickTitle}>{t('home.recentSearchesTitle')}</Text>
          <View style={styles.quickChips}>
            {recentSearches.map((route) => (
              <Pressable
                key={`recent-${route.fromCode}-${route.toCode}`}
                style={styles.recentChip}
                onPress={() => {
                  selectSampleRoute(route.fromCode, route.toCode);
                  setValidationError(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.recentChipText}>
                  {route.fromCode} → {route.toCode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {suggestedRoutes.length > 0 ? (
        <View style={styles.quickBox}>
          <Text style={styles.quickTitle}>
            {datasetMeta.datasetKind === 'SAMPLE'
              ? t('home.quickSampleTitle')
              : t('home.popularRoutesTitle')}
          </Text>
          <View style={styles.quickChips}>
            {suggestedRoutes.map((route) => (
              <Pressable
                key={route.label}
                style={styles.quickChip}
                onPress={() => {
                  selectSampleRoute(route.fromCode, route.toCode);
                  setValidationError(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.quickChipText}>{route.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>{t('common.scheduleDisclaimer')}</Text>
      <Text style={styles.complement}>{t('detail.complementNote')}</Text>

      <StationPickerModal
        visible={pickerTarget !== null}
        title={pickerTarget === 'source' ? t('home.fromLabel') : t('home.toLabel')}
        onSelect={(station) => {
          if (pickerTarget === 'source') {
            setSourceStation(station);
          } else {
            setDestinationStation(station);
          }
          setValidationError(null);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
  },
  statsPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  savedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  savedCardMain: {
    flex: 1,
  },
  savedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  savedRouteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  savedMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  removeSavedBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeSavedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  dateLabel: {
    marginTop: 14,
  },
  stationButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  stationSelectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  stationPlaceholder: {
    fontSize: 15,
    color: '#64748B',
  },
  swapRow: {
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  swapButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
  },
  swapText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  validationText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  quickChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
  },
  disclaimer: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  complement: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
