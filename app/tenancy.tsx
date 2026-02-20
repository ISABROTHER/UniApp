import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, AGREEMENT_STATUS_COLORS } from '@/lib/constants';
import { TenancyAgreement, RentInvoice, RentPayment } from '@/lib/types';
import {
  ArrowLeft, FileText, CheckCircle, Clock, AlertCircle, CreditCard,
  ChevronRight, Shield, Receipt, X, Smartphone,
  BadgeCheck, ArrowRight,
} from 'lucide-react-native';

type TabType = 'overview' | 'agreements' | 'invoices' | 'receipts';

function AnimatedTabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(active ? 1 : 0)).current;

  const prevActive = useRef(active);
  if (prevActive.current !== active) {
    prevActive.current = active;
    if (active) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]),
        Animated.timing(bg, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(bg, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }

  const backgroundColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0.03)', COLORS.navy],
  });
  const borderColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', COLORS.navy],
  });
  const color = active ? COLORS.white : COLORS.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[
        styles.tabBtn, 
        { backgroundColor, borderColor, transform: [{ scale }] },
        active && styles.tabBtnActiveShadow
      ]}>
        <Text style={[styles.tabLabel, { color, fontFamily: active ? FONT.semiBold : FONT.medium }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
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

  const [otpModal, setOtpModal] = useState<{ visible: boolean; agreementId: string; generatedOtp: string }>({
    visible: false, agreementId: '', generatedOtp: '',
  });
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [payModal, setPayModal] = useState<{ visible: boolean; invoice: RentInvoiceWithAgreement | null }>({
    visible: false, invoice: null,
  });
  const [payStep, setPayStep] = useState<'select' | 'processing' | 'success'>('select');
  const [payMethod, setPayMethod] = useState<'card' | 'momo' | null>(null);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: agrs }, { data: invs }, { data: pays }] = await Promise.all([
      supabase
        .from('tenancy_agreements')
        .select('*, hostels(name, address, campus_proximity)')
        .or(`tenant_id.eq.${user.id},landlord_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('rent_invoices')
        .select('*, tenancy_agreements(property_address, monthly_rent)')
        .eq('tenant_id', user.id)
        .order('due_date', { ascending: false }),
      supabase
        .from('rent_payments')
        .select('*, rent_invoices(month_for, amount, tenancy_agreements(property_address))')
        .eq('tenant_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false }),
    ]);

    setAgreements((agrs as TenancyAgreement[]) || []);
    setInvoices((invs as RentInvoiceWithAgreement[]) || []);
    setReceipts((pays as RentPaymentWithInvoice[]) || []);
    setLoading(false);
  };

  const handleOpenOtp = (agreementId: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpModal({ visible: true, agreementId, generatedOtp: otp });
    setOtpInput('');
    setOtpError('');
  };

  const handleVerifyOtp = async () => {
    if (otpInput.trim() !== otpModal.generatedOtp) {
      setOtpError('Incorrect OTP. Please try again.');
      return;
    }
    setOtpError('');
    setOtpLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setOtpLoading(false); return; }

    const userAgent = Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS}-app`;

    await Promise.all([
      supabase.from('agreement_signatures').insert({
        agreement_id: otpModal.agreementId,
        signer_id: user.id,
        signer_role: 'tenant',
        otp_code: otpModal.generatedOtp,
        signed_at: new Date().toISOString(),
        user_agent: userAgent,
      }),
      supabase.from('tenancy_agreements')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', otpModal.agreementId),
      supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'agreement_signed',
        entity_type: 'tenancy_agreement',
        entity_id: otpModal.agreementId,
        metadata: { method: 'otp', platform: Platform.OS },
      }),
    ]);

    setOtpLoading(false);
    setOtpModal({ visible: false, agreementId: '', generatedOtp: '' });
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
        invoice_id: payModal.invoice.id,
        tenant_id: user.id,
        amount: payModal.invoice.amount,
        payment_method: payMethod === 'momo' ? 'mtn_momo' : 'card',
        payment_reference: ref,
        status: 'completed',
        paid_at: new Date().toISOString(),
      }),
      supabase.from('rent_invoices')
        .update({ status: 'paid' })
        .eq('id', payModal.invoice.id),
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

  return (
    <View style={styles.container}>
      {/* 1. Unified Glassmorphic Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
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

        {/* TABS */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map((t) => (
              <AnimatedTabBtn
                key={t.key}
                label={t.label}
                active={tab === t.key}
                onPress={() => setTab(t.key)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : tab === 'overview' ? (
          <OverviewTab
            agreements={agreements}
            activeAgreement={activeAgreement}
            paidCount={paidCount}
            unpaidCount={unpaidCount}
            receiptsCount={receipts.length}
            onGoTab={setTab}
          />
        ) : tab === 'agreements' ? (
          <AgreementsTab agreements={agreements} statusIcon={statusIcon} onSign={handleOpenOtp} />
        ) : tab === 'invoices' ? (
          <InvoicesTab invoices={invoices} invoiceColor={invoiceColor} onPay={handlePayNow} />
        ) : (
          <ReceiptsTab receipts={receipts} />
        )}
      </ScrollView>

      {/* OTP MODAL */}
      <Modal visible={otpModal.visible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Shield size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>OTP E-Signature</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setOtpModal(p => ({ ...p, visible: false }))}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.otpInfo}>
              Your one-time signing code is shown below. This simulates an SMS/email delivery.
            </Text>

            <View style={styles.otpDemoBox}>
              <Text style={styles.otpDemoLabel}>Your OTP Code</Text>
              <Text style={styles.otpDemoCode}>{otpModal.generatedOtp}</Text>
            </View>

            <Text style={styles.inputLabel}>Enter OTP to sign</Text>
            <TextInput
              style={[styles.otpInput, otpError ? styles.otpInputError : null]}
              value={otpInput}
              onChangeText={(v) => { setOtpInput(v); setOtpError(''); }}
              placeholder="6-digit OTP"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
            />
            {otpError ? <Text style={styles.otpErrText}>{otpError}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, otpLoading && styles.primaryBtnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpLoading || otpInput.length < 6}
            >
              {otpLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <BadgeCheck size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Sign Agreement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PAYMENT MODAL */}
      <Modal visible={payModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {payStep === 'select' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.accent}18` }]}>
                    <CreditCard size={24} color={COLORS.accent} />
                  </View>
                  <Text style={styles.modalTitle}>Pay Rent</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setPayModal(p => ({ ...p, visible: false }))}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.payAmountBox}>
                  <Text style={styles.payAmountLabel}>Amount due</Text>
                  <Text style={styles.payAmountValue}>GH₵{payModal.invoice?.amount.toLocaleString()}</Text>
                  <Text style={styles.payAmountPeriod}>
                    {payModal.invoice?.tenancy_agreements?.property_address || 'Your property'}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Choose payment method</Text>
                <View style={styles.methodRow}>
                  {[
                    { key: 'momo' as const, label: 'Mobile Money', sub: 'MTN / Vodafone / AirtelTigo', icon: <Smartphone size={20} color={payMethod === 'momo' ? COLORS.primary : COLORS.textSecondary} /> },
                    { key: 'card' as const, label: 'Card', sub: 'Visa / Mastercard', icon: <CreditCard size={20} color={payMethod === 'card' ? COLORS.primary : COLORS.textSecondary} /> },
                  ].map(m => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.methodChip, payMethod === m.key && styles.methodChipActive]}
                      onPress={() => setPayMethod(m.key)}
                    >
                      {m.icon}
                      <View>
                        <Text style={[styles.methodLabel, payMethod === m.key && styles.methodLabelActive]}>{m.label}</Text>
                        <Text style={styles.methodSub}>{m.sub}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.paystackBadge}>
                  <Text style={styles.paystackText}>Secured by Paystack</Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, !payMethod && styles.primaryBtnDisabled]}
                  onPress={handleConfirmPayment}
                  disabled={!payMethod}
                >
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
                <View style={styles.successIconCircle}>
                  <CheckCircle size={40} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSubtitle}>
                  GH₵{payModal.invoice?.amount.toLocaleString()} rent payment recorded.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: SPACING.lg }]}
                  onPress={() => { setPayModal(p => ({ ...p, visible: false })); setTab('receipts'); }}
                >
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

function OverviewTab({
  agreements, activeAgreement, paidCount, unpaidCount, receiptsCount, onGoTab,
}: {
  agreements: TenancyAgreement[];
  activeAgreement?: TenancyAgreement;
  paidCount: number; unpaidCount: number; receiptsCount: number;
  onGoTab: (t: TabType) => void;
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
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconBg}>
            <FileText size={36} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No active tenancy</Text>
          <Text style={styles.emptySubtitle}>Book a hostel to get a tenancy agreement from your landlord.</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => onGoTab('agreements')} activeOpacity={0.7}>
          <FileText size={22} color={COLORS.accent} />
          <Text style={styles.statNum}>{agreements.length}</Text>
          <Text style={styles.statLabel}>Agreements</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => onGoTab('invoices')} activeOpacity={0.7}>
          <AlertCircle size={22} color={COLORS.warning} />
          <Text style={styles.statNum}>{unpaidCount}</Text>
          <Text style={styles.statLabel}>Unpaid</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => onGoTab('receipts')} activeOpacity={0.7}>
          <Receipt size={22} color={COLORS.success} />
          <Text style={styles.statNum}>{receiptsCount}</Text>
          <Text style={styles.statLabel}>Receipts</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickLinks}>
        {[
          { label: 'View Agreements', tab: 'agreements' as TabType, color: COLORS.accent },
          { label: 'Pay Invoices', tab: 'invoices' as TabType, color: COLORS.warning },
          { label: 'Download Receipts', tab: 'receipts' as TabType, color: COLORS.success },
        ].map((l, index) => (
          <TouchableOpacity 
            key={l.tab} 
            style={[styles.quickLink, index === 2 && { borderBottomWidth: 0 }]} 
            onPress={() => onGoTab(l.tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickLinkText, { color: l.color }]}>{l.label}</Text>
            <ChevronRight size={18} color={l.color} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

function AgreementsTab({
  agreements, statusIcon, onSign,
}: {
  agreements: TenancyAgreement[];
  statusIcon: (s: string) => React.ReactNode;
  onSign: (id: string) => void;
}) {
  if (agreements.length === 0) {
    return (
      <View style={styles.emptyStateCard}>
        <View style={styles.emptyIconBg}>
          <FileText size={36} color={COLORS.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>No Agreements</Text>
        <Text style={styles.emptySubtitle}>Your tenancy agreements will appear here once a landlord creates one for you.</Text>
      </View>
    );
  }
  return (
    <>
      {agreements.map((agr) => (
        <View key={agr.id} style={styles.glassCard}>
          <View style={styles.cardHeader}>
            {statusIcon(agr.status)}
            <Text style={[styles.statusBadge, { color: AGREEMENT_STATUS_COLORS[agr.status] || COLORS.textSecondary }]}>
              {agr.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
            {agr.ghana_rent_act_compliant && (
              <View style={styles.compliantBadge}>
                <Text style={styles.compliantText}>Rent Act 1963</Text>
              </View>
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
            <TouchableOpacity style={styles.signBtn} onPress={() => onSign(agr.id)} activeOpacity={0.8}>
              <Shield size={16} color={COLORS.white} />
              <Text style={styles.signBtnText}>Sign Agreement (OTP)</Text>
            </TouchableOpacity>
          )}
          {agr.terms && (
            <TouchableOpacity style={styles.viewTerms} activeOpacity={0.6}>
              <Text style={styles.viewTermsText}>View Terms & Conditions</Text>
              <ChevronRight size={14} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </>
  );
}

function InvoicesTab({
  invoices, invoiceColor, onPay,
}: {
  invoices: RentInvoiceWithAgreement[];
  invoiceColor: (s: string) => string;
  onPay: (inv: RentInvoiceWithAgreement) => void;
}) {
  if (invoices.length === 0) {
    return (
      <View style={styles.emptyStateCard}>
        <View style={styles.emptyIconBg}>
          <CreditCard size={36} color={COLORS.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>No Invoices</Text>
        <Text style={styles.emptySubtitle}>Rent invoices from your active tenancy agreements will appear here.</Text>
      </View>
    );
  }
  return (
    <>
      {invoices.map((inv) => (
        <View key={inv.id} style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.invoiceNum}>Invoice</Text>
            <View style={[styles.invStatusBadge, { backgroundColor: `${invoiceColor(inv.status)}18` }]}>
              <Text style={[styles.invStatusText, { color: invoiceColor(inv.status) }]}>
                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.invoiceAmount}>GH₵{inv.amount.toLocaleString()}</Text>
          <Text style={styles.invPeriod}>{(inv as any).month_for}</Text>
          
          <View style={styles.cardRow}>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaLabel}>Due Date</Text>
              <Text style={styles.cardMetaValue}>{inv.due_date}</Text>
            </View>
            {inv.paid_at && (
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaLabel}>Paid On</Text>
                <Text style={styles.cardMetaValue}>{(inv.paid_at as string).slice(0, 10)}</Text>
              </View>
            )}
          </View>

          {(inv.status === 'unpaid' || inv.status === 'overdue') && (
            <TouchableOpacity
              style={[styles.signBtn, { backgroundColor: inv.status === 'overdue' ? COLORS.error : COLORS.primary }]}
              onPress={() => onPay(inv)}
              activeOpacity={0.8}
            >
              <CreditCard size={18} color={COLORS.white} />
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
      <View style={styles.emptyStateCard}>
        <View style={styles.emptyIconBg}>
          <Receipt size={36} color={COLORS.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>No receipts yet</Text>
        <Text style={styles.emptySubtitle}>Completed rent payments will appear here as downloadable receipts.</Text>
      </View>
    );
  }
  return (
    <>
      {receipts.map((r) => (
        <View key={r.id} style={styles.receiptCard}>
          <View style={styles.receiptLeft}>
            <View style={styles.receiptIconBox}>
              <CheckCircle size={22} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.receiptTitle} numberOfLines={1}>
                {(r.rent_invoices as any)?.tenancy_agreements?.property_address || 'Rent Payment'}
              </Text>
              <Text style={styles.receiptMonth}>{(r.rent_invoices as any)?.month_for || ''}</Text>
              <Text style={styles.receiptRef}>Ref: {r.payment_reference}</Text>
            </View>
          </View>
          <View style={styles.receiptRight}>
            <Text style={styles.receiptAmount}>GH₵{r.amount.toLocaleString()}</Text>
            <Text style={styles.receiptDate}>{r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</Text>
            <View style={styles.receiptPaidBadge}>
              <Text style={styles.receiptPaidText}>Paid</Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F7F9' 
  },

  // Premium Unified Header with Tabs
  headerContainer: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: SPACING.md, 
    paddingBottom: SPACING.md, 
    gap: SPACING.sm, 
  },
  backBtn: { 
    width: 40, height: 40, 
    borderRadius: RADIUS.full, 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  headerSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  ghanaTag: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: COLORS.successLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full 
  },
  ghanaTagText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },

  tabBar: { paddingBottom: SPACING.sm },
  tabScroll: { paddingHorizontal: SPACING.md, gap: 10, alignItems: 'center' },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tabBtnActiveShadow: {
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: { fontSize: 14 },

  content: { padding: SPACING.md, paddingBottom: 60 },
  loadingBox: { alignItems: 'center', paddingTop: 80 },

  // Glassmorphic Components
  glassCard: { 
    backgroundColor: 'rgba(255,255,255,0.92)', 
    borderRadius: RADIUS.xl, 
    padding: SPACING.lg, 
    marginBottom: SPACING.md, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 
  },

  activeAgreementCard: {
    backgroundColor: COLORS.navy, borderRadius: RADIUS.xl, padding: SPACING.xl,
    marginBottom: SPACING.md,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  activeAgreementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  activeAgreementBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(22,163,74,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  activeAgreementBadgeText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.success },
  activeRent: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.white },
  activeRentPer: { fontFamily: FONT.regular, fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  activeAddress: { fontFamily: FONT.semiBold, fontSize: 18, color: COLORS.white, marginBottom: 4 },
  activeAddr2: { fontFamily: FONT.regular, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: SPACING.md },
  activePeriodRow: { marginBottom: SPACING.md },
  activePeriodText: { fontFamily: FONT.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  compliantPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(22,163,74,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  compliantPillText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.success },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { 
    flex: 1, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: RADIUS.xl, 
    padding: SPACING.lg, alignItems: 'center', gap: 6, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 
  },
  statNum: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary },
  statLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  quickLinks: { 
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: RADIUS.xl, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 
  },
  quickLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  quickLinkText: { fontFamily: FONT.semiBold, fontSize: 15 },

  // Premium Empty States
  emptyStateCard: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  emptyIconBg: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 12 },
  statusBadge: { fontFamily: FONT.semiBold, fontSize: 13 },
  compliantBadge: { marginLeft: 'auto', backgroundColor: COLORS.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  compliantText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  cardTitle: { fontFamily: FONT.semiBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 4 },
  cardAddr: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },
  
  cardRow: { 
    flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.02)', padding: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
  },
  cardMeta: { flex: 1 },
  cardMetaLabel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginBottom: 4 },
  cardMetaValue: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  
  signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, marginTop: SPACING.xs, gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  signBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
  viewTerms: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4, marginTop: 4 },
  viewTermsText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.accent },

  invoiceNum: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  invStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  invStatusText: { fontFamily: FONT.semiBold, fontSize: 12 },
  invoiceAmount: { fontFamily: FONT.headingBold, fontSize: 32, color: COLORS.textPrimary, marginBottom: 4 },
  invPeriod: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },

  receiptCard: { 
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 
  },
  receiptLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  receiptIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.successLight, justifyContent: 'center', alignItems: 'center' },
  receiptTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: 2, maxWidth: 160 },
  receiptMonth: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  receiptRef: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textTertiary },
  receiptRight: { alignItems: 'flex-end', gap: 6 },
  receiptAmount: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary },
  receiptDate: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },
  receiptPaidBadge: { backgroundColor: COLORS.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  receiptPaidText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.success },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: SPACING.xl, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: COLORS.border, borderRadius: 3, alignSelf: 'center', marginBottom: SPACING.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  modalIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, fontFamily: FONT.heading, fontSize: 22, color: COLORS.textPrimary },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  otpInfo: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.lg },
  otpDemoBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  otpDemoLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  otpDemoCode: { fontFamily: FONT.headingBold, fontSize: 40, color: COLORS.primary, letterSpacing: 10 },
  inputLabel: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textPrimary, marginBottom: 8 },
  otpInput: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, height: 60, textAlign: 'center', fontFamily: FONT.headingBold, fontSize: 32, color: COLORS.textPrimary, letterSpacing: 10, marginBottom: SPACING.md },
  otpInputError: { borderColor: COLORS.error },
  otpErrText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.error, marginBottom: SPACING.md },

  payAmountBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  payAmountLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  payAmountValue: { fontFamily: FONT.headingBold, fontSize: 38, color: COLORS.textPrimary, marginBottom: 4 },
  payAmountPeriod: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },

  methodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  methodChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  methodChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  methodLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textSecondary },
  methodLabelActive: { color: COLORS.primary },
  methodSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  paystackBadge: { alignItems: 'center', marginBottom: SPACING.lg, marginTop: SPACING.sm },
  paystackText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textTertiary },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 18, gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: FONT.semiBold, fontSize: 17, color: COLORS.white },

  processingBox: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  processingTitle: { fontFamily: FONT.heading, fontSize: 22, color: COLORS.textPrimary },
  processingSubtitle: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },

  successBox: { alignItems: 'center', paddingVertical: SPACING.xl },
  successIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  successTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successSubtitle: { fontFamily: FONT.regular, fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
});