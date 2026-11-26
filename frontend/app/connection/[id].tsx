import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { InfoStrip } from '@/components/InfoStrip';
import { StatusPill } from '@/components/StatusPill';
import { Timeline } from '@/components/Timeline';
import { formatDurationLocalized, formatIsoDateShort } from '@/components/formatters';
import { BUFFER_PROFILE_EXTRA_MINUTES } from '@/config/ratingThresholds';
import { formatClockMinutes } from '@/domain/time';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, ELEVATION, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

export default function ConnectionDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const connection = useAppStore((s) => (id ? s.getConnectionById(id) : undefined));
  const results = useAppStore((s) => s.results);
  const bufferProfile = useAppStore((s) => s.bufferProfile);
  const isSaved = useAppStore((s) => (id ? s.isConnectionSaved(id) : false));
  const toggleSaveConnection = useAppStore((s) => s.toggleSaveConnection);

  const [snackbar, setSnackbar] = useState<string | null>(null);

  const backupDepartures = useMemo(() => {
    if (!connection) return [];
    const seen = new Set<string>();
    return results
      .filter(
        (r) =>
          r.leg2.boardStation.code === connection.leg2.boardStation.code &&
          r.leg2.trainNumber !== connection.leg2.trainNumber &&
          r.leg2.departureMinutesFromMidnight > connection.leg2.departureMinutesFromMidnight
      )
      .filter((r) => {
        if (seen.has(r.leg2.trainNumber)) return false;
        seen.add(r.leg2.trainNumber);
        return true;
      })
      .slice(0, 3);
  }, [connection, results]);

  if (!connection) {
    return (
      <View style={styles.screen}>
        <AppHeader
          title={t('detail.title')}
          onBack={() => router.back()}
          backLabel={t('common.back')}
        />
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="train-variant"
            title={t('detail.title')}
            body={t('detail.notFound')}
            actions={[
              {
                label: t('saved.goPlan'),
                primary: true,
                onPress: () => router.push('/(tabs)'),
              },
            ]}
          />
        </View>
      </View>
    );
  }

  const marginMinutes = BUFFER_PROFILE_EXTRA_MINUTES[bufferProfile];
  const transferMin = connection.transferMinutes ?? 0;

  const getPlainExplanation = () => {
    const hub = connection.leg1.alightStation.name;
    if (connection.unknownTransferTime) {
      return t('detail.plainUnknown');
    }
    if (connection.rating === 'TIGHT') {
      return t('detail.plainTight', {
        buffer: formatDurationLocalized(connection.effectiveBufferMinutes ?? 0, t),
        station: hub,
      });
    }
    if (connection.rating === 'TOO_LONG') {
      return t('detail.plainTooLong', {
        layover: formatDurationLocalized(connection.layoverMinutes, t),
        station: hub,
      });
    }
    return t('detail.plainSafe', {
      buffer: formatDurationLocalized(connection.effectiveBufferMinutes ?? 0, t),
      station: hub,
    });
  };

  const handleToggleSave = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const willSave = !isSaved;
    toggleSaveConnection(connection);
    if (willSave) {
      setSnackbar(t('detail.savedSnackbar'));
      setTimeout(() => setSnackbar(null), 2500);
    }
  };

  const handleShare = async () => {
    const msg = t('detail.shareMessage', {
      date: formatIsoDateShort(connection.leg1.departureIsoDate),
      t1: `${connection.leg1.trainNumber} ${connection.leg1.trainName}`,
      from: connection.leg1.boardStation.code,
      d1: formatClockMinutes(connection.leg1.departureMinutesFromMidnight),
      h1: connection.leg1.alightStation.code,
      a1: formatClockMinutes(connection.leg1.arrivalMinutesFromMidnight),
      layover: formatDurationLocalized(connection.layoverMinutes, t),
      t2: `${connection.leg2.trainNumber} ${connection.leg2.trainName}`,
      h2: connection.leg2.boardStation.code,
      d2: formatClockMinutes(connection.leg2.departureMinutesFromMidnight),
      to: connection.leg2.alightStation.code,
      a2: formatClockMinutes(connection.leg2.arrivalMinutesFromMidnight),
      rating: t(`ratings.${connection.rating}`),
    });
    await Share.share({ message: msg });
  };

  const headerActions = (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => void handleShare()}
        style={styles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel={t('detail.share')}
      >
        <MaterialCommunityIcons name="share-variant-outline" size={22} color={COLORS.white} />
      </Pressable>
      <Pressable
        onPress={handleToggleSave}
        style={styles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? t('detail.savedOffline') : t('detail.saveForOffline')}
      >
        <MaterialCommunityIcons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={COLORS.white}
        />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title={t('detail.title')}
        subtitle={`${connection.leg1.boardStation.code} → ${connection.leg2.alightStation.code}`}
        onBack={() => router.back()}
        backLabel={t('common.back')}
        rightSlot={headerActions}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 96 + Math.max(insets.bottom, SPACING.md) },
        ]}
      >
        <View style={styles.heroCard}>
          <StatusPill rating={connection.rating} size="lg" />

          <View style={styles.factsRow}>
            <View style={styles.factCol}>
              <Text style={styles.factLabel}>{t('detail.totalLabel')}</Text>
              <Text style={styles.factVal}>
                {formatDurationLocalized(connection.totalJourneyMinutes, t)}
              </Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.factCol}>
              <Text style={styles.factLabel}>{t('detail.layoverLabel')}</Text>
              <Text style={styles.factVal}>
                {formatDurationLocalized(connection.layoverMinutes, t)}
              </Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.factCol}>
              <Text style={styles.factLabel}>{t('detail.arrivalLabel')}</Text>
              <Text style={styles.factVal}>
                {formatClockMinutes(connection.leg2.arrivalMinutesFromMidnight)}
                {connection.leg2.arrivalIsoDate !== connection.leg1.departureIsoDate ? ' +1d' : ''}
              </Text>
            </View>
          </View>

          <Text style={styles.plainSentence}>{getPlainExplanation()}</Text>

          {connection.effectiveBufferMinutes !== null ? (
            <View style={styles.formulaBar}>
              <Text style={styles.formulaText}>
                {t('detail.breakdownFormula', {
                  layover: formatDurationLocalized(connection.layoverMinutes, t),
                  transfer: formatDurationLocalized(transferMin, t),
                  margin: formatDurationLocalized(marginMinutes, t),
                  buffer: formatDurationLocalized(connection.effectiveBufferMinutes, t),
                })}
              </Text>
            </View>
          ) : null}
        </View>

        <Timeline connection={connection} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('detail.beforeBookTitle')}</Text>
          <View style={styles.checkRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B26A00" />
            <Text style={styles.checkText}>{t('detail.separateTicketWarn')}</Text>
          </View>
          <View style={styles.checkRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.checkText}>{t('detail.checkAvailability')}</Text>
          </View>

          <View style={styles.linkRow}>
            <Pressable
              style={styles.linkChip}
              onPress={() => void Linking.openURL('https://www.irctc.co.in/nget/train-search')}
              accessibilityRole="button"
            >
              <Text style={styles.linkChipText}>
                {t('detail.openIrctcLeg1', { train: connection.leg1.trainNumber })}
              </Text>
            </Pressable>
            <Pressable
              style={styles.linkChip}
              onPress={() => void Linking.openURL('https://www.irctc.co.in/nget/train-search')}
              accessibilityRole="button"
            >
              <Text style={styles.linkChipText}>
                {t('detail.openIrctcLeg2', { train: connection.leg2.trainNumber })}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.ntesBtn}
            onPress={() => void Linking.openURL('https://enquiry.indianrail.gov.in/')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="train" size={16} color={COLORS.primary} />
            <Text style={styles.ntesBtnText}>{t('detail.openNtes')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('detail.missTrainTitle')}</Text>
          <Text style={styles.subText}>
            {t('detail.missTrainSubtitle', {
              from: connection.leg2.boardStation.code,
              to: connection.leg2.alightStation.code,
              date: formatIsoDateShort(connection.leg2.departureIsoDate),
            })}
          </Text>
          {backupDepartures.length > 0 ? (
            backupDepartures.map((b) => (
              <View key={b.id} style={styles.backupRow}>
                <Text style={styles.backupTrain}>
                  {b.leg2.trainNumber} · {b.leg2.trainName}
                </Text>
                <Text style={styles.backupTime}>
                  {formatClockMinutes(b.leg2.departureMinutesFromMidnight)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.subText}>{t('detail.missTrainNone')}</Text>
          )}
        </View>

        <InfoStrip text={t('common.scheduleDisclaimer')} />
      </ScrollView>

      {snackbar ? (
        <View style={[styles.snackbar, { bottom: 72 + Math.max(insets.bottom, SPACING.md) }]}>
          <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.white} />
          <Text style={styles.snackbarText}>{snackbar}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.stickyBar,
          { paddingBottom: Math.max(insets.bottom, SPACING.md) },
        ]}
      >
        <Pressable
          style={[styles.savePrimaryBtn, isSaved && styles.savePrimaryActive]}
          onPress={handleToggleSave}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={COLORS.white}
          />
          <Text style={styles.savePrimaryText}>
            {isSaved ? t('detail.savedOffline') : t('detail.saveForOffline')}
          </Text>
        </Pressable>

        <Pressable
          style={styles.shareSecondaryBtn}
          onPress={() => void handleShare()}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="share-variant-outline" size={20} color={COLORS.primary} />
          <Text style={styles.shareSecondaryText}>{t('detail.share')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    minWidth: TOUCH_MIN,
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...ELEVATION.card,
  },
  factsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    paddingVertical: SPACING.sm + 2,
  },
  factCol: {
    flex: 1,
    alignItems: 'center',
  },
  factDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.divider,
  },
  factLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  factVal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  plainSentence: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  formulaBar: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  formulaText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...ELEVATION.subtle,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  linkChip: {
    minHeight: TOUCH_MIN - 6,
    backgroundColor: COLORS.primarySoft,
    borderColor: '#C5D8FA',
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  linkChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ntesBtn: {
    minHeight: TOUCH_MIN - 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: RADII.md,
    backgroundColor: COLORS.background,
  },
  ntesBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backupTrain: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  backupTime: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  snackbar: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: '#1A1F2B',
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  snackbarText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  savePrimaryBtn: {
    flex: 2,
    minHeight: TOUCH_MIN,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  savePrimaryActive: {
    backgroundColor: '#1B7F3B',
  },
  savePrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  shareSecondaryBtn: {
    flex: 1,
    minHeight: TOUCH_MIN,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  shareSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
