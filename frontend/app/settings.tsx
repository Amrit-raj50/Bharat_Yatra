import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/state/useAppStore';

export default function SettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const {
    language,
    bufferProfile,
    datasetMeta,
    datasetStats,
    setLanguage,
    setBufferProfile,
  } = useAppStore();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.languageSection')}</Text>
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langButton, language === 'en' && styles.langButtonActive]}
            onPress={() => setLanguage('en')}
            accessibilityRole="button"
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
              {t('settings.english')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.langButton, language === 'hi' && styles.langButtonActive]}
            onPress={() => setLanguage('hi')}
            accessibilityRole="button"
          >
            <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>
              {t('settings.hindi')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.bufferProfileSection')}</Text>
        <Text style={styles.helperText}>{t('settings.bufferProfileHelper')}</Text>
        <View style={styles.profileColumn}>
          {(
            [
              { key: 'SOLO', label: t('settings.profileSolo') },
              { key: 'FAMILY', label: t('settings.profileFamily') },
              { key: 'EXTRA_SAFE', label: t('settings.profileExtraSafe') },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.langButton, bufferProfile === opt.key && styles.langButtonActive]}
              onPress={() => setBufferProfile(opt.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.langText, bufferProfile === opt.key && styles.langTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.dataSection')}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.dataVersion')}</Text>
          <Text style={styles.infoValue}>{datasetMeta.dataVersion}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.lastUpdated')}</Text>
          <Text style={styles.infoValue}>{datasetMeta.lastUpdated}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{datasetStats.stations}</Text>
            <Text style={styles.statLabel}>{t('settings.statStations')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{datasetStats.trains}</Text>
            <Text style={styles.statLabel}>{t('settings.statTrains')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{datasetStats.stops}</Text>
            <Text style={styles.statLabel}>{t('settings.statStops')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.aboutSection')}</Text>
        <Text style={styles.bodyText}>{t('settings.aboutBody')}</Text>
        <Text style={styles.disclaimer}>{t('common.scheduleDisclaimer')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profileColumn: {
    gap: 8,
  },
  langButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  langButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8',
  },
  langText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  langTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  infoRow: {
    paddingVertical: 8,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  statLabel: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  helperText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
  },
});
