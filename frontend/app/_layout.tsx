import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from '@/i18n';
import { useAppStore } from '@/state/useAppStore';
import { COLORS, SPACING } from '@/theme/theme';

// Ensure i18n is ready on first synchronous render before bootstrap completes
initI18n();

export default function RootLayout(): React.ReactElement {
  const bootstrap = useAppStore((s) => s.bootstrap);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    bootstrap();
    const timer = setTimeout(() => setShowSplash(false), 1100);
    return () => clearTimeout(timer);
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

      {showSplash ? (
        <View style={styles.splashOverlay} accessibilityLabel="Bharat Yatra">
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/splash-icon.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
          <Text style={styles.splashTitle}>Bharat Yatra</Text>
          <Text style={styles.splashSubtitle}>Indian Railways Connection Planner</Text>
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    zIndex: 999,
  },
  splashLogo: {
    width: 148,
    height: 148,
    borderRadius: 32,
    marginBottom: SPACING.lg,
  },
  splashTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#D6E4FF',
    marginTop: SPACING.xs,
  },
});
