import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
import { useRouter } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url) return;

      // Supabase sends password reset as:
      // uccharousing://auth/forgot-password#access_token=...&type=recovery
      // or on web: https://your-site/#access_token=...&type=recovery
      const parsed = Linking.parse(url);
      const fragment = url.split('#')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(fragment));

      if (params.type === 'recovery' && params.access_token) {
        // Set the session with the recovery token so Supabase knows who is updating
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
        // Route to the forgot-password screen in reset mode
        router.replace(`/auth/forgot-password?mode=reset&access_token=${params.access_token}` as any);
        return;
      }

      // Handle email confirmation links
      if (params.type === 'signup' && params.access_token) {
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
        router.replace('/(tabs)');
      }
    };

    // Handle cold-start deep link (app opened from a link)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Handle warm-start deep link (app already open, link tapped)
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return null;
}

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
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <DeepLinkHandler />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}