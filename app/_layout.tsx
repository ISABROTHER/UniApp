import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url) return;
      const fragment = url.split('#')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(fragment));

      if (params.type === 'recovery' && params.access_token) {
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
        router.replace(`/auth/forgot-password?mode=reset&access_token=${params.access_token}` as any);
        return;
      }

      if (params.type === 'signup' && params.access_token) {
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
        router.replace('/(tabs)' as any);
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="detail" />
        <Stack.Screen name="book" />
        <Stack.Screen name="tenancy" />
        <Stack.Screen name="utilities" />
        <Stack.Screen name="roommates" />
        <Stack.Screen name="maintenance" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="owner" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="print" />
        <Stack.Screen name="print-new" />
        <Stack.Screen name="print-job" />
        <Stack.Screen name="print-chat" />
        <Stack.Screen name="qr-scan" options={{ animation: 'fade' }} />
        <Stack.Screen name="hall" />
        <Stack.Screen name="hall-designation" />
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
