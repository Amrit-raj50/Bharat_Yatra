import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { InfoStrip } from '@/components/InfoStrip';
import { TrainCard } from '@/components/TrainCard';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, SPACING } from '@/theme/theme';

export default function SavedScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const savedConnections = useAppStore((s) => s.savedConnections);
  const toggleSaveConnection = useAppStore((s) => s.toggleSaveConnection);

  return (
    <View style={styles.screen}>
      <AppHeader title={t('saved.title')} />
      <FlatList
        data={savedConnections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TrainCard
            item={item}
            isSaved
            onPress={(opt) =>
              router.push({
                pathname: '/connection/[id]',
                params: { id: opt.id },
              })
            }
            onToggleSave={(opt) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSaveConnection(opt);
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title={t('saved.emptyTitle')}
            body={t('saved.emptyBody')}
            actions={[
              {
                label: t('saved.goPlan'),
                primary: true,
                onPress: () => router.push('/(tabs)/index'),
              },
            ]}
          />
        }
        ListFooterComponent={
          savedConnections.length > 0 ? (
            <View style={styles.footer}>
              <InfoStrip text={t('common.scheduleDisclaimer')} />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  footer: {
    marginTop: SPACING.sm,
  },
});
