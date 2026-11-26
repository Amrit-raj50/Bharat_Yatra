import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { DateChips } from '@/components/DateChips';
import { InfoStrip } from '@/components/InfoStrip';
import { StationInput } from '@/components/StationInput';
import { StationPickerModal } from '@/components/StationPickerModal';
import { StatusPill } from '@/components/StatusPill';
import { formatDurationLocalized, formatIsoDateShort } from '@/components/formatters';
import { formatClockMinutes } from '@/domain/time';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, ELEVATION, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    language,
    bufferProfile,
    datasetMeta,
    datasetStats,
    recentSearches,
    savedConnections,
    howItWorksDismissed,
    sourceStation,
    destinationStation,
    travelDate,
    initError,
    setLanguage,
    setBufferProfile,
    setSourceStation,
    setDestinationStation,
    swapStations,
    setTravelDate,
    selectSampleRoute,
    dismissHowItWorks,
    refreshRemoteMeta,
    runSearch,
  } = useAppStore();

  const [pickerTarget, setPickerTarget] = useState<'source' | 'destination' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [refreshingMeta, setRefreshingMeta] = useState(false);

  const canSearch = Boolean(sourceStation && destinationStation);

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
    void runSearch();
    router.push('/results');
  };

  const handleRecentPress = (fromCode: string, toCode: string) => {
    selectSampleRoute(fromCode, toCode);
    setValidationError(null);
    setTimeout(() => {
      void runSearch();
      router.push('/results');
    }, 0);
  };

  const handleRefreshMeta = async () => {
    setRefreshingMeta(true);
    await refreshRemoteMeta();
    setRefreshingMeta(false);
  };

  const languageToggle = (
    <Pressable
      onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      style={styles.langPill}
      accessibilityRole="button"
      accessibilityLabel="Toggle language English or Hindi"
    >
      <Text style={[styles.langItem, language === 'en' && styles.langItemActive]}>EN</Text>
      <Text style={styles.langSep}>|</Text>
      <Text style={[styles.langItem, language === 'hi' && styles.langItemActive]}>हिं</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={t('appName')}
          subtitle={t('home.subtitle')}
          showBrandMark
          rightSlot={languageToggle}
          extraBottomPadding={28}
        />

        <View style={styles.body}>
          {initError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{initError}</Text>
            </View>
          ) : null}

          <View style={styles.searchCard}>
            <View style={styles.stationsBlock}>
              <View style={styles.dottedConnector} />
              <StationInput
                label={t('home.fromLabel')}
                station={sourceStation}
                placeholder={t('home.selectStation')}
                onPress={() => setPickerTarget('source')}
                dotColor={COLORS.primary}
              />
              <View style={styles.stationDivider} />
              <StationInput
                label={t('home.toLabel')}
                station={destinationStation}
                placeholder={t('home.selectStation')}
                onPress={() => setPickerTarget('destination')}
                dotColor={COLORS.accent}
              />
              <Pressable
                style={styles.swapCircle}
                onPress={swapStations}
                accessibilityRole="button"
                accessibilityLabel={t('home.swap')}
              >
                <MaterialCommunityIcons name="swap-vertical" size={22} color={COLORS.primary} />
              </Pressable>
            </View>

            <View style={styles.cardDivider} />

            <DateChips value={travelDate} onChange={setTravelDate} />

            <View style={styles.cardDivider} />

            <View style={styles.profileBlock}>
              <Text style={styles.miniLabel}>{t('home.travelStyleLabel')}</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { key: 'SOLO', label: t('settings.profileSolo').replace(' (+0 min)', '').replace(' (+0 मि)', '') },
                    { key: 'FAMILY', label: t('settings.profileFamily').replace(' (+30 min)', '').replace(' (+30 मि)', '') },
                    { key: 'EXTRA_SAFE', label: t('settings.profileExtraSafe').replace(' (+45 min)', '').replace(' (+45 मि)', '') },
                  ] as const
                ).map((opt) => {
                  const active = bufferProfile === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setBufferProfile(opt.key)}
                      style={[styles.segmentChip, active && styles.segmentChipActive]}
                      accessibilityRole="button"
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[styles.segmentText, active && styles.segmentTextActive]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {validationError ? (
              <View style={styles.inlineWarn}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#C62828" />
                <Text style={styles.validationText}>{validationError}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={!canSearch}
              accessibilityRole="button"
              accessibilityLabel={t('home.searchButton')}
            >
              <MaterialCommunityIcons name="magnify" size={20} color={COLORS.white} />
              <Text style={styles.searchBtnText}>{t('home.searchButton')}</Text>
            </Pressable>
          </View>

          {recentSearches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('home.recentSearchesTitle')}</Text>
              <View style={styles.listCard}>
                {recentSearches.slice(0, 5).map((route, idx) => (
                  <Pressable
                    key={`recent-${route.fromCode}-${route.toCode}`}
                    style={[
                      styles.recentRow,
                      idx < Math.min(recentSearches.length, 5) - 1 && styles.rowBorder,
                    ]}
                    onPress={() => handleRecentPress(route.fromCode, route.toCode)}
                    accessibilityRole="button"
                    accessibilityLabel={`${route.fromCode} to ${route.toCode}`}
                  >
                    <View style={styles.recentLeft}>
                      <MaterialCommunityIcons name="history" size={18} color={COLORS.muted} />
                      <Text style={styles.recentRoute}>
                        {route.fromCode} → {route.toCode}
                      </Text>
                    </View>
                    <View style={styles.recentRight}>
                      <Text style={styles.recentDate}>{formatIsoDateShort(travelDate)}</Text>
                      <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.primary} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {savedConnections.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('home.savedConnectionsTitle')}</Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/saved')}
                  style={styles.linkBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.viewAllSaved')}
                >
                  <Text style={styles.linkText}>{t('home.viewAllSaved')}</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselRow}
              >
                {savedConnections.slice(0, 5).map((item) => (
                  <Pressable
                    key={`saved-preview-${item.id}`}
                    style={styles.savedPreviewCard}
                    onPress={() =>
                      router.push({
                        pathname: '/connection/[id]',
                        params: { id: item.id },
                      })
                    }
                    accessibilityRole="button"
                  >
                    <StatusPill rating={item.rating} showEstimate={false} />
                    <Text style={styles.savedRoute}>
                      {item.leg1.boardStation.code} → {item.leg1.alightStation.code} →{' '}
                      {item.leg2.alightStation.code}
                    </Text>
                    <Text style={styles.savedMeta}>
                      {formatClockMinutes(item.leg1.departureMinutesFromMidnight)} ·{' '}
                      {formatDurationLocalized(item.totalJourneyMinutes, t)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {!howItWorksDismissed ? (
            <View style={styles.howCard}>
              <View style={styles.howHeader}>
                <Text style={styles.howTitle}>{t('home.howItWorksTitle')}</Text>
                <Pressable
                  onPress={dismissHowItWorks}
                  style={styles.dismissBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.dismiss')}
                >
                  <Text style={styles.dismissText}>{t('home.dismiss')}</Text>
                </Pressable>
              </View>
              <Text style={styles.howStep}>{t('home.howStep1')}</Text>
              <Text style={styles.howStep}>{t('home.howStep2')}</Text>
              <Text style={styles.howStep}>{t('home.howStep3')}</Text>
            </View>
          ) : null}

          <InfoStrip text={t('common.honestyFooter')} />

          <Pressable
            onPress={() => void handleRefreshMeta()}
            style={styles.dataCaptionBtn}
            accessibilityRole="button"
            accessibilityLabel={t('home.dataUpdatedCaption', {
              date: datasetMeta.lastUpdated,
              stations: datasetStats.stations,
              trains: datasetStats.trains,
            })}
          >
            <MaterialCommunityIcons
              name={refreshingMeta ? 'loading' : 'refresh'}
              size={14}
              color={COLORS.muted}
            />
            <Text style={styles.dataCaptionText}>
              {t('home.dataUpdatedCaption', {
                date: datasetMeta.lastUpdated,
                stations: datasetStats.stations,
                trains: datasetStats.trains,
              })}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  langPill: {
    minHeight: TOUCH_MIN - 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  langItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9C4F5',
  },
  langItemActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  langSep: {
    fontSize: 12,
    color: '#6C92D9',
  },
  body: {
    paddingHorizontal: SPACING.lg,
    marginTop: -22,
    gap: SPACING.lg,
  },
  errorBox: {
    backgroundColor: '#FDECEA',
    borderColor: '#F5C2C0',
    borderWidth: 1,
    borderRadius: RADII.md,
    padding: SPACING.md,
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...ELEVATION.card,
  },
  stationsBlock: {
    position: 'relative',
  },
  dottedConnector: {
    position: 'absolute',
    left: 8,
    top: 34,
    bottom: 34,
    width: 1,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: '#B8CCF0',
  },
  stationDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 30,
    marginRight: TOUCH_MIN,
  },
  swapCircle: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -24,
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: '#C5D8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  profileBlock: {
    gap: SPACING.xs + 2,
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
  },
  segmentChip: {
    flex: 1,
    minHeight: TOUCH_MIN - 8,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  segmentChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inlineWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#FDECEA',
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  validationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#C62828',
  },
  searchBtn: {
    minHeight: TOUCH_MIN + 4,
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  linkBtn: {
    minHeight: 36,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    overflow: 'hidden',
    ...ELEVATION.subtle,
  },
  recentRow: {
    minHeight: TOUCH_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recentRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  recentDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  carouselRow: {
    gap: SPACING.sm,
  },
  savedPreviewCard: {
    width: 210,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.md,
    gap: SPACING.xs + 2,
    ...ELEVATION.subtle,
  },
  savedRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  savedMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  howCard: {
    backgroundColor: COLORS.surface,
    borderColor: '#C5D8FA',
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    gap: SPACING.xs + 2,
  },
  howHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  howTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dismissBtn: {
    minHeight: 32,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  howStep: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  dataCaptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  dataCaptionText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
