import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/state/useAppStore';

export function SampleBanner(): React.ReactElement | null {
  const { t } = useTranslation();
  const datasetKind = useAppStore((s) => s.datasetMeta.datasetKind);

  if (datasetKind !== 'SAMPLE') {
    return null;
  }

  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{t('common.sampleBannerTitle')}</Text>
      <Text style={styles.body}>{t('common.sampleBannerBody')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: '#78350F',
  },
});
