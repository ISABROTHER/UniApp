import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Phone, Lock, Eye, EyeOff, Scan, Fingerprint } from 'lucide-react-native';
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
        const { error: authError } = await signIn(credentials.phone, credentials.password);
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
            Enter your phone number and password to securely access your account and manage your services.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Phone size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
              </View>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(v) => { setPhone(v); setError(''); }}
                placeholder="Phone number"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
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
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    paddingTop: SPACING.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm + 4,
  },

  title: {
    fontFamily: FONT.headingBold,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },

  inputGroup: {
    marginBottom: SPACING.sm + 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#ECECEC',
    height: 46,
    paddingHorizontal: SPACING.sm + 4,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    height: '100%',
  },
  passwordInput: {
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 2,
    marginTop: 2,
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
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },
  rememberText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  forgotText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },

  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },

  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm + 2,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.error,
  },

  submitBtn: {
    backgroundColor: AUTH_GREEN,
    borderRadius: RADIUS.full,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AUTH_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },

  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm + 2,
    paddingVertical: 10,
    backgroundColor: COLORS.authGreenLight,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: AUTH_GREEN,
  },
  biometricBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: AUTH_GREEN,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  switchText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: AUTH_GREEN,
  },

  guestBtn: {
    marginTop: SPACING.sm + 4,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  guestBtnText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});
