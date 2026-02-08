import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useInterviewStore } from '@/store';
import { hasCompletedOnboarding } from '@/app/onboarding';

export default function RootLayout() {
  const router = useRouter();
  const initialize = useAuthStore((s) => s.initialize);
  const setTier = useInterviewStore((s) => s.setTier);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function boot() {
      await initialize();
      const tier = useAuthStore.getState().tier;
      setTier(tier.name);

      const onboarded = await hasCompletedOnboarding();
      setReady(true);

      if (!onboarded) {
        // Small delay to let the navigator mount
        setTimeout(() => router.replace('/onboarding'), 0);
      }
    }
    boot();
  }, []);

  // Subscribe to auth tier changes and sync to interview store
  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (state.tier.name !== prev.tier.name) {
        setTier(state.tier.name);
      }
    });
    return unsub;
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="interview/setup"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="interview/session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="interview/report" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="auth/login"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="coaching/session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="coaching/program-complete" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
