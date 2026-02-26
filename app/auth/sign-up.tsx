import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Lock, Eye, EyeOff, User, Phone } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

const AUTH_GREEN = COLORS.authGreen;

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { isAvailable: biometricAvailable, saveCredentials } = useBiometricAuth();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!firstName.trim()) return setError('Please enter your first name');
    if (!surname.trim()) return setError('Please enter your surname');
    if (!phone.trim()) return setError('Please enter your phone number');
    if (phone.trim().replace(/\D/g, '').length < 10) return setError('Please enter a valid phone number');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    const fullName = `${firstName.trim()} ${surname.trim()}`;
    setLoading(true);
    const { error: authError } = await signUp(password, fullName, phone.trim());
    setLoading(false);

    if (authError) {
      setError(
        authError.toLowerCase().includes('already')
          ? 'An account with this phone number already exists. Please sign in.'
          : authError
      );
      return;
    }

    if (biometricAvailable && Platform.OS !== 'web') {
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

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Create a new account to get started and enjoy seamless access to our features.
          </Text>

          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <User size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
                </View>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={(v) => { setFirstName(v); setError(''); }}
                  placeholder="First name"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <User size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
                </View>
                <TextInput
                  style={styles.input}
                  value={surname}
                  onChangeText={(v) => { setSurname(v); setError(''); }}
                  placeholder="Surname"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>
          </View>

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

  nameRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  flex1: {
    flex: 1,
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
});
