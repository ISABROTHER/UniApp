import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text, TextInput, Platform } from 'react-native';
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

// --- GLOBAL LAYOUT & TEXT WRAPPING FIX FOR ANDROID & IOS ---
// Intercepts every <Text> component globally to force layout constraints
// @ts-ignore: React Native global text override
const oldTextRender = Text.render;
if (oldTextRender) {
  // @ts-ignore
  Text.render = function render(props, ref) {
    return oldTextRender.call(this, {
      ...props,
      style: [
        { flexShrink: 1 }, // Forces adaptive text wrapping globally so layouts don't scatter
        Platform.OS === 'android' && { includeFontPadding: false, textAlignVertical: 'center' }, // Fixes Android text alignment and padding
        props.style,
      ],
      allowFontScaling: false, // Locks text scaling
    }, ref);
  };
} else {
  // Fallback for some RN versions
  // @ts-ignore
  if (Text.defaultProps == null) Text.defaultProps = {};
  // @ts-ignore
  Text.defaultProps.allowFontScaling = false;
}

// Intercepts every <TextInput> component globally
// @ts-ignore
const oldTextInputRender = TextInput.render;
if (oldTextInputRender) {
  // @ts-ignore
  TextInput.render = function render(props, ref) {
    return oldTextInputRender.call(this, {
      ...props,
      style: [
        Platform.OS === 'android' && { includeFontPadding: false, textAlignVertical: 'center' },
        props.style,
      ],
      allowFontScaling: false,
    }, ref);
  };
} else {
  // @ts-ignore
  if (TextInput.defaultProps == null) TextInput.defaultProps = {};
  // @ts-ignore
  TextInput.defaultProps.allowFontScaling = false;
}
// ---------------------------------------------------------

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
        <Stack.Screen name="compare" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="transactions" />
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
        <Stack.Screen name="wallet" />
        <Stack.Screen name="events" />
        <Stack.Screen name="safety" />
        <Stack.Screen name="food" />
        <Stack.Screen name="lost-found" />
        <Stack.Screen name="shuttle" />
        <Stack.Screen name="elections" />
        <Stack.Screen name="alumni" />
        <Stack.Screen name="bulletin" />
        <Stack.Screen name="study-rooms" />
        <Stack.Screen name="student-id" />
        <Stack.Screen name="ai-assistant" />
        <Stack.Screen name="sos-contacts" />
        <Stack.Screen name="reviews" />
        <Stack.Screen name="planner" />
        <Stack.Screen name="organizations" />
        <Stack.Screen name="organization-profile" />
        <Stack.Screen name="organization-admin" />
        <Stack.Screen name="organization-create" />
        <Stack.Screen name="my-orgs" />
        <Stack.Screen name="organization-dues" />
        <Stack.Screen name="organization-elections" />
        <Stack.Screen name="organization-roster" />
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}