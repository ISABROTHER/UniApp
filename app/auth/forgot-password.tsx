import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Phone, CircleCheck as CheckCircle } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';

const AUTH_GREEN = COLORS.authGreen;

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'recovery' | 'success'>('phone');

  const handlePhoneSubmit = async () => {
    setError('');
    if (!phone.trim()) {
      return setError('Please enter your phone number');
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('recovery');
    } catch (e) {
      setError('Failed to process. Please try again.');
    }
    setLoading(false);
  };

  const handleRecoverySubmit = async () => {
    setError('');
    if (!recoveryCode.trim()) {
      return setError('Please enter your recovery code');
    }
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('success');
    } catch (e) {
      setError('Failed to reset password. Please try again.');
    }
    setLoading(false);
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

          <Text style={styles.title}>Recovery Password</Text>
          <Text style={styles.subtitle}>
            Enter your phone number and recovery code to reset your password.
          </Text>

          {step === 'success' ? (
            <View style={styles.successBox}>
              <CheckCircle size={40} color={AUTH_GREEN} strokeWidth={1.5} />
              <Text style={styles.successTitle}>Password Reset</Text>
              <Text style={styles.successText}>
                Your password has been successfully reset. You can now log in with your new password.
              </Text>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => router.push('/auth/sign-in')}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'phone' ? (
            <>
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
                    returnKeyType="done"
                    editable={!loading}
                  />
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? 'Processing...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={recoveryCode}
                    onChangeText={(v) => { setRecoveryCode(v); setError(''); }}
                    placeholder="Recovery code"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setError(''); }}
                    placeholder="New password"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(p => !p)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleRecoverySubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep('phone'); setError(''); setRecoveryCode(''); setNewPassword(''); }}
                style={styles.backLink}
              >
                <Text style={styles.backLinkText}>Back to phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  eyeText: {
    fontSize: 16,
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

  successBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  successTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  successText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },

  backLink: {
    marginTop: SPACING.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  backLinkText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: AUTH_GREEN,
  },
});
