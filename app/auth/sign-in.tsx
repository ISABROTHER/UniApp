import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, GraduationCap, Building2, Home } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'signup';
type Role = 'student' | 'owner';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetFields = () => {
    setFullName(''); setEmail(''); setPassword('');
    setError(''); setShowPassword(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetFields();
  };

  const handleSubmit = async () => {
    setError('');
    if (mode === 'signup') {
      if (!fullName.trim()) return setError('Please enter your full name');
      if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address');
      if (password.length < 6) return setError('Password must be at least 6 characters');

      setLoading(true);
      const { error: authError } = await signUp(email.trim().toLowerCase(), password, fullName.trim(), role);
      setLoading(false);
      if (authError) {
        setError(
          authError.toLowerCase().includes('already')
            ? 'An account with this email already exists. Please sign in.'
            : authError
        );
        return;
      }
    } else {
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
        {/* ILLUSTRATION AREA */}
        <View style={styles.illustrationArea}>
          <View style={styles.illustrationBg}>
            <View style={styles.illustrationIcon}>
              <Home size={48} color={COLORS.primary} strokeWidth={1.8} />
            </View>
            <View style={styles.decorDot1} />
            <View style={styles.decorDot2} />
            <View style={styles.decorDot3} />
            <View style={styles.decorLine1} />
            <View style={styles.decorLine2} />
          </View>
          <Text style={styles.brandName}>StudentNest</Text>
          <Text style={styles.brandSub}>Ghana's student housing platform</Text>
        </View>

        {/* CARD */}
        <View style={styles.card}>
          {/* TAB SWITCHER */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabPill, mode === 'signup' && styles.tabPillActive]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillText, mode === 'signup' && styles.tabPillTextActive]}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, mode === 'signin' && styles.tabPillActive]}
              onPress={() => switchMode('signin')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillText, mode === 'signin' && styles.tabPillTextActive]}>Log In</Text>
            </TouchableOpacity>
          </View>

          {/* SIGN UP FIELDS */}
          {mode === 'signup' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); setError(''); }}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Account Type</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleChip, role === 'student' && styles.roleChipActive]}
                    onPress={() => setRole('student')}
                    activeOpacity={0.8}
                  >
                    <GraduationCap size={16} color={role === 'student' ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.roleChipText, role === 'student' && styles.roleChipTextActive]}>Student</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleChip, role === 'owner' && styles.roleChipActive]}
                    onPress={() => setRole('owner')}
                    activeOpacity={0.8}
                  >
                    <Building2 size={16} color={role === 'owner' ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.roleChipText, role === 'owner' && styles.roleChipTextActive]}>Hostel Owner</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* EMAIL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder="Email Address"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* PASSWORD */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordWrap}>
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
                  ? <EyeOff size={18} color={COLORS.textTertiary} />
                  : <Eye size={18} color={COLORS.textTertiary} />}
              </TouchableOpacity>
            </View>
            {mode === 'signup' && (
              <Text style={styles.hintText}>At least 6 characters</Text>
            )}
          </View>

          {/* ERROR */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* SUBMIT */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {loading
                ? mode === 'signup' ? 'Creating account...' : 'Signing in...'
                : mode === 'signup' ? 'Registration' : 'Log In'}
            </Text>
          </TouchableOpacity>

          {/* FOOTER LINK */}
          <View style={styles.switchRow}>
            {mode === 'signin' ? (
              <>
                <Text style={styles.switchText}>Don't Have An Account | </Text>
                <TouchableOpacity onPress={() => switchMode('signup')}>
                  <Text style={styles.switchLink}>Sign Up</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.switchText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => switchMode('signin')}>
                  <Text style={styles.switchLink}>Log In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* BROWSE GUEST */}
        <TouchableOpacity style={styles.guestBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.7}>
          <Text style={styles.guestBtnText}>Continue browsing without account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flexGrow: 1, paddingBottom: SPACING.xl },

  illustrationArea: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 40 : 64,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  illustrationBg: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
    position: 'relative',
  },
  illustrationIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  decorDot1: {
    position: 'absolute', top: 14, right: 18,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.primary, opacity: 0.25,
  },
  decorDot2: {
    position: 'absolute', bottom: 16, left: 14,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: COLORS.primary, opacity: 0.2,
  },
  decorDot3: {
    position: 'absolute', top: 30, left: 10,
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: COLORS.primary, opacity: 0.15,
  },
  decorLine1: {
    position: 'absolute', bottom: 26, right: 12,
    width: 20, height: 3, borderRadius: 2,
    backgroundColor: COLORS.primary, opacity: 0.18,
  },
  decorLine2: {
    position: 'absolute', top: 46, right: 8,
    width: 12, height: 3, borderRadius: 2,
    backgroundColor: COLORS.primary, opacity: 0.12,
  },
  brandName: {
    fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: 4,
  },
  brandSub: {
    fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary,
  },

  card: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
  },

  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tabPill: {
    flex: 1, paddingVertical: 11, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  tabPillText: {
    fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textSecondary,
  },
  tabPillTextActive: {
    color: COLORS.white,
  },

  fieldGroup: { marginBottom: SPACING.md },
  fieldLabel: {
    fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#ECECEC',
    paddingHorizontal: SPACING.md,
    height: 52,
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute', right: 14, top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', width: 36,
  },
  hintText: {
    fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginTop: 5,
  },

  roleRow: { flexDirection: 'row', gap: SPACING.sm },
  roleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#ECECEC', backgroundColor: '#F8F8F8',
  },
  roleChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  roleChipText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  roleChipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  errorBox: {
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: {
    fontFamily: FONT.semiBold, fontSize: 17, color: COLORS.white,
  },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.md, flexWrap: 'wrap',
  },
  switchText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  switchLink: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },

  guestBtn: {
    marginTop: SPACING.lg, alignItems: 'center', paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  guestBtnText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textTertiary },
});
