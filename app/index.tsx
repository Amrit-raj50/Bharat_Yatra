import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateSelector } from '@/components/DateSelector';
import { SampleBanner } from '@/components/SampleBanner';
import { StationPickerModal } from '@/components/StationPickerModal';
import { useAppStore } from '@/state/useAppStore';

const SAMPLE_QUICK_ROUTES = [
  { from: 'LKO', to: 'JP', label: 'LKO → JP' },
  { from: 'LKO', to: 'ADI', label: 'LKO → ADI' },
  { from: 'NDLS', to: 'PUNE', label: 'NDLS → PUNE' },
  { from: 'PNBE', to: 'JP', label: 'PNBE → JP' },
];

export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    datasetMeta,
    sourceStation,
    destinationStation,
    travelDate,
    initError,
    setSourceStation,
    setDestinationStation,
    swapStations,
    setTravelDate,
    selectSampleRoute,
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

      <Text style={styles.heading}>{t('home.title')}</Text>
      <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

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
          <Pressable
            style={styles.swapButton}
            onPress={() => {
              setValidationError(null);
              swapStations();
            }}
            accessibilityRole="button"
          >
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

        {validationError ? <Text style={styles.validationError}>{validationError}</Text> : null}

        <Pressable style={styles.searchButton} onPress={handleSearch} accessibilityRole="button">
          <Text style={styles.searchButtonText}>{t('home.searchButton')}</Text>
        </Pressable>
      </View>

      {datasetMeta.datasetKind === 'SAMPLE' ? (
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>{t('home.quickSampleTitle')}</Text>
          <View style={styles.quickGrid}>
            {SAMPLE_QUICK_ROUTES.map((route) => (
              <Pressable
                key={route.label}
                style={styles.quickRouteChip}
                onPress={() => {
                  setValidationError(null);
                  selectSampleRoute(route.from, route.to);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.quickRouteText}>{route.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>{t('common.scheduleDisclaimer')}</Text>

      <StationPickerModal
        visible={pickerTarget !== null}
        title={pickerTarget === 'source' ? t('home.fromLabel') : t('home.toLabel')}
        onSelect={(station) => {
          setValidationError(null);
          if (pickerTarget === 'source') {
            setSourceStation(station);
          } else {
            setDestinationStation(station);
          }
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
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  dateLabel: {
    marginTop: 16,
  },
  stationButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  stationSelectedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  stationPlaceholder: {
    fontSize: 14,
    color: '#64748B',
  },
  swapRow: {
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  swapButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  swapText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  validationError: {
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
  quickSection: {
    marginTop: 16,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickRouteChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  quickRouteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  disclaimer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 12,
    color: '#475569',
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
});
