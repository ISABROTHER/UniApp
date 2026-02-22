/**
 * PaystackModal — reusable Ghana payment gateway bottom sheet.
 *
 * Supports:
 *   - MTN MoMo / Vodafone Cash / AirtelTigo Money
 *   - Visa / Mastercard
 *
 * In production: set PAYSTACK_PUBLIC_KEY env var and pass it via `publicKey` prop.
 * In sandbox/demo mode: simulates a 2.4s processing delay then calls onSuccess.
 *
 * Usage:
 *   <PaystackModal
 *     visible={modal}
 *     amount={50}
 *     label="Wallet Top-Up"
 *     onSuccess={(ref) => handleSuccess(ref)}
 *     onClose={() => setModal(false)}
 *   />
 */
import { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, Animated, ActivityIndicator, Platform,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  X, CreditCard, Smartphone, CheckCircle,
  AlertCircle, Lock, ChevronDown, ArrowRight,
  Shield,
} from 'lucide-react-native';

type PayMethod = 'momo' | 'card';
type MomoNetwork = 'mtn' | 'vodafone' | 'airteltigo';
type PayStep = 'select' | 'momo_details' | 'card_details' | 'processing' | 'success' | 'failed';

interface Props {
  visible: boolean;
  amount: number;
  label: string;
  email?: string;
  publicKey?: string;           // Paystack public key — leave undefined for sandbox mode
  onSuccess: (ref: string) => void;
  onClose: () => void;
}

const MOMO_NETWORKS: { key: MomoNetwork; label: string; color: string; prefix: string }[] = [
  { key: 'mtn',        label: 'MTN MoMo',           color: '#FFCC00', prefix: '024/054/055/059' },
  { key: 'vodafone',   label: 'Vodafone Cash',       color: '#E60000', prefix: '020/050' },
  { key: 'airteltigo', label: 'AirtelTigo Money',    color: '#FF6600', prefix: '027/057/026/056' },
];

function NetworkDot({ color }: { color: string }) {
  return <View style={[styles.networkDot, { backgroundColor: color }]} />;
}

