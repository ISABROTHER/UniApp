import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, CircleCheck as CheckCircle, Send, ShieldCheck } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

const AUTH_GREEN = COLORS.authGreen;

type Step = 'request' | 'sent' | 'reset' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; access_token?: string }>();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If deep linked with mode=reset, jump straight to the reset step
  useEffect(() => {
    if (params.mode === 'reset' && params.access_token) {
      setStep('reset');
    }
  }, [params.mode, params.access_token]);

  const handleRequestReset = async () => {
    setError('');
    if (!email.trim()) return setError('Please enter your email address.');
    if (!email.includes('@')) return setError('Please enter a valid email address.');

    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'uccharousing://auth/forgot-password',
    });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setStep('sent');
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setStep('success');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.card}>

          {/* STEP: REQUEST — enter email */}
          {step === 'request' && (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <ChevronLeft size={24} color={COLORS.textPrimary} strokeWidth={2} />
              </TouchableOpacity>

              <View style={styles.iconCircle}>
                <Mail size={28} color={AUTH_GREEN} strokeWidth={1.8} />
              </View>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter the email address linked to your account. We'll send you a secure reset link.
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
                    returnKeyType="done"
                    editable={!loading}
                    onSubmitEditing={handleRequestReset}
                  />
                </View>
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleRequestReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <><Send size={17} color={COLORS.white} /><Text style={styles.submitBtnText}>Send Reset Link</Text></>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                <Text style={styles.backLinkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP: SENT — check your email */}
          {step === 'sent' && (
            <View style={styles.centerBox}>
              <View style={[styles.iconCircle, { backgroundColor: `${AUTH_GREEN}15` }]}>
                <Send size={28} color={AUTH_GREEN} strokeWidth={1.8} />
              </View>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset link to:
              </Text>
              <View style={styles.emailChip}>
                <Mail size={14} color={AUTH_GREEN} />
                <Text style={styles.emailChipText}>{email}</Text>
              </View>
              <Text style={styles.instructionText}>
                Open the email and tap the reset link. It will bring you back to this app automatically.
              </Text>

              <View style={styles.stepsBox}>
                {[
                  '1. Open your email inbox',
                  '2. Find the email from UCC Housing',
                  '3. Tap "Reset Password"',
                  '4. You\'ll return here to set your new password',
                ].map((s) => (
                  <View key={s} style={styles.stepRow}>
                    <View style={styles.stepDot} />
                    <Text style={styles.stepText}>{s}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: SPACING.lg }]}
                onPress={() => { setStep('request'); setEmail(''); }}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Try a different email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/sign-in')}>
                <Text style={styles.backLinkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: RESET — set new password (arrived via deep link) */}
          {step === 'reset' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: `${COLORS.accent}15` }]}>
                <ShieldCheck size={28} color={COLORS.accent} strokeWidth={1.8} />
              </View>

              <Text style={styles.title}>Set New Password</Text>
              <Text style={styles.subtitle}>
                Choose a strong password for your account. You'll use this to sign in going forward.
              </Text>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrap}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
                  </View>
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setError(''); }}
                    placeholder="New password"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    editable={!loading}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                    {showPassword
                      ? <EyeOff size={18} color={COLORS.textTertiary} />
                      : <Eye size={18} color={COLORS.textTertiary} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrap}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color={COLORS.textTertiary} strokeWidth={1.8} />
                  </View>
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                    placeholder="Confirm new password"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    returnKeyType="done"
                    editable={!loading}
                    onSubmitEditing={handleUpdatePassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(p => !p)}>
                    {showConfirm
                      ? <EyeOff size={18} color={COLORS.textTertiary} />
                      : <Eye size={18} color={COLORS.textTertiary} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            newPassword.length >= i * 3
                              ? i <= 1 ? COLORS.error
                                : i <= 2 ? COLORS.warning
                                  : i <= 3 ? COLORS.accent
                                    : AUTH_GREEN
                              : COLORS.borderLight,
                        },
                      ]}
                    />
                  ))}
                  <Text style={styles.strengthLabel}>
                    {newPassword.length < 4 ? 'Weak' : newPassword.length < 7 ? 'Fair' : newPassword.length < 10 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              )}

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <><ShieldCheck size={17} color={COLORS.white} /><Text style={styles.submitBtnText}>Update Password</Text></>
                }
              </TouchableOpacity>
            </>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <View style={styles.centerBox}>
              <View style={[styles.iconCircle, { backgroundColor: `${AUTH_GREEN}15`, width: 80, height: 80, borderRadius: 40 }]}>
                <CheckCircle size={40} color={AUTH_GREEN} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Password Updated!</Text>
              <Text style={styles.subtitle}>
                Your password has been successfully changed. You can now sign in with your new password.
              </Text>
              <View style={styles.successBadge}>
                <ShieldCheck size={14} color={AUTH_GREEN} />
                <Text style={styles.successBadgeText}>Account secured</Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: SPACING.lg }]}
                onPress={() => router.replace('/auth/sign-in')}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F3F7' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.md },

  card: {
    backgroundColor: COLORS.white, borderRadius: 28, padding: SPACING.lg,
    paddingTop: SPACING.md, shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },

  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },

  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${AUTH_GREEN}12`,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: SPACING.md,
  },

  title: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  subtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: SPACING.lg, textAlign: 'center' },

  centerBox: { alignItems: 'center' },

  emailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${AUTH_GREEN}10`, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: `${AUTH_GREEN}30`,
  },
  emailChipText: { fontFamily: FONT.semiBold, fontSize: 14, color: AUTH_GREEN },

  instructionText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },

  stepsBox: { width: '100%', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AUTH_GREEN },
  stepText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  inputGroup: { marginBottom: SPACING.md },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#ECECEC', height: 54, paddingHorizontal: SPACING.md,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, height: '100%' },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 36 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, width: 44 },

  errorBox: { backgroundColor: COLORS.errorLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: AUTH_GREEN, borderRadius: RADIUS.full, height: 54,
    shadowColor: AUTH_GREEN, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    width: '100%',
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontFamily: FONT.semiBold, fontSize: 17, color: COLORS.white },

  successBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${AUTH_GREEN}12`, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: `${AUTH_GREEN}30`,
  },
  successBadgeText: { fontFamily: FONT.semiBold, fontSize: 13, color: AUTH_GREEN },

  backLink: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
  backLinkText: { fontFamily: FONT.medium, fontSize: 13, color: AUTH_GREEN },
});