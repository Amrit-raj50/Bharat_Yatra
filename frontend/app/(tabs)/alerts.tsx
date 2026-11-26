import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { InfoStrip } from '@/components/InfoStrip';
import { COLORS, SPACING } from '@/theme/theme';

export default function AlertsScreen(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <AppHeader title={t('alerts.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon="bell-ring-outline"
          title={t('alerts.comingSoonTitle')}
          body={t('alerts.comingSoonBody')}
          actions={[
            {
              label: t('alerts.openNtes'),
              primary: true,
              onPress: () => void Linking.openURL('https://enquiry.indianrail.gov.in/'),
            },
          ]}
        />
        <View style={styles.footer}>
          <InfoStrip text={t('common.honestyFooter')} />
        </View>
      </ScrollView>
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
    gap: SPACING.lg,
  },
  footer: {
    marginTop: SPACING.xs,
  },
});