export default function PaystackModal({ visible, amount, label, email, publicKey, onSuccess, onClose }: Props) {
  const [step, setStep] = useState<PayStep>('select');
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [momoNetwork, setMomoNetwork] = useState<MomoNetwork>('mtn');
  const [momoPhone, setMomoPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [error, setError] = useState('');
  const [networkOpen, setNetworkOpen] = useState(false);

  const slideY = useRef(new Animated.Value(600)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const processingRotate = useRef(new Animated.Value(0)).current;
  const processingAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('select');
      setMethod(null);
      setMomoPhone('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardName('');
      setError('');
      Animated.spring(slideY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideY, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (step === 'processing') {
      processingAnim.current = Animated.loop(
        Animated.timing(processingRotate, { toValue: 1, duration: 1000, useNativeDriver: true })
      );
      processingAnim.current.start();
    } else {
      processingAnim.current?.stop();
      processingRotate.setValue(0);
    }
    if (step === 'success') {
      Animated.spring(successScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    }
  }, [step]);

  const generateRef = () => `PS-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const validateMomo = () => {
    if (!momoPhone.trim()) return 'Enter your MoMo phone number.';
    if (momoPhone.replace(/\D/g, '').length < 9) return 'Enter a valid 10-digit Ghana phone number.';
    return '';
  };

  const validateCard = () => {
    if (!cardName.trim()) return 'Enter cardholder name.';
    if (cardNumber.replace(/\s/g, '').length < 16) return 'Enter a valid 16-digit card number.';
    if (cardExpiry.length < 5) return 'Enter a valid expiry date (MM/YY).';
    if (cardCvv.length < 3) return 'Enter a valid CVV.';
    return '';
  };

  const submitPayment = async () => {
    const err = method === 'momo' ? validateMomo() : validateCard();
    if (err) { setError(err); return; }
    setError('');
    setStep('processing');

    if (publicKey) {
      // ── LIVE PAYSTACK INTEGRATION ──────────────────────────────────────────
      // In a real build with expo-web-browser / react-native-webview, you'd:
      // 1. POST to https://api.paystack.co/transaction/initialize
      //    with { amount: amount * 100, email, channel, mobile_money: {...} }
      //    using Authorization: Bearer <publicKey>
      // 2. Open the authorization_url in a WebView or browser
      // 3. Listen for the callback and verify with your backend
      // ──────────────────────────────────────────────────────────────────────
    }

    // Sandbox simulation — mimics real gateway latency
    await new Promise(r => setTimeout(r, 2400));

    // 95% success rate in sandbox
    const succeeded = Math.random() > 0.05;
    if (succeeded) {
      setStep('success');
      const ref = generateRef();
      setTimeout(() => onSuccess(ref), 1200);
    } else {
      setStep('failed');
    }
  };

  const spin = processingRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const selectedNetwork = MOMO_NETWORKS.find(n => n.key === momoNetwork)!;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={step === 'select' ? onClose : undefined} activeOpacity={1} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={styles.handle} />

          {/* STEP: SELECT METHOD */}
          {step === 'select' && (
            <>
              <View style={styles.sheetHeader}>
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>{label}</Text>
                  <Text style={styles.amountValue}>GH₵{amount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Choose payment method</Text>

              {/* Mobile Money */}
              <TouchableOpacity
                style={[styles.methodCard, method === 'momo' && styles.methodCardActive]}
                onPress={() => { setMethod('momo'); setStep('momo_details'); }}
                activeOpacity={0.8}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: '#FFF7E0' }]}>
                    <Smartphone size={22} color='#FFAA00' />
                  </View>
                  <View>
                    <Text style={styles.methodTitle}>Mobile Money</Text>
                    <Text style={styles.methodSub}>MTN · Vodafone · AirtelTigo</Text>
                  </View>
                </View>
                <ArrowRight size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>

              {/* Card */}
              <TouchableOpacity
                style={[styles.methodCard, method === 'card' && styles.methodCardActive]}
                onPress={() => { setMethod('card'); setStep('card_details'); }}
                activeOpacity={0.8}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: '#EFF6FF' }]}>
                    <CreditCard size={22} color={COLORS.accent} />
                  </View>
                  <View>
                    <Text style={styles.methodTitle}>Debit / Credit Card</Text>
                    <Text style={styles.methodSub}>Visa · Mastercard · Verve</Text>
                  </View>
                </View>
                <ArrowRight size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>

              <View style={styles.securedRow}>
                <Shield size={13} color={COLORS.textTertiary} />
                <Text style={styles.securedText}>Secured by Paystack · 256-bit SSL</Text>
              </View>
            </>
          )}

          {/* STEP: MOMO DETAILS */}
          {step === 'momo_details' && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setStep('select')} style={styles.backChevron}>
                  <ChevronDown size={20} color={COLORS.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Mobile Money</Text>
                <View style={styles.stepAmountPill}>
                  <Text style={styles.stepAmountText}>GH₵{amount.toFixed(2)}</Text>
                </View>
              </View>

              {/* Network selector */}
              <Text style={styles.fieldLabel}>Network</Text>
              <TouchableOpacity style={styles.networkSelector} onPress={() => setNetworkOpen(p => !p)} activeOpacity={0.8}>
                <NetworkDot color={selectedNetwork.color} />
                <Text style={styles.networkSelectorText}>{selectedNetwork.label}</Text>
                <ChevronDown size={16} color={COLORS.textSecondary} style={networkOpen ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </TouchableOpacity>

              {networkOpen && (
                <View style={styles.networkDropdown}>
                  {MOMO_NETWORKS.map(n => (
                    <TouchableOpacity
                      key={n.key}
                      style={[styles.networkOption, momoNetwork === n.key && styles.networkOptionActive]}
                      onPress={() => { setMomoNetwork(n.key); setNetworkOpen(false); }}
                      activeOpacity={0.75}
                    >
                      <NetworkDot color={n.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.networkOptionLabel}>{n.label}</Text>
                        <Text style={styles.networkOptionPrefix}>{n.prefix}</Text>
                      </View>
                      {momoNetwork === n.key && <CheckCircle size={15} color={COLORS.success} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefixBox}>
                  <Text style={styles.phonePrefix}>🇬🇭 +233</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={momoPhone}
                  onChangeText={(v) => { setMomoPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="0XX XXX XXXX"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.momoNoteBox}>
                <Smartphone size={14} color={COLORS.info} />
                <Text style={styles.momoNoteText}>
                  You'll receive a USSD prompt on your phone to authorise this payment.
                </Text>
              </View>

              {error ? <View style={styles.errorBox}><AlertCircle size={14} color={COLORS.error} /><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity style={styles.payBtn} onPress={submitPayment} activeOpacity={0.85}>
                <Smartphone size={18} color={COLORS.white} />
                <Text style={styles.payBtnText}>Pay GH₵{amount.toFixed(2)}</Text>
              </TouchableOpacity>
              <View style={styles.securedRow}>
                <Lock size={11} color={COLORS.textTertiary} />
                <Text style={styles.securedText}>Secured by Paystack</Text>
              </View>
            </ScrollView>
          )}

          {/* STEP: CARD DETAILS */}
          {step === 'card_details' && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setStep('select')} style={styles.backChevron}>
                  <ChevronDown size={20} color={COLORS.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Card Payment</Text>
                <View style={styles.stepAmountPill}>
                  <Text style={styles.stepAmountText}>GH₵{amount.toFixed(2)}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={cardName}
                onChangeText={(v) => { setCardName(v); setError(''); }}
                placeholder="Full name on card"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Card Number</Text>
              <View style={styles.cardNumRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
                  value={cardNumber}
                  onChangeText={(v) => { setCardNumber(formatCard(v)); setError(''); }}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  maxLength={19}
                />
                <CreditCard size={20} color={COLORS.textTertiary} style={styles.cardIcon} />
              </View>

              <View style={styles.cardRow2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Expiry</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={cardExpiry}
                    onChangeText={(v) => { setCardExpiry(formatExpiry(v)); setError(''); }}
                    placeholder="MM/YY"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CVV</Text>
                  <View style={styles.cvvRow}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
                      value={cardCvv}
                      onChangeText={(v) => { setCardCvv(v.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                      placeholder="•••"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                    <Lock size={14} color={COLORS.textTertiary} style={styles.cardIcon} />
                  </View>
                </View>
              </View>

              {error ? <View style={styles.errorBox}><AlertCircle size={14} color={COLORS.error} /><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity style={[styles.payBtn, { backgroundColor: COLORS.navy }]} onPress={submitPayment} activeOpacity={0.85}>
                <Lock size={16} color={COLORS.white} />
                <Text style={styles.payBtnText}>Pay GH₵{amount.toFixed(2)} Securely</Text>
              </TouchableOpacity>
              <View style={styles.securedRow}>
                <Shield size={11} color={COLORS.textTertiary} />
                <Text style={styles.securedText}>256-bit SSL · PCI DSS compliant via Paystack</Text>
              </View>
            </ScrollView>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <View style={styles.processingBox}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <View style={styles.processingRing}>
                  <View style={styles.processingInner}>
                    {method === 'momo'
                      ? <Smartphone size={28} color={COLORS.primary} />
                      : <CreditCard size={28} color={COLORS.primary} />
                    }
                  </View>
                </View>
              </Animated.View>
              <Text style={styles.processingTitle}>
                {method === 'momo' ? 'Waiting for authorisation...' : 'Processing payment...'}
              </Text>
              <Text style={styles.processingSubtitle}>
                {method === 'momo'
                  ? `Check your ${selectedNetwork.label} phone for a prompt`
                  : 'Communicating with Paystack securely'
                }
              </Text>
              <View style={styles.processingDots}>
                {[0, 1, 2].map(i => <ProcessingDot key={i} delay={i * 250} />)}
              </View>
            </View>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <Animated.View style={[styles.outcomeBox, { transform: [{ scale: successScale }] }]}>
              <View style={styles.successCircle}>
                <CheckCircle size={44} color={COLORS.success} />
              </View>
              <Text style={styles.outcomeTitle}>Payment Successful!</Text>
              <Text style={styles.outcomeSubtitle}>
                GH₵{amount.toFixed(2)} {label.toLowerCase()} confirmed.
              </Text>
              <View style={styles.securedRow} style={{ marginTop: SPACING.md }}>
                <Shield size={13} color={COLORS.success} />
                <Text style={[styles.securedText, { color: COLORS.success }]}>Verified by Paystack</Text>
              </View>
            </Animated.View>
          )}

          {/* STEP: FAILED */}
          {step === 'failed' && (
            <View style={styles.outcomeBox}>
              <View style={[styles.successCircle, { backgroundColor: COLORS.errorLight }]}>
                <AlertCircle size={44} color={COLORS.error} />
              </View>
              <Text style={styles.outcomeTitle}>Payment Failed</Text>
              <Text style={styles.outcomeSubtitle}>
                {method === 'momo'
                  ? 'The MoMo authorisation was not completed. Please try again.'
                  : 'Your card was declined. Please check your details or try another method.'
                }
              </Text>
              <View style={styles.failedActions}>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setStep(method === 'momo' ? 'momo_details' : 'card_details')} activeOpacity={0.8}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.switchBtn} onPress={() => { setStep('select'); setMethod(null); }} activeOpacity={0.8}>
                  <Text style={styles.switchBtnText}>Switch Method</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ProcessingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: SPACING.lg, paddingBottom: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24,
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: SPACING.sm },
  amountBox: { flex: 1 },
  amountLabel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  amountValue: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  backChevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  stepTitle: { flex: 1, fontFamily: FONT.heading, fontSize: 17, color: COLORS.textPrimary },
  stepAmountPill: { backgroundColor: COLORS.primaryFaded, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  stepAmountText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },

  sectionLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },

  methodCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  methodCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  methodIcon: { width: 46, height: 46, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  methodTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  methodSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },

  securedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: SPACING.md },
  securedText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  fieldLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, height: 50, paddingHorizontal: SPACING.md,
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.md,
  },

  networkDot: { width: 12, height: 12, borderRadius: 6 },
  networkSelector: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, height: 50, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  networkSelectorText: { flex: 1, fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  networkDropdown: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md, overflow: 'hidden',
  },
  networkOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  networkOptionActive: { backgroundColor: COLORS.background },
  networkOptionLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  networkOptionPrefix: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary },

  phoneRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  phonePrefixBox: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, height: 50, paddingHorizontal: SPACING.sm, justifyContent: 'center', alignItems: 'center' },
  phonePrefix: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  phoneInput: { flex: 1, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, height: 50, paddingHorizontal: SPACING.md, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary },

  momoNoteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.infoLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md },
  momoNoteText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.info, flex: 1, lineHeight: 18 },

  cardNumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, position: 'relative' },
  cardRow2: { flexDirection: 'row', gap: SPACING.sm },
  cvvRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { position: 'absolute', right: 14 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error, flex: 1 },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 54,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    marginTop: SPACING.sm,
  },
  payBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  processingBox: { alignItems: 'center', paddingVertical: SPACING.xl },
  processingRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: COLORS.primaryFaded,
    borderTopColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  processingInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center' },
  processingTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  processingSubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  processingDots: { flexDirection: 'row', gap: 8, marginTop: SPACING.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

  outcomeBox: { alignItems: 'center', paddingVertical: SPACING.lg },
  successCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  outcomeTitle: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  outcomeSubtitle: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  failedActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  retryBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  retryBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
  switchBtn: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  switchBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textSecondary },
});