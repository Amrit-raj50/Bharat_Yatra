import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { initI18n } from '@/i18n';
import { useAppStore } from '@/state/useAppStore';

// Ensure i18n is ready on first synchronous render before bootstrap completes
initI18n();

export default function RootLayout(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const bootstrap = useAppStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0F172A',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t('appName'),
            headerRight: () => (
              <Pressable
                onPress={() => router.push('/settings')}
                style={styles.headerButton}
                accessibilityRole="button"
              >
                <Text style={styles.headerButtonText}>{t('common.settings')}</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="results"
          options={{
            title: t('results.title'),
          }}
        />
        <Stack.Screen
          name="connection/[id]"
          options={{
            title: t('detail.title'),
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: t('settings.title'),
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D4ED8',
  },
});
