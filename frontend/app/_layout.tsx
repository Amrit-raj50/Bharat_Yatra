import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from '@/i18n';
import { useAppStore } from '@/state/useAppStore';
import { COLORS } from '@/theme/theme';

// Ensure i18n is ready on first synchronous render before bootstrap completes
initI18n();

export default function RootLayout(): React.ReactElement {
  const bootstrap = useAppStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ headerShown: false }} />
        <Stack.Screen name="connection/[id]" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
