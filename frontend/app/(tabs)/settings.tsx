import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { InfoStrip } from '@/components/InfoStrip';
import { BUFFER_PROFILE_EXTRA_MINUTES, type BufferProfile } from '@/config/ratingThresholds';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, ELEVATION, RADII, SPACING, TOUCH_MIN } from '@/theme/theme';

export default function SettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    language,
    bufferProfile,
    datasetMeta,
    datasetStats,
    savedConnections,
    issueReportsCount,
    setLanguage,
    setBufferProfile,
    refreshRemoteMeta,
    clearRecentSearches,
    submitIssueReport,
  } = useAppStore();

  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle');
  const [showAccuracyModal, setShowAccuracyModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [trainNum, setTrainNum] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [comment, setComment] = useState('');
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [recentClearedMsg, setRecentClearedMsg] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const profiles: {
    key: BufferProfile;
    label: string;
    desc: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  }[] = [
    {
      key: 'SOLO',
      label: t('settings.profileSolo'),
      desc: t('settings.profileSoloDesc'),
      icon: 'walk',
    },
    {
      key: 'FAMILY',
      label: t('settings.profileFamily'),
      desc: t('settings.profileFamilyDesc'),
      icon: 'bag-suitcase',
    },
    {
      key: 'EXTRA_SAFE',
      label: t('settings.profileExtraSafe'),
      desc: t('settings.profileExtraSafeDesc'),
      icon: 'shield-check-outline',
    },
  ];

  const activeProfileObj = profiles.find((p) => p.key === bufferProfile) ?? profiles[0]!;
  const extraMin = BUFFER_PROFILE_EXTRA_MINUTES[bufferProfile];
  const exampleEffective = Math.max(0, 40 - extraMin);

  const handleCheckUpdates = async () => {
    setUpdateState('checking');
    const ok = await refreshRemoteMeta();
    setUpdateState(ok ? 'ok' : 'err');
  };

  const handleSubmitReport = () => {
    if (!trainNum.trim() && !stationCode.trim() && !comment.trim()) {
      return;
    }
    submitIssueReport({
      trainNumber: trainNum.trim(),
      stationCode: stationCode.trim().toUpperCase(),
      date: issueDate.trim(),
      comment: comment.trim(),
    });
    setTrainNum('');
    setStationCode('');
    setIssueDate('');
    setComment('');
    setReportMsg(t('settings.reportSaved', { count: issueReportsCount + 1 }));
  };

  return (
    <View style={styles.screen}>
      <AppHeader title={t('settings.title')} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, SPACING.lg) + SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandCard}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/icon.png')}
            style={styles.brandLogoImg}
          />
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>{t('appName')}</Text>
            <Text style={styles.brandTagline}>{t('settings.appTagline')}</Text>
            <Text style={styles.versionText}>{t('settings.version', { version: '0.1.0' })}</Text>
          </View>
        </View>

        <Text style={styles.groupHeader}>{t('settings.languageSection')}</Text>
        <View style={styles.card}>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.english')}
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
                {t('settings.english')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, language === 'hi' && styles.langBtnActive]}
              onPress={() => setLanguage('hi')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.hindi')}
            >
              <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>
                {t('settings.hindi')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.groupHeader}>{t('settings.bufferProfileSection')}</Text>
        <View style={styles.card}>
          <View style={styles.profileList}>
            {profiles.map((p) => {
              const active = bufferProfile === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setBufferProfile(p.key)}
                  style={[styles.profileCard, active && styles.profileCardActive]}
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                >
                  <MaterialCommunityIcons
                    name={p.icon}
                    size={22}
                    color={active ? COLORS.primary : COLORS.muted}
                  />
                  <View style={styles.profileBody}>
                    <Text style={[styles.profileTitle, active && styles.profileTitleActive]}>
                      {p.label}
                    </Text>
                    <Text style={styles.profileDesc}>{p.desc}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={active ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={active ? COLORS.primary : COLORS.muted}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.exampleStrip}>
            <Text style={styles.exampleText}>
              {t('settings.profileExample', {
                profile: activeProfileObj.label,
                effective: exampleEffective,
              })}
            </Text>
          </View>
        </View>

        <Text style={styles.groupHeader}>{t('settings.dataSection')}</Text>
        <View style={styles.card}>
          <Text style={styles.metaTitle}>
            {t('settings.timetableVersion', { version: datasetMeta.dataVersion })}
          </Text>
          <Text style={styles.metaSub}>
            {t('settings.lastUpdated', { date: datasetMeta.lastUpdated })}
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statNum}>{datasetStats.stations}</Text>
              <Text style={styles.statLabel}>{t('settings.statStations')}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statNum}>{datasetStats.trains}</Text>
              <Text style={styles.statLabel}>{t('settings.statTrains')}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statNum}>{datasetStats.stops}</Text>
              <Text style={styles.statLabel}>{t('settings.statStops')}</Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => void handleCheckUpdates()}
              disabled={updateState === 'checking'}
              accessibilityRole="button"
            >
              {updateState === 'checking' ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color={COLORS.white} />
              )}
              <Text style={styles.primaryBtnText}>
                {updateState === 'checking'
                  ? t('settings.checkingUpdates')
                  : t('settings.checkUpdates')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setShowAccuracyModal(true)}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>{t('settings.howAccurate')}</Text>
            </Pressable>
          </View>

          {updateState === 'ok' ? (
            <Text style={styles.okMsg}>
              {t('settings.updateSuccess', {
                stations: datasetStats.stations,
                trains: datasetStats.trains,
              })}
            </Text>
          ) : null}
          {updateState === 'err' ? (
            <Text style={styles.errMsg}>{t('settings.updateFailed')}</Text>
          ) : null}

          <Text style={styles.coverageNote}>{t('settings.coverageNote')}</Text>
        </View>

        <Text style={styles.groupHeader}>{t('settings.supportSection')}</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.listItem}
            onPress={() => {
              setShowReportForm((v) => !v);
              setReportMsg(null);
            }}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.listItemText}>{t('settings.reportIssue')}</Text>
            <MaterialCommunityIcons
              name={showReportForm ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.muted}
            />
          </Pressable>

          {showReportForm ? (
            <View style={styles.reportForm}>
              <TextInput
                style={styles.input}
                value={trainNum}
                onChangeText={setTrainNum}
                placeholder={t('settings.reportTrainPlaceholder')}
                placeholderTextColor={COLORS.muted}
              />
              <TextInput
                style={styles.input}
                value={stationCode}
                onChangeText={setStationCode}
                placeholder={t('settings.reportStationPlaceholder')}
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                value={issueDate}
                onChangeText={setIssueDate}
                placeholder={t('settings.reportDatePlaceholder')}
                placeholderTextColor={COLORS.muted}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comment}
                onChangeText={setComment}
                placeholder={t('settings.reportCommentPlaceholder')}
                placeholderTextColor={COLORS.muted}
                multiline
              />
              <Pressable
                style={styles.primaryBtn}
                onPress={handleSubmitReport}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>{t('settings.submitReport')}</Text>
              </Pressable>
              {reportMsg ? <Text style={styles.okMsg}>{reportMsg}</Text> : null}
            </View>
          ) : null}

          <View style={styles.divider} />

          <Pressable
            style={styles.listItem}
            onPress={() => void Linking.openURL('mailto:support@bharatyatra.app?subject=BharatYatra%20Feedback')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.primary} />
            <Text style={styles.listItemText}>{t('settings.sendFeedback')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.listItem}
            onPress={() => void Linking.openURL('https://github.com/Amrit-raj50/Bharat_Yatra')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="star-outline" size={20} color={COLORS.accent} />
            <Text style={styles.listItemText}>{t('settings.rateApp')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
          </Pressable>
        </View>

        <Text style={styles.groupHeader}>{t('settings.savedDataSection')}</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.listItem}
            onPress={() => router.push('/(tabs)/saved')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="bookmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.listItemText}>
              {t('settings.manageSaved', { count: savedConnections.length })}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.listItem}
            onPress={() => {
              clearRecentSearches();
              setRecentClearedMsg(true);
            }}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color="#C62828" />
            <Text style={[styles.listItemText, { color: '#C62828' }]}>
              {t('settings.clearRecent')}
            </Text>
          </Pressable>
          {recentClearedMsg ? (
            <Text style={styles.okMsg}>{t('settings.recentCleared')}</Text>
          ) : null}
        </View>

        <Text style={styles.groupHeader}>{t('settings.aboutSection')}</Text>
        <View style={styles.card}>
          <Text style={styles.aboutBody}>{t('settings.aboutBody')}</Text>
          <View style={styles.legalRow}>
            <Pressable
              onPress={() => setLegalModal('privacy')}
              style={styles.legalBtn}
              accessibilityRole="button"
            >
              <Text style={styles.legalText}>{t('settings.privacy')}</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable
              onPress={() => setLegalModal('terms')}
              style={styles.legalBtn}
              accessibilityRole="button"
            >
              <Text style={styles.legalText}>{t('settings.terms')}</Text>
            </Pressable>
          </View>
        </View>

        <InfoStrip text={t('common.scheduleDisclaimer')} />
      </ScrollView>

      <Modal
        visible={showAccuracyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccuracyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('settings.accuracyTitle')}</Text>
            <Text style={styles.sheetBody}>{t('settings.accuracyBody')}</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => setShowAccuracyModal(false)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={legalModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLegalModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {legalModal === 'privacy' ? t('settings.privacy') : t('settings.terms')}
            </Text>
            <Text style={styles.sheetBody}>{t('settings.aboutBody')}</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => setLegalModal(null)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t('common.close')}</Text>
            </Pressable>
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
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    ...ELEVATION.subtle,
  },
  brandLogoImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  brandTagline: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
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
  langRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  langBtn: {
    flex: 1,
    minHeight: TOUCH_MIN,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  langText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  langTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  profileList: {
    gap: SPACING.sm,
  },
  profileCard: {
    minHeight: TOUCH_MIN + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  profileCardActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  profileBody: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileTitleActive: {
    color: COLORS.primary,
  },
  profileDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  exampleStrip: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  exampleText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  metaSub: {
    fontSize: 12,
    color: COLORS.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  primaryBtn: {
    flex: 1,
    minHeight: TOUCH_MIN,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryBtn: {
    minHeight: TOUCH_MIN,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  okMsg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B7F3B',
  },
  errMsg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C62828',
  },
  coverageNote: {
    fontSize: 12,
    color: COLORS.muted,
  },
  listItem: {
    minHeight: TOUCH_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  reportForm: {
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  input: {
    minHeight: TOUCH_MIN,
    backgroundColor: COLORS.background,
    borderColor: COLORS.divider,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    paddingTop: SPACING.sm,
    textAlignVertical: 'top',
  },
  aboutBody: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  legalBtn: {
    minHeight: 36,
    justifyContent: 'center',
  },
  legalText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  legalSep: {
    color: COLORS.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 56, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetBody: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});
