import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Phone, Lock, Eye, EyeOff, Fingerprint, Scan, LogIn } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

const AUTH_GREEN = COLORS.authGreen;

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const {
    isAvailable: biometricAvailable,
    biometricType,
    hasStoredCredentials,
    isLoading: biometricLoading,
    authenticate,
    saveCredentials,
    getStoredCredentials,
    getBiometricLabel,
  } = useBiometricAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricPulse] = useState(new Animated.Value(1));
  const [activeField, setActiveField] = useState<'phone' | 'password' | null>(null);

  const canUseBiometric = biometricAvailable && hasStoredCredentials;

  useEffect(() => {
    if (canUseBiometric && !biometricLoading) {
      startBiometricPulse();
    }
  }, [canUseBiometric, biometricLoading]);

  const startBiometricPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(biometricPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(biometricPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleBiometricLogin = async () => {
    if (!canUseBiometric && !biometricAvailable) return;
    const success = await authenticate();
    if (success) {
      const credentials = await getStoredCredentials();
      if (credentials) {
        setLoading(true);
        const { error: authError } = await signIn(credentials.email, credentials.password);
        setLoading(false);
        if (authError) {
          setError('Biometric login failed. Please sign in with your password.');
          return;
        }
        router.replace('/(tabs)');
      }
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!phone.trim()) return setError('Please enter your phone number');
    if (!password) return setError('Please enter your password');

    setLoading(true);
    const { error: authError } = await signIn(phone.trim(), password);
    setLoading(false);

    if (authError) {
      setError(
        authError.toLowerCase().includes('invalid') || authError.toLowerCase().includes('credentials')
          ? 'Incorrect phone number or password. Please try again.'
          : authError
      );
      return;
    }

    if ((enableBiometric || rememberMe) && biometricAvailable) {
      await saveCredentials(phone.trim(), password);
    }

    router.replace('/(tabs)');
  };

  const showBiometricSection = biometricAvailable && Platform.OS !== 'web';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={22} color={COLORS.textPrimary} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account to continue</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.loginBar}>

            {/* Section 1 — Phone icon label */}
            <View style={[styles.section, styles.sectionIconLabel]}>
              <Phone size={16} color={COLORS.textTertiary} strokeWidth={1.8} />
            </View>

            {/* Section 2 — Fingerprint (the "1.5" biometric slot) */}
            <View style={[styles.section, styles.sectionBiometric]}>
              <TouchableOpacity
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
                style={styles.biometricSlot}
                disabled={loading}
              >
                <Animated.View style={[
                  styles.biometricCircle,
                  showBiometricSection && canUseBiometric && { transform: [{ scale: biometricPulse }] },
                  !showBiometricSection && styles.biometricCircleDisabled,
                ]}>
                  {biometricType === 'face' ? (
                    <Scan size={20} color={showBiometricSection ? AUTH_GREEN : COLORS.textTertiary} strokeWidth={2} />
                  ) : (
                    <Fingerprint size={20} color={showBiometricSection ? AUTH_GREEN : COLORS.textTertiary} strokeWidth={2} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.barDivider} />

            {/* Section 3 — Phone input */}
            <View style={[styles.section, styles.sectionInput]}>
              <TextInput
                style={styles.barInput}
                value={phone}
                onChangeText={(v) => { setPhone(v); setError(''); }}
                placeholder="Phone number"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setActiveField('phone')}
                onBlur={() => setActiveField(null)}
              />
            </View>

            {/* Section 4 — Password icon label */}
            <View style={[styles.section, styles.sectionIconLabel]}>
              <Lock size={16} color={COLORS.textTertiary} strokeWidth={1.8} />
            </View>

            {/* Section 5 — Password input */}
            <View style={[styles.section, styles.sectionInput]}>
              <TextInput
                style={styles.barInput}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                placeholder="Password"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                onFocus={() => setActiveField('password')}
                onBlur={() => setActiveField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                {showPassword
                  ? <Eye size={15} color={COLORS.textTertiary} />
                  : <EyeOff size={15} color={COLORS.textTertiary} />}
              </TouchableOpacity>
            </View>

            {/* Section 6 — Login button */}
            <TouchableOpacity
              style={[styles.section, styles.sectionLogin, loading && styles.sectionLoginDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LogIn size={18} color={COLORS.white} strokeWidth={2.2} />
            </TouchableOpacity>

          </View>

          {/* Biometric label below bar */}
          {showBiometricSection && (
            <View style={styles.biometricHint}>
              <Text style={styles.biometricHintText}>
                {canUseBiometric
                  ? `Tap fingerprint to sign in with ${getBiometricLabel()}`
                  : `Enable ${getBiometricLabel()} after your first login`}
              </Text>
            </View>
          )}

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {biometricAvailable && !hasStoredCredentials && Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.biometricToggle}
              onPress={() => setEnableBiometric(!enableBiometric)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, enableBiometric && styles.checkboxActive]}>
                {enableBiometric && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.rememberText}>
                Enable {getBiometricLabel()} for faster login
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account?  </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.switchLink}>Sign Up here</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.guestBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.7}>
          <Text style={styles.guestBtnText}>Continue browsing without account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F2F5' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  title: {
    fontFamily: FONT.headingBold,
    fontSize: 26,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.error,
  },

  loginBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: '#E4E6EA',
    height: 58,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  section: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionIconLabel: {
    width: 36,
    paddingHorizontal: 2,
  },

  sectionBiometric: {
    width: 52,
  },

  sectionInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  sectionLogin: {
    width: 52,
    height: 58,
    backgroundColor: AUTH_GREEN,
    borderTopRightRadius: RADIUS.full,
    borderBottomRightRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLoginDisabled: {
    opacity: 0.65,
  },

  barDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#DDE0E5',
    marginHorizontal: 2,
  },

  barInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },

  eyeBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  biometricSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46, 175, 125, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 175, 125, 0.3)',
  },
  biometricCircleDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },

  biometricHint: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  biometricHintText: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: AUTH_GREEN,
    backgroundColor: AUTH_GREEN,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },
  rememberText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  forgotText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: 2,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  switchText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: AUTH_GREEN,
  },

  guestBtn: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  guestBtnText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
});
