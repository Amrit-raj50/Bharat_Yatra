import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/state/useAppStore';

export default function SettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { language, datasetMeta, setLanguage } = useAppStore();

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
        <Text style={styles.sectionTitle}>{t('settings.dataSection')}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.datasetKind')}</Text>
          <Text style={styles.infoValue}>
            {datasetMeta.datasetKind === 'SAMPLE'
              ? t('settings.datasetKindSample')
              : t('settings.datasetKindImported')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.dataVersion')}</Text>
          <Text style={styles.infoValue}>{datasetMeta.dataVersion}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.lastUpdated')}</Text>
          <Text style={styles.infoValue}>{datasetMeta.lastUpdated}</Text>
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
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 10,
  },
});
