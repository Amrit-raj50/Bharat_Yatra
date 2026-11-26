import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/state/useAppStore';

export default function SettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const {
    language,
    bufferProfile,
    apiBaseUrl,
    dataSource,
    datasetMeta,
    datasetStats,
    syncStatus,
    syncMessage,
    setLanguage,
    setBufferProfile,
    setApiBaseUrl,
    importFromUrl,
    importFromJsonText,
    resetToDefaultDataset,
    clearSyncStatus,
  } = useAppStore();

  const [apiInput, setApiInput] = useState(apiBaseUrl);
  const [urlInput, setUrlInput] = useState(`${apiBaseUrl}/api/timetable`);
  const [jsonInput, setJsonInput] = useState('');

  const handleSyncUrl = async () => {
    await importFromUrl(urlInput);
  };

  const handleImportJson = () => {
    if (!jsonInput.trim()) {
      return;
    }
    const ok = importFromJsonText(jsonInput);
    if (ok) {
      setJsonInput('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        <Text style={styles.sectionTitle}>{t('settings.apiSection')}</Text>
        <Text style={styles.helperText}>
          {dataSource === 'ONLINE_API'
            ? t('settings.apiStatusOnline')
            : t('settings.apiStatusOffline')}
        </Text>
        <TextInput
          style={styles.input}
          value={apiInput}
          onChangeText={setApiInput}
          placeholder="http://192.168.31.199:4000"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable
          style={styles.primaryButton}
          onPress={() => setApiBaseUrl(apiInput)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{t('settings.saveApiButton')}</Text>
        </Pressable>
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
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{datasetStats.clusters}</Text>
            <Text style={styles.statLabel}>{t('settings.statClusters')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{datasetStats.transfers}</Text>
            <Text style={styles.statLabel}>{t('settings.statTransfers')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.syncSection')}</Text>
        <Text style={styles.helperText}>{t('settings.syncHelper')}</Text>

        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={(val) => {
            setUrlInput(val);
            if (syncStatus !== 'idle') clearSyncStatus();
          }}
          placeholder={t('settings.urlPlaceholder')}
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable
          style={[styles.primaryButton, syncStatus === 'loading' && styles.buttonDisabled]}
          onPress={() => void handleSyncUrl()}
          disabled={syncStatus === 'loading'}
          accessibilityRole="button"
        >
          {syncStatus === 'loading' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('settings.syncUrlButton')}</Text>
          )}
        </Pressable>

        <Text style={[styles.helperText, styles.jsonLabel]}>{t('settings.pasteJsonLabel')}</Text>
        <TextInput
          style={[styles.input, styles.jsonInput]}
          value={jsonInput}
          onChangeText={(val) => {
            setJsonInput(val);
            if (syncStatus !== 'idle') clearSyncStatus();
          }}
          placeholder={t('settings.jsonPlaceholder')}
          placeholderTextColor="#64748B"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.secondaryButton, !jsonInput.trim() && styles.buttonDisabled]}
            onPress={handleImportJson}
            disabled={!jsonInput.trim() || syncStatus === 'loading'}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>{t('settings.importJsonButton')}</Text>
          </Pressable>
          <Pressable
            style={styles.resetButton}
            onPress={resetToDefaultDataset}
            disabled={syncStatus === 'loading'}
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>{t('settings.resetDatasetButton')}</Text>
          </Pressable>
        </View>

        {syncStatus === 'success' && syncMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              {t('settings.syncSuccess', { summary: syncMessage })}
            </Text>
          </View>
        ) : null}

        {syncStatus === 'error' && syncMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{syncMessage}</Text>
          </View>
        ) : null}
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
  jsonLabel: {
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  jsonInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  resetButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
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
