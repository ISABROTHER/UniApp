import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, Scan, Fingerprint } from 'lucide-react-native';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);

  const canUseBiometric = biometricAvailable && hasStoredCredentials;

  useEffect(() => {
    if (canUseBiometric && !biometricLoading) {
      handleBiometricLogin();
    }
  }, [canUseBiometric, biometricLoading]);

  const handleBiometricLogin = async () => {
    if (!canUseBiometric) return;
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
    if (!email.trim()) return setError('Please enter your email address');
    if (!password) return setError('Please enter your password');

    setLoading(true);
    const { error: authError } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (authError) {
      setError(
        authError.toLowerCase().includes('invalid') || authError.toLowerCase().includes('credentials')
          ? 'Incorrect email or password. Please try again.'
          : authError
      );
      return;
    }

    if ((enableBiometric || rememberMe) && biometricAvailable) {
      await saveCredentials(email.trim().toLowerCase(), password);
    }

    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={COLORS.textPrimary} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>
            Enter your email and password to securely access your account and manage your services.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Mail size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
              </View>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder="Email address"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Lock size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
              </View>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                placeholder="Password"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                {showPassword
                  ? <Eye size={18} color={COLORS.textTertiary} />
                  : <EyeOff size={18} color={COLORS.textTertiary} />}
              </TouchableOpacity>
            </View>
          </View>

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
              <Text style={styles.forgotText}>Forgot Password</Text>
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

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Signing in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          {canUseBiometric && Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometricLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              {biometricType === 'face' ? (
                <Scan size={22} color={AUTH_GREEN} strokeWidth={2} />
              ) : (
                <Fingerprint size={22} color={AUTH_GREEN} strokeWidth={2} />
              )}
              <Text style={styles.biometricBtnText}>
                Sign in with {getBiometricLabel()}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account?  </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.switchLink}>Sign Up here</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or Continue With Account</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
              <Text style={styles.socialIcon}>f</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
              <Text style={[styles.socialIcon, styles.googleIcon]}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
              <Text style={styles.socialIcon}>{'\uF8FF'}</Text>
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
  root: { flex: 1, backgroundColor: '#F2F2F2' },
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
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  title: {
    fontFamily: FONT.headingBold,
    fontSize: 28,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: SPACING.lg + 4,
  },

  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ECECEC',
    height: 54,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm + 4,
  },
  input: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    height: '100%',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
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
    width: 10,
    height: 10,
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
    marginBottom: SPACING.md,
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

  submitBtn: {
    backgroundColor: AUTH_GREEN,
    borderRadius: RADIUS.full,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AUTH_GREEN,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    color: COLORS.white,
  },

  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: 14,
    backgroundColor: COLORS.authGreenLight,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: AUTH_GREEN,
  },
  biometricBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: AUTH_GREEN,
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

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  dividerText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textTertiary,
    marginHorizontal: SPACING.sm + 4,
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  socialIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  googleIcon: {
    color: '#4285F4',
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
