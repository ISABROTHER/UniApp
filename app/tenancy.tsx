import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated,
  PanResponder, Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, AGREEMENT_STATUS_COLORS } from '@/lib/constants';
import { TenancyAgreement, RentInvoice, RentPayment } from '@/lib/types';
import {
  ArrowLeft, FileText, CheckCircle, Clock, AlertCircle, CreditCard,
  ChevronRight, Shield, Receipt, X, Smartphone,
  BadgeCheck, ArrowRight, Pen, RotateCcw, Eye, Lock,
} from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');
const PAD_W = SW - SPACING.lg * 2 - SPACING.md * 2;
const PAD_H = 160;

type TabType = 'overview' | 'agreements' | 'invoices' | 'receipts';
type SignStep = 'terms' | 'draw' | 'otp' | 'success';

function AnimatedTabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(active ? 1 : 0)).current;
  const prevActive = useRef(active);

  if (prevActive.current !== active) {
    prevActive.current = active;
    if (active) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]),
        Animated.timing(bg, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(bg, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }

  const backgroundColor = bg.interpolate({ inputRange: [0, 1], outputRange: ['transparent', COLORS.navy] });
  const borderColor = bg.interpolate({ inputRange: [0, 1], outputRange: [COLORS.border, COLORS.navy] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[styles.tabBtn, { backgroundColor, borderColor, transform: [{ scale }] }]}>
        <Text style={[styles.tabLabel, { color: active ? COLORS.white : COLORS.textSecondary, fontFamily: active ? FONT.bold : FONT.semiBold }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

interface Point { x: number; y: number; }
interface Stroke { points: Point[]; }

function SignaturePad({ strokes, onStrokesChange }: { strokes: Stroke[]; onStrokesChange: (s: Stroke[]) => void }) {
  const currentStroke = useRef<Point[]>([]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      currentStroke.current = [{ x: locationX, y: locationY }];
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      currentStroke.current = [...currentStroke.current, { x: locationX, y: locationY }];
      onStrokesChange([
        ...strokes,
        { points: currentStroke.current },
      ]);
    },
    onPanResponderRelease: () => {
      if (currentStroke.current.length > 0) {
        onStrokesChange([...strokes, { points: [...currentStroke.current] }]);
        currentStroke.current = [];
      }
    },
  })).current;

  const renderStrokes = () => {
    return strokes.map((stroke, si) => {
      if (stroke.points.length < 2) return null;
      const segments = stroke.points.slice(1).map((pt, i) => {
        const prev = stroke.points[i];
        return (
          <View
            key={`${si}-${i}`}
            style={{
              position: 'absolute',
              left: Math.min(prev.x, pt.x) - 1,
              top: Math.min(prev.y, pt.y) - 1,
              width: Math.abs(pt.x - prev.x) + 2,
              height: Math.abs(pt.y - prev.y) + 2,
              backgroundColor: 'transparent',
            }}
          >
            <View style={{
              position: 'absolute',
              left: prev.x < pt.x ? 1 : Math.abs(pt.x - prev.x) - 1,
              top: prev.y < pt.y ? 1 : Math.abs(pt.y - prev.y) - 1,
              width: 2.5,
              height: 2.5,
              borderRadius: 1.25,
              backgroundColor: COLORS.navy,
            }} />
          </View>
        );
      });
      return segments;
    });
  };

  return (
    <View style={styles.padOuter} {...panResponder.panHandlers}>
      <View style={styles.padCanvas} pointerEvents="box-none">
        {renderStrokes()}
      </View>
      {strokes.length === 0 && (
        <View style={styles.padPlaceholder} pointerEvents="none">
          <Pen size={18} color={COLORS.textTertiary} />
          <Text style={styles.padPlaceholderText}>Sign with your finger here</Text>
        </View>
      )}
    </View>
  );
}

interface RentInvoiceWithAgreement extends RentInvoice {
  tenancy_agreements?: { property_address: string; monthly_rent: number };
}
interface RentPaymentWithInvoice extends RentPayment {
  rent_invoices?: { month_for: string; amount: number; tenancy_agreements?: { property_address: string } };
}

export default function TenancyScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('overview');
  const [agreements, setAgreements] = useState<TenancyAgreement[]>([]);
  const [invoices, setInvoices] = useState<RentInvoiceWithAgreement[]>([]);
  const [receipts, setReceipts] = useState<RentPaymentWithInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [signModal, setSignModal] = useState<{ visible: boolean; agreement: TenancyAgreement | null; step: SignStep; otp: string }>({
    visible: false, agreement: null, step: 'terms', otp: '',
  });
  const [signStrokes, setSignStrokes] = useState<Stroke[]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  const [payModal, setPayModal] = useState<{ visible: boolean; invoice: RentInvoiceWithAgreement | null }>({ visible: false, invoice: null });
  const [payStep, setPayStep] = useState<'select' | 'processing' | 'success'>('select');
  const [payMethod, setPayMethod] = useState<'card' | 'momo' | null>(null);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: agrs }, { data: invs }, { data: pays }] = await Promise.all([
      supabase.from('tenancy_agreements').select('*, hostels(name, address, campus_proximity)').or(`tenant_id.eq.${user.id},landlord_id.eq.${user.id}`).order('created_at', { ascending: false }),
      supabase.from('rent_invoices').select('*, tenancy_agreements(property_address, monthly_rent)').eq('tenant_id', user.id).order('due_date', { ascending: false }),
      supabase.from('rent_payments').select('*, rent_invoices(month_for, amount, tenancy_agreements(property_address))').eq('tenant_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }),
    ]);

    setAgreements((agrs as TenancyAgreement[]) || []);
    setInvoices((invs as RentInvoiceWithAgreement[]) || []);
    setReceipts((pays as RentPaymentWithInvoice[]) || []);
    setLoading(false);
  };

  const openSign = (agreement: TenancyAgreement) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setSignModal({ visible: true, agreement, step: 'terms', otp });
    setSignStrokes([]);
    setOtpInput('');
    setOtpError('');
  };

  const closeSign = () => setSignModal(p => ({ ...p, visible: false }));

  const handleVerifyOtp = async () => {
    if (otpInput.trim() !== signModal.otp) {
      setOtpError('Incorrect OTP. Please check the code above and try again.');
      return;
    }
    setOtpError('');
    setOtpLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !signModal.agreement) { setOtpLoading(false); return; }

    const userAgent = Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS}-app`;
    await Promise.all([
      supabase.from('agreement_signatures').insert({
        agreement_id: signModal.agreement.id,
        signer_id: user.id,
        signer_role: 'tenant',
        otp_code: signModal.otp,
        signed_at: new Date().toISOString(),
        user_agent: userAgent,
      }),
      supabase.from('tenancy_agreements').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', signModal.agreement.id),
      supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'agreement_signed',
        entity_type: 'tenancy_agreement',
        entity_id: signModal.agreement.id,
        metadata: { method: 'otp_plus_signature', platform: Platform.OS, strokes: signStrokes.length },
      }),
    ]);

    setOtpLoading(false);
    setSignModal(p => ({ ...p, step: 'success' }));
    Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    fetchData();
  };

  const handlePayNow = (invoice: RentInvoiceWithAgreement) => {
    setPayModal({ visible: true, invoice });
    setPayStep('select');
    setPayMethod(null);
  };

  const handleConfirmPayment = async () => {
    if (!payMethod || !payModal.invoice) return;
    setPayStep('processing');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPayStep('select'); return; }
    await new Promise(r => setTimeout(r, 2200));
    const ref = `PS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await Promise.all([
      supabase.from('rent_payments').insert({
        invoice_id: payModal.invoice.id, tenant_id: user.id,
        amount: payModal.invoice.amount, payment_method: payMethod === 'momo' ? 'mtn_momo' : 'card',
        payment_reference: ref, status: 'completed', paid_at: new Date().toISOString(),
      }),
      supabase.from('rent_invoices').update({ status: 'paid' }).eq('id', payModal.invoice.id),
    ]);
    setPayStep('success');
    fetchData();
  };

  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const unpaidCount = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').length;
  const activeAgreement = agreements.find(a => a.status === 'active');

  const statusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle size={15} color={COLORS.success} />;
    if (status === 'pending_signature') return <Clock size={15} color={COLORS.warning} />;
    if (status === 'expired' || status === 'terminated') return <AlertCircle size={15} color={COLORS.error} />;
    return <FileText size={15} color={COLORS.textSecondary} />;
  };

  const invoiceColor = (status: string) => {
    if (status === 'paid') return COLORS.success;
    if (status === 'overdue') return COLORS.error;
    if (status === 'unpaid') return COLORS.warning;
    return COLORS.textSecondary;
  };

  const TABS: { key: TabType; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'agreements', label: 'Agreements' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'receipts', label: 'Receipts' },
  ];

  const agr = signModal.agreement;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>My Tenancy</Text>
          <Text style={styles.headerSub}>Agreements, invoices & payment history</Text>
        </View>
        <View style={styles.ghanaTag}>
          <Shield size={11} color={COLORS.success} />
          <Text style={styles.ghanaTagText}>Rent Act</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((t) => (
            <AnimatedTabBtn key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={COLORS.primary} /></View>
        ) : tab === 'overview' ? (
          <OverviewTab agreements={agreements} activeAgreement={activeAgreement} paidCount={paidCount} unpaidCount={unpaidCount} receiptsCount={receipts.length} onGoTab={setTab} />
        ) : tab === 'agreements' ? (
          <AgreementsTab agreements={agreements} statusIcon={statusIcon} onSign={openSign} />
        ) : tab === 'invoices' ? (
          <InvoicesTab invoices={invoices} invoiceColor={invoiceColor} onPay={handlePayNow} />
        ) : (
          <ReceiptsTab receipts={receipts} />
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── E-SIGNATURE MODAL ─── */}
      <Modal visible={signModal.visible} transparent animationType="slide" onRequestClose={closeSign}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* STEP PROGRESS BAR */}
            {signModal.step !== 'success' && (
              <View style={styles.stepBar}>
                {(['terms', 'draw', 'otp'] as SignStep[]).map((s, i) => (
                  <View key={s} style={styles.stepBarItem}>
                    <View style={[styles.stepDot, signModal.step === s && styles.stepDotActive, (signModal.step === 'draw' && i === 0) || (signModal.step === 'otp' && i < 2) ? styles.stepDotDone : null]}>
                      <Text style={styles.stepDotText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepLabel, signModal.step === s && styles.stepLabelActive]}>
                      {s === 'terms' ? 'Review' : s === 'draw' ? 'Sign' : 'Confirm'}
                    </Text>
                    {i < 2 && <View style={[styles.stepLine, (signModal.step === 'draw' && i === 0) || (signModal.step === 'otp' && i < 2) ? styles.stepLineDone : null]} />}
                  </View>
                ))}
              </View>
            )}

            {/* STEP 1: TERMS */}
            {signModal.step === 'terms' && agr && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBox}><FileText size={22} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Review Agreement</Text>
                    <Text style={styles.modalSubtitle}>Read carefully before signing</Text>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={closeSign}>
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.termsCard}>
                  <View style={styles.termsRow}>
                    <Text style={styles.termsKey}>Property</Text>
                    <Text style={styles.termsVal}>{(agr as any).hostels?.name || 'Property'}</Text>
                  </View>
                  <View style={styles.termsDivider} />
                  <View style={styles.termsRow}>
                    <Text style={styles.termsKey}>Address</Text>
                    <Text style={styles.termsVal}>{agr.property_address}</Text>
                  </View>
                  <View style={styles.termsDivider} />
                  <View style={styles.termsRow}>
                    <Text style={styles.termsKey}>Monthly Rent</Text>
                    <Text style={[styles.termsVal, { color: COLORS.primary, fontFamily: FONT.bold }]}>GH₵{agr.monthly_rent.toLocaleString()}</Text>
                  </View>
                  <View style={styles.termsDivider} />
                  <View style={styles.termsRow}>
                    <Text style={styles.termsKey}>Period</Text>
                    <Text style={styles.termsVal}>{agr.start_date} → {agr.end_date}</Text>
                  </View>
                  {agr.ghana_rent_act_compliant && (
                    <>
                      <View style={styles.termsDivider} />
                      <View style={styles.termsRow}>
                        <Shield size={13} color={COLORS.success} />
                        <Text style={[styles.termsVal, { color: COLORS.success }]}>Ghana Rent Act 1963 Compliant</Text>
                      </View>
                    </>
                  )}
                </View>

                {agr.terms && (
                  <View style={styles.termsBodyBox}>
                    <View style={styles.termsBodyHeader}>
                      <Eye size={14} color={COLORS.textSecondary} />
                      <Text style={styles.termsBodyTitle}>Terms & Conditions</Text>
                    </View>
                    <Text style={styles.termsBodyText}>{agr.terms}</Text>
                  </View>
                )}

                <View style={styles.legalNote}>
                  <Lock size={13} color={COLORS.textTertiary} />
                  <Text style={styles.legalNoteText}>By proceeding, you agree to be legally bound by this tenancy agreement under Ghana law.</Text>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setSignModal(p => ({ ...p, step: 'draw' }))}>
                  <Pen size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Proceed to Sign</Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* STEP 2: DRAW SIGNATURE */}
            {signModal.step === 'draw' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: '#EDE9FE' }]}><Pen size={22} color='#7C3AED' /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Your Signature</Text>
                    <Text style={styles.modalSubtitle}>Draw your signature below</Text>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={closeSign}>
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <SignaturePad strokes={signStrokes} onStrokesChange={setSignStrokes} />

                <View style={styles.padActions}>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => setSignStrokes([])}>
                    <RotateCcw size={15} color={COLORS.textSecondary} />
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtnSmall, signStrokes.length === 0 && styles.primaryBtnDisabled]}
                    disabled={signStrokes.length === 0}
                    onPress={() => setSignModal(p => ({ ...p, step: 'otp' }))}
                  >
                    <Text style={styles.primaryBtnText}>Continue</Text>
                    <ArrowRight size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 3: OTP CONFIRM */}
            {signModal.step === 'otp' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBox}><Shield size={22} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Confirm with OTP</Text>
                    <Text style={styles.modalSubtitle}>Last step — verify your identity</Text>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={closeSign}>
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.otpInfo}>
                  In production, this OTP is sent via SMS to your registered number. For demo purposes, your code is shown below:
                </Text>

                <View style={styles.otpDemoBox}>
                  <Text style={styles.otpDemoLabel}>Your One-Time Code</Text>
                  <Text style={styles.otpDemoCode}>{signModal.otp}</Text>
                </View>

                <Text style={styles.inputLabel}>Enter OTP to complete signing</Text>
                <TextInput
                  style={[styles.otpInput, otpError ? styles.otpInputError : null]}
                  value={otpInput}
                  onChangeText={(v) => { setOtpInput(v); setOtpError(''); }}
                  placeholder="_ _ _ _ _ _"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {otpError ? <Text style={styles.otpErrText}>{otpError}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, (otpLoading || otpInput.length < 6) && styles.primaryBtnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading || otpInput.length < 6}
                >
                  {otpLoading
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <><BadgeCheck size={18} color={COLORS.white} /><Text style={styles.primaryBtnText}>Sign Agreement</Text></>
                  }
                </TouchableOpacity>
              </>
            )}

            {/* STEP 4: SUCCESS */}
            {signModal.step === 'success' && (
              <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }] }]}>
                <View style={styles.successIconCircle}>
                  <BadgeCheck size={44} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>Agreement Signed!</Text>
                <Text style={styles.successSubtitle}>
                  Your tenancy agreement is now legally active. A receipt has been recorded.
                </Text>
                <View style={styles.successMeta}>
                  <Shield size={14} color={COLORS.success} />
                  <Text style={styles.successMetaText}>Secured under Ghana Rent Act 1963</Text>
                </View>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.lg }]} onPress={() => { closeSign(); setTab('agreements'); }}>
                  <Text style={styles.primaryBtnText}>View My Agreement</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── PAYMENT MODAL ─── */}
      <Modal visible={payModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {payStep === 'select' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.accent}18` }]}><CreditCard size={24} color={COLORS.accent} /></View>
                  <Text style={styles.modalTitle}>Pay Rent</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setPayModal(p => ({ ...p, visible: false }))}><X size={20} color={COLORS.textSecondary} /></TouchableOpacity>
                </View>
                <View style={styles.payAmountBox}>
                  <Text style={styles.payAmountLabel}>Amount due</Text>
                  <Text style={styles.payAmountValue}>GH₵{payModal.invoice?.amount.toLocaleString()}</Text>
                  <Text style={styles.payAmountPeriod}>{payModal.invoice?.tenancy_agreements?.property_address || 'Your property'}</Text>
                </View>
                <Text style={styles.inputLabel}>Choose payment method</Text>
                <View style={styles.methodRow}>
                  {[
                    { key: 'momo' as const, label: 'Mobile Money', sub: 'MTN / Vodafone / AirtelTigo', icon: <Smartphone size={20} color={payMethod === 'momo' ? COLORS.primary : COLORS.textSecondary} /> },
                    { key: 'card' as const, label: 'Card', sub: 'Visa / Mastercard', icon: <CreditCard size={20} color={payMethod === 'card' ? COLORS.primary : COLORS.textSecondary} /> },
                  ].map(m => (
                    <TouchableOpacity key={m.key} style={[styles.methodChip, payMethod === m.key && styles.methodChipActive]} onPress={() => setPayMethod(m.key)}>
                      {m.icon}
                      <View>
                        <Text style={[styles.methodLabel, payMethod === m.key && styles.methodLabelActive]}>{m.label}</Text>
                        <Text style={styles.methodSub}>{m.sub}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.paystackBadge}><Text style={styles.paystackText}>Secured by Paystack</Text></View>
                <TouchableOpacity style={[styles.primaryBtn, !payMethod && styles.primaryBtnDisabled]} onPress={handleConfirmPayment} disabled={!payMethod}>
                  <Text style={styles.primaryBtnText}>Pay GH₵{payModal.invoice?.amount.toLocaleString()}</Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </TouchableOpacity>
              </>
            )}
            {payStep === 'processing' && (
              <View style={styles.processingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.processingTitle}>Processing payment...</Text>
                <Text style={styles.processingSubtitle}>Communicating with Paystack. Please wait.</Text>
              </View>
            )}
            {payStep === 'success' && (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}><CheckCircle size={40} color={COLORS.success} /></View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSubtitle}>GH₵{payModal.invoice?.amount.toLocaleString()} rent payment recorded.</Text>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.lg }]} onPress={() => { setPayModal(p => ({ ...p, visible: false })); setTab('receipts'); }}>
                  <Receipt size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>View Receipt</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function OverviewTab({ agreements, activeAgreement, paidCount, unpaidCount, receiptsCount, onGoTab }: {
  agreements: TenancyAgreement[]; activeAgreement?: TenancyAgreement;
  paidCount: number; unpaidCount: number; receiptsCount: number; onGoTab: (t: TabType) => void;
}) {
  return (
    <>
      {activeAgreement ? (
        <View style={styles.activeAgreementCard}>
          <View style={styles.activeAgreementTop}>
            <View style={styles.activeAgreementBadge}>
              <CheckCircle size={13} color={COLORS.success} />
              <Text style={styles.activeAgreementBadgeText}>Active Tenancy</Text>
            </View>
            <Text style={styles.activeRent}>GH₵{activeAgreement.monthly_rent.toLocaleString()}<Text style={styles.activeRentPer}>/mo</Text></Text>
          </View>
          <Text style={styles.activeAddress}>{(activeAgreement as any).hostels?.name || activeAgreement.property_address}</Text>
          <Text style={styles.activeAddr2}>{activeAgreement.property_address}</Text>
          <View style={styles.activePeriodRow}>
            <Text style={styles.activePeriodText}>{activeAgreement.start_date} — {activeAgreement.end_date}</Text>
          </View>
          {activeAgreement.ghana_rent_act_compliant && (
            <View style={styles.compliantPill}>
              <Shield size={12} color={COLORS.success} />
              <Text style={styles.compliantPillText}>Ghana Rent Act 1963 Compliant</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noAgreementBox}>
          <FileText size={36} color={COLORS.textTertiary} />
          <Text style={styles.noAgreementTitle}>No active tenancy</Text>
          <Text style={styles.noAgreementSub}>Book a hostel to get a tenancy agreement from your landlord.</Text>
        </View>
      )}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => onGoTab('agreements')}>
          <FileText size={20} color={COLORS.accent} />
          <Text style={styles.statNum}>{agreements.length}</Text>
          <Text style={styles.statLabel}>Agreements</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => onGoTab('invoices')}>
          <AlertCircle size={20} color={COLORS.warning} />
          <Text style={styles.statNum}>{unpaidCount}</Text>
          <Text style={styles.statLabel}>Unpaid</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => onGoTab('receipts')}>
          <Receipt size={20} color={COLORS.success} />
          <Text style={styles.statNum}>{receiptsCount}</Text>
          <Text style={styles.statLabel}>Receipts</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickLinks}>
        {[
          { label: 'View Agreements', tab: 'agreements' as TabType, color: COLORS.accent },
          { label: 'Pay Invoices', tab: 'invoices' as TabType, color: COLORS.warning },
          { label: 'Download Receipts', tab: 'receipts' as TabType, color: COLORS.success },
        ].map(l => (
          <TouchableOpacity key={l.tab} style={styles.quickLink} onPress={() => onGoTab(l.tab)}>
            <Text style={[styles.quickLinkText, { color: l.color }]}>{l.label}</Text>
            <ChevronRight size={16} color={l.color} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

function AgreementsTab({ agreements, statusIcon, onSign }: {
  agreements: TenancyAgreement[];
  statusIcon: (s: string) => React.ReactNode;
  onSign: (a: TenancyAgreement) => void;
}) {
  if (agreements.length === 0) {
    return (
      <View style={styles.emptyState}>
        <FileText size={48} color={COLORS.textTertiary} />
        <Text style={styles.emptyTitle}>No Agreements</Text>
        <Text style={styles.emptySubtitle}>Your tenancy agreements will appear here once a landlord creates one for you.</Text>
      </View>
    );
  }
  return (
    <>
      {agreements.map((agr) => (
        <View key={agr.id} style={styles.card}>
          <View style={styles.cardHeader}>
            {statusIcon(agr.status)}
            <Text style={[styles.statusBadge, { color: AGREEMENT_STATUS_COLORS[agr.status] || COLORS.textSecondary }]}>
              {agr.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
            {agr.ghana_rent_act_compliant && (
              <View style={styles.compliantBadge}><Text style={styles.compliantText}>Rent Act 1963</Text></View>
            )}
          </View>
          <Text style={styles.cardTitle}>{(agr as any).hostels?.name || 'Property'}</Text>
          <Text style={styles.cardAddr}>{agr.property_address}</Text>
          <View style={styles.cardRow}>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaLabel}>Monthly Rent</Text>
              <Text style={styles.cardMetaValue}>GH₵{agr.monthly_rent.toLocaleString()}</Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaLabel}>Period</Text>
              <Text style={styles.cardMetaValue}>{agr.start_date} → {agr.end_date}</Text>
            </View>
          </View>
          {agr.status === 'pending_signature' && (
            <TouchableOpacity style={styles.signBtn} onPress={() => onSign(agr)}>
              <Pen size={16} color={COLORS.white} />
              <Text style={styles.signBtnText}>Sign Agreement</Text>
            </TouchableOpacity>
          )}
          {agr.status === 'active' && (
            <View style={styles.signedBadge}>
              <BadgeCheck size={15} color={COLORS.success} />
              <Text style={styles.signedBadgeText}>Signed & Active</Text>
            </View>
          )}
        </View>
      ))}
    </>
  );
}

function InvoicesTab({ invoices, invoiceColor, onPay }: {
  invoices: RentInvoiceWithAgreement[];
  invoiceColor: (s: string) => string;
  onPay: (inv: RentInvoiceWithAgreement) => void;
}) {
  if (invoices.length === 0) {
    return (
      <View style={styles.emptyState}>
        <CreditCard size={48} color={COLORS.textTertiary} />
        <Text style={styles.emptyTitle}>No Invoices</Text>
        <Text style={styles.emptySubtitle}>Rent invoices from your active tenancy agreements will appear here.</Text>
      </View>
    );
  }
  return (
    <>
      {invoices.map((inv) => (
        <View key={inv.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.invoiceNum}>Invoice</Text>
            <View style={[styles.invStatusBadge, { backgroundColor: `${invoiceColor(inv.status)}18` }]}>
              <Text style={[styles.invStatusText, { color: invoiceColor(inv.status) }]}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</Text>
            </View>
          </View>
          <Text style={styles.invoiceAmount}>GH₵{inv.amount.toLocaleString()}</Text>
          <Text style={styles.invPeriod}>{(inv as any).month_for}</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardMetaLabel}>Due: <Text style={styles.cardMetaValue}>{inv.due_date}</Text></Text>
            {inv.paid_at && <Text style={styles.cardMetaLabel}>Paid: <Text style={styles.cardMetaValue}>{(inv.paid_at as string).slice(0, 10)}</Text></Text>}
          </View>
          {(inv.status === 'unpaid' || inv.status === 'overdue') && (
            <TouchableOpacity style={[styles.signBtn, { backgroundColor: inv.status === 'overdue' ? COLORS.error : COLORS.primary }]} onPress={() => onPay(inv)}>
              <CreditCard size={16} color={COLORS.white} />
              <Text style={styles.signBtnText}>Pay Now — GH₵{inv.amount.toLocaleString()}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </>
  );
}

function ReceiptsTab({ receipts }: { receipts: RentPaymentWithInvoice[] }) {
  if (receipts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Receipt size={48} color={COLORS.textTertiary} />
        <Text style={styles.emptyTitle}>No payment receipts yet</Text>
        <Text style={styles.emptySubtitle}>Completed rent payments will appear here as downloadable receipts.</Text>
      </View>
    );
  }
  return (
    <>
      {receipts.map((r) => (
        <View key={r.id} style={styles.receiptCard}>
          <View style={styles.receiptLeft}>
            <View style={styles.receiptIconBox}><CheckCircle size={20} color={COLORS.success} /></View>
            <View>
              <Text style={styles.receiptTitle}>{(r.rent_invoices as any)?.tenancy_agreements?.property_address || 'Rent Payment'}</Text>
              <Text style={styles.receiptMonth}>{(r.rent_invoices as any)?.month_for || ''}</Text>
              <Text style={styles.receiptRef}>Ref: {r.payment_reference}</Text>
            </View>
          </View>
          <View style={styles.receiptRight}>
            <Text style={styles.receiptAmount}>GH₵{r.amount.toLocaleString()}</Text>
            <Text style={styles.receiptDate}>{r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</Text>
            <View style={styles.receiptPaidBadge}><Text style={styles.receiptPaidText}>Paid</Text></View>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  headerSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  ghanaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  ghanaTagText: { fontFamily: FONT.medium, fontSize: 10, color: COLORS.success },
  tabBar: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACING.sm },
  tabScroll: { paddingHorizontal: SPACING.md, gap: SPACING.sm, alignItems: 'center' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: RADIUS.full, borderWidth: 1.5 },
  tabLabel: { fontSize: 14 },
  content: { padding: SPACING.md },
  loadingBox: { alignItems: 'center', paddingTop: 80 },

  activeAgreementCard: { backgroundColor: COLORS.navy, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  activeAgreementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  activeAgreementBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(22,163,74,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  activeAgreementBadgeText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.success },
  activeRent: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.white },
  activeRentPer: { fontFamily: FONT.regular, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  activeAddress: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white, marginBottom: 2 },
  activeAddr2: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: SPACING.sm },
  activePeriodRow: { marginBottom: SPACING.sm },
  activePeriodText: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  compliantPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(22,163,74,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  compliantPillText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  noAgreementBox: { alignItems: 'center', paddingVertical: SPACING.xl, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  noAgreementTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  noAgreementSub: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.xl },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statNum: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.textPrimary },
  statLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  quickLinks: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  quickLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  quickLinkText: { fontFamily: FONT.semiBold, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 8 },
  statusBadge: { fontFamily: FONT.semiBold, fontSize: 12 },
  compliantBadge: { marginLeft: 'auto', backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  compliantText: { fontFamily: FONT.medium, fontSize: 10, color: COLORS.success },
  cardTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 2 },
  cardAddr: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  cardRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  cardMeta: { flex: 1 },
  cardMetaLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginBottom: 2 },
  cardMetaValue: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },
  signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, marginTop: SPACING.sm, gap: 8 },
  signBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
  signedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, backgroundColor: COLORS.successLight, borderRadius: RADIUS.md, paddingVertical: 10 },
  signedBadgeText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.success },
  invoiceNum: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  invStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },
  invStatusText: { fontFamily: FONT.semiBold, fontSize: 11 },
  invoiceAmount: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary, marginBottom: 2 },
  invPeriod: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  receiptCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  receiptLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, flex: 1 },
  receiptIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.successLight, justifyContent: 'center', alignItems: 'center' },
  receiptTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, marginBottom: 2, maxWidth: 160 },
  receiptMonth: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  receiptRef: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  receiptRight: { alignItems: 'flex-end', gap: 4 },
  receiptAmount: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },
  receiptDate: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary },
  receiptPaidBadge: { backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  receiptPaidText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.success },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  modalIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  modalSubtitle: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },

  stepBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, gap: 0 },
  stepBarItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotDone: { backgroundColor: COLORS.success },
  stepDotText: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.white },
  stepLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginRight: 4 },
  stepLabelActive: { color: COLORS.primary, fontFamily: FONT.semiBold },
  stepLine: { width: 28, height: 2, backgroundColor: COLORS.borderLight, marginHorizontal: 2 },
  stepLineDone: { backgroundColor: COLORS.success },

  termsCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.md, overflow: 'hidden' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  termsDivider: { height: 1, backgroundColor: COLORS.borderLight },
  termsKey: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, width: 90 },
  termsVal: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  termsBodyBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
  termsBodyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  termsBodyTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary },
  termsBodyText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  legalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: COLORS.infoLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md },
  legalNoteText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  padOuter: { height: PAD_H, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', backgroundColor: '#FAFAFA', marginBottom: SPACING.sm, overflow: 'hidden', position: 'relative' },
  padCanvas: { ...StyleSheet.absoluteFillObject },
  padPlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 8, flexDirection: 'row' },
  padPlaceholderText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textTertiary },
  padActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  clearBtnText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  primaryBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 11, borderRadius: RADIUS.full },

  otpInfo: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  otpDemoBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  otpDemoLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  otpDemoCode: { fontFamily: FONT.headingBold, fontSize: 36, color: COLORS.primary, letterSpacing: 8 },
  inputLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6 },
  otpInput: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, height: 56, textAlign: 'center', fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary, letterSpacing: 8, marginBottom: SPACING.sm },
  otpInputError: { borderColor: COLORS.error },
  otpErrText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error, marginBottom: SPACING.sm },

  payAmountBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  payAmountLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  payAmountValue: { fontFamily: FONT.headingBold, fontSize: 34, color: COLORS.textPrimary, marginBottom: 2 },
  payAmountPeriod: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  methodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  methodChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  methodChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  methodLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary },
  methodLabelActive: { color: COLORS.primary },
  methodSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  paystackBadge: { alignItems: 'center', marginBottom: SPACING.md },
  paystackText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, gap: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },
  processingBox: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  processingTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary },
  processingSubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  successBox: { alignItems: 'center', paddingVertical: SPACING.lg },
  successIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  successTitle: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successSubtitle: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.md },
  successMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, backgroundColor: COLORS.successLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  successMetaText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.success },
});