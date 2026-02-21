import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Mail, CircleCheck as CheckCircle } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const AUTH_GREEN = COLORS.authGreen;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !email.includes('@')) {
      return setError('Please enter a valid email address');
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email.trim().toLowerCase());
    setLoading(false);

    if (resetError) {
      setError(resetError);
      return;
    }

    setSent(true);
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

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address to receive a reset link and regain access to your account.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <CheckCircle size={40} color={AUTH_GREEN} strokeWidth={1.5} />
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to {email}. Please check your inbox.
              </Text>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => router.push('/auth/sign-in')}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
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
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? 'Sending...' : 'Continue'}
                </Text>
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
});
