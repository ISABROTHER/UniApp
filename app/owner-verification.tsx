import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { OwnerVerification } from '@/lib/types';
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  IdCard,
} from 'lucide-react-native';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: COLORS.warning,
    bg: COLORS.warningLight,
    title: 'Under Review',
    desc: 'Your Ghana Card details are being reviewed by our team. This usually takes 1-2 business days.',
  },
  approved: {
    icon: CheckCircle,
    color: COLORS.success,
    bg: COLORS.successLight,
    title: 'Verified',
    desc: 'Your identity has been verified. Your hostels now show the Ghana Card Verified badge.',
  },
  rejected: {
    icon: XCircle,
    color: COLORS.error,
    bg: COLORS.errorLight,
    title: 'Rejected',
    desc: 'Your verification was rejected. Please resubmit with clearer images.',
  },
  requires_resubmission: {
    icon: AlertTriangle,
    color: COLORS.warning,
    bg: COLORS.warningLight,
    title: 'Resubmission Required',
    desc: 'Please update your submission as requested by our review team.',
  },
};

export default function OwnerVerificationScreen() {
  const router = useRouter();
  const [existing, setExisting] = useState<OwnerVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [frontNote, setFrontNote] = useState('');
  const [backNote, setBackNote] = useState('');

  useEffect(() => {
    fetchExisting();
  }, []);

  const fetchExisting = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('owner_verifications')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExisting(data as OwnerVerification | null);
    if (data?.ghana_card_number) setGhanaCardNumber(data.ghana_card_number);
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!ghanaCardNumber.trim()) return setError('Enter your Ghana Card number');
    if (ghanaCardNumber.trim().length < 8) return setError('Enter a valid Ghana Card number (e.g. GHA-XXXXXXXXX-X)');

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in'); setSubmitting(false); return; }

    const payload = {
      owner_id: user.id,
      ghana_card_number: ghanaCardNumber.trim().toUpperCase(),
      status: 'pending' as const,
      front_image_url: null,
      back_image_url: null,
    };

    let dbError;
    if (existing && ['pending', 'requires_resubmission'].includes(existing.status)) {
      const { error: e } = await supabase
        .from('owner_verifications')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      dbError = e;
    } else {
      const { error: e } = await supabase.from('owner_verifications').insert(payload);
      dbError = e;
    }

    if (dbError) { setError(dbError.message); setSubmitting(false); return; }

    await supabase.from('members').update({ ghana_card_number: ghanaCardNumber.trim().toUpperCase() }).eq('id', user.id);
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'verification_submitted',
      title: 'Verification Submitted',
      message: 'Your Ghana Card details are under review. We will notify you within 1-2 business days.',
    });

    setSubmitting(false);
    setSuccess(true);
    fetchExisting();
  };

  const canSubmit = !existing || ['requires_resubmission', 'rejected'].includes(existing.status);

  if (loading) {
    return <View style={styles.container}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  const statusCfg = existing ? STATUS_CONFIG[existing.status] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={32} color={COLORS.success} />
          </View>
          <Text style={styles.heroTitle}>Ghana Card Verification</Text>
          <Text style={styles.heroSubtitle}>
            Verifying your identity builds trust with students and unlocks Protected Booking for your hostels.
          </Text>
        </View>

        {statusCfg && existing && (
          <View style={[styles.statusCard, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color + '40' }]}>
            <View style={styles.statusRow}>
              <statusCfg.icon size={20} color={statusCfg.color} />
              <Text style={[styles.statusTitle, { color: statusCfg.color }]}>{statusCfg.title}</Text>
            </View>
            <Text style={styles.statusDesc}>{statusCfg.desc}</Text>
            {existing.reviewer_notes && (
              <View style={styles.reviewerNotes}>
                <Text style={styles.reviewerNotesLabel}>Reviewer Notes:</Text>
                <Text style={styles.reviewerNotesText}>{existing.reviewer_notes}</Text>
              </View>
            )}
          </View>
        )}

        {success && (
          <View style={styles.successBanner}>
            <CheckCircle size={18} color={COLORS.success} />
            <Text style={styles.successText}>Submitted successfully! We will review your details within 1-2 business days.</Text>
          </View>
        )}

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Benefits of Verification</Text>
          {[
            { icon: ShieldCheck, label: 'Protected Booking badge on all your hostels' },
            { icon: CheckCircle, label: 'Higher placement in search results' },
            { icon: IdCard, label: 'Increased student trust and conversion' },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <b.icon size={16} color={COLORS.success} />
              </View>
              <Text style={styles.benefitText}>{b.label}</Text>
            </View>
          ))}
        </View>

        {(canSubmit || existing?.status === 'rejected') && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>
              {existing?.status === 'requires_resubmission' ? 'Update Your Submission' : 'Submit for Verification'}
            </Text>

            <Text style={styles.fieldLabel}>Ghana Card Number</Text>
            <View style={styles.inputWrap}>
              <IdCard size={16} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                value={ghanaCardNumber}
                onChangeText={(v) => setGhanaCardNumber(v.toUpperCase())}
                placeholder="GHA-XXXXXXXXX-X"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="characters"
              />
            </View>
            <Text style={styles.fieldHint}>Found on the front of your Ghana Card (National ID)</Text>

            <View style={styles.uploadNote}>
              <Upload size={14} color={COLORS.info} />
              <Text style={styles.uploadNoteText}>
                Physical document verification is done in person at our office. Our team will contact you after you submit your card number.
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <ShieldCheck size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {existing?.status === 'approved' && (
          <View style={styles.approvedCard}>
            <CheckCircle size={48} color={COLORS.success} />
            <Text style={styles.approvedTitle}>Your Identity is Verified</Text>
            <Text style={styles.approvedSubtitle}>
              Your hostels now display the Ghana Card Verified badge, building trust with potential tenants.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  loadingText: { textAlign: 'center', marginTop: 100, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },
  content: { padding: SPACING.md, gap: SPACING.md },

  heroBanner: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary, textAlign: 'center' },
  heroSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  statusCard: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusTitle: { fontFamily: FONT.semiBold, fontSize: 16 },
  statusDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  reviewerNotes: { marginTop: SPACING.xs },
  reviewerNotesLabel: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  reviewerNotesText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: { flex: 1, fontFamily: FONT.medium, fontSize: 13, color: COLORS.success, lineHeight: 19 },

  benefitsSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  benefitIcon: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, flex: 1 },

  form: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  fieldLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginTop: SPACING.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  input: { flex: 1, fontFamily: FONT.medium, fontSize: 14, color: COLORS.textPrimary, letterSpacing: 0.5 },
  fieldHint: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginTop: -4 },

  uploadNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: SPACING.xs,
  },
  uploadNoteText: { flex: 1, fontFamily: FONT.regular, fontSize: 12, color: COLORS.info, lineHeight: 18 },

  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  approvedCard: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  approvedTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary, textAlign: 'center' },
  approvedSubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
