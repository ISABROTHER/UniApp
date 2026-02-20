import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Home } from 'lucide-react-native';
import { COLORS, FONT } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading, session]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Home size={40} color={COLORS.white} strokeWidth={2.5} />
        </View>

        <Text style={styles.appName}>UCC Housing</Text>
        <Text style={styles.tagline}>Your home away from home</Text>
      </View>

      <View style={styles.loader}>
        <ActivityIndicator size="small" color={COLORS.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  appName: {
    fontFamily: FONT.headingBold,
    fontSize: 32,
    color: COLORS.white,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: FONT.regular,
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.8,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
