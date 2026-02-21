import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const AUTH_GREEN = COLORS.authGreen;

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    const { error: authError } = await signUp(email.trim().toLowerCase(), password, fullName.trim());
    setLoading(false);

    if (authError) {
      setError(
        authError.toLowerCase().includes('already')
          ? 'An account with this email already exists. Please sign in.'
          : authError
      );
      return;
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

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Create a new account to get started and enjoy seamless access to our features.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <User size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
              </View>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(v) => { setFullName(v); setError(''); }}
                placeholder="Name"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

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
                returnKeyType="next"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                {showPassword
                  ? <Eye size={18} color={COLORS.textTertiary} />
                  : <EyeOff size={18} color={COLORS.textTertiary} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Lock size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
              </View>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(p => !p)}>
                {showConfirm
                  ? <Eye size={18} color={COLORS.textTertiary} />
                  : <EyeOff size={18} color={COLORS.textTertiary} />}
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
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account?  </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-in')}>
              <Text style={styles.switchLink}>Sign In here</Text>
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
});
