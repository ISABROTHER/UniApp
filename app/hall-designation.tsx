import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, PAYSTACK_FEES } from '@/lib/constants';
import { Hostel, HostelRoom } from '@/lib/types';
import { ArrowLeft, Check, ShieldCheck, BedDouble, Users, CreditCard, User, Phone, Hash, AlertCircle } from 'lucide-react-native';
import PaystackModal from '@/components/PaystackModal';
import ProtectedBookingBadge from '@/components/ProtectedBookingBadge';

const YEAR_MONTHS = 12;

function getOccupants(roomType: string): number {
  const r = roomType.toLowerCase();
  if (r.includes('self-contained') || r.includes('self contained') || r.includes('studio')) return 1;
  if (r.includes('4') || r.includes('quad')) return 4;
  if (r.includes('3') || r.includes('triple')) return 3;
  if (r.includes('chamber') || r.includes('single')) return 1;
  return 2;
}

function getDisplayName(roomType: string, occupants: number): string {
  const r = roomType.toLowerCase();
  if (r.includes('self-contained') || r.includes('self contained') || r.includes('studio')) return 'Self-Contained (1 Person)';
  if (occupants === 1) return `${roomType} (1 Person)`;
  return `${occupants} in a Room`;
}

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hostelId = (params.hostel_id || params.id) as string;
  const roomId = params.room_id as string | undefined;

  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);
  const [step, setStep] = useState<'room' | 'pay'>('room');
  const [fullName, setFullName] = useState('');
  const [indexNumber, setIndexNumber] = useState('');
  const [telephone, setTelephone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [utilityView, setUtilityView] = useState<'included' | 'not_included'>('included');

  useEffect(() => {
    if (hostelId) fetchHostel();
  }, [hostelId]);

  const fetchHostel = async () => {
    const { data } = await supabase.from('hostels').select('*, hostel_rooms(*), hostel_amenities(*)').eq('id', hostelId).maybeSingle();
    if (data) {
      const raw = data as any;
      const mapped = { ...raw, rooms: raw.hostel_rooms || [], amenities: raw.hostel_amenities || [] };
      setHostel(mapped as Hostel);
      const rooms = raw.hostel_rooms || [];
      if (roomId) {
        const found = rooms.find((r: any) => r.id === roomId);
        if (found) setSelectedRoom(found);
        else if (rooms.length > 0) setSelectedRoom(rooms[0]);
      } else if (rooms.length > 0) {
        setSelectedRoom(rooms[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const prefill = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase.from('members').select('full_name, phone, student_id').eq('id', user.id).maybeSingle();
        if (member) {
          if (member.full_name) setFullName(member.full_name);
          if (member.phone) setTelephone(member.phone);
          if (member.student_id) setIndexNumber(member.student_id);
        }
      }
    };
    prefill();
  }, []);

  const occupants = useMemo(() => selectedRoom ? getOccupants(selectedRoom.room_type) : 1, [selectedRoom]);
  const displayName = useMemo(() => selectedRoom ? getDisplayName(selectedRoom.room_type, occupants) : '', [selectedRoom, occupants]);
  const totalYearPrice = useMemo(() => (selectedRoom?.price_per_month ?? 0) * YEAR_MONTHS, [selectedRoom]);
  const perPersonYear = useMemo(() => occupants > 1 ? Math.round(totalYearPrice / occupants) : totalYearPrice, [totalYearPrice, occupants]);

  const amenityNames = useMemo(() => (hostel?.amenities || []).map((a: any) => (a.amenity || '').toLowerCase()), [hostel?.amenities]);

  const utilityInclusions = useMemo(() => {
    const included: string[] = [];
    const notIncluded: string[] = [];
    if (amenityNames.some(a => a.includes('water') || a.includes('borehole'))) included.push('Water Supply');
    else notIncluded.push('Water Supply');
    if (amenityNames.some(a => a.includes('electricity'))) included.push('Electricity (24hr)');
    else notIncluded.push('Electricity (24hr)');
    if (amenityNames.some(a => a.includes('generator'))) included.push('Generator Backup');
    else notIncluded.push('Generator Backup');
    if (amenityNames.some(a => a.includes('wifi'))) included.push('Internet / WiFi');
    else notIncluded.push('Internet / WiFi');
    return { included, notIncluded };
  }, [amenityNames]);

  const calcPlatformFee = () => Math.round(perPersonYear * PAYSTACK_FEES.PLATFORM_FEE_PERCENT * 100) / 100;
  const calcMomoFee = () => Math.min(
    Math.round(perPersonYear * PAYSTACK_FEES.MOMO_PERCENT * 100) / 100,
    PAYSTACK_FEES.MOMO_CAP_GHS
  );
  const calcGrandTotal = () => {
    const total = perPersonYear + calcPlatformFee() + calcMomoFee();
    return isNaN(total) ? 0 : parseFloat(total.toFixed(2));
  };

  const handleProceedToPay = () => {
    setError('');
    if (!selectedRoom) return setError('No room selected');
    setStep('pay');
  };

  const handleBook = async () => {
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name');
    if (!indexNumber.trim()) return setError('Please enter your index number');
    if (!telephone.trim()) return setError('Please enter your telephone number');

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in to book'); setSubmitting(false); return; }

    const qrCode = `STNEST-${Date.now()}-${user.id.slice(0, 8)}`;
    const today = new Date().toISOString().split('T')[0];
    const yearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: bookingData, error: bookError } = await supabase.from('bookings').insert({
      hostel_id: hostelId,
      room_id: selectedRoom!.id,
      user_id: user.id,
      check_in_date: today,
      check_out_date: yearLater,
      nights: 365,
      total_price: calcGrandTotal(),
      special_requests: specialRequests || null,
      status: 'pending',
      qr_code: qrCode,
      payment_status: 'unpaid',
      platform_fee: calcPlatformFee(),
      processing_fee: calcMomoFee(),
    }).select().single();

    setSubmitting(false);
    if (bookError) return setError(bookError.message);

    setPendingBookingId(bookingData.id);
    setPaymentVisible(true);
  };

  const handlePaymentSuccess = async (ref: string) => {
    setPaymentVisible(false);
    if (!pendingBookingId) return;

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('bookings').update({
      status: 'pending',
      payment_status: 'paid',
      payment_reference: ref,
      paid_at: new Date().toISOString(),
    }).eq('id', pendingBookingId);

    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'booking_confirmed',
        title: 'Booking Submitted',
        message: `Your booking at ${hostel?.name} is pending confirmation.`,
      });
    }

    setSuccess(true);
  };

  const handlePaymentClose = () => {
    setPaymentVisible(false);
    if (pendingBookingId) {
      setShowCancelConfirm(true);
    }
  };

  const confirmCancelBooking = async () => {
    if (pendingBookingId) {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', pendingBookingId);
      setPendingBookingId(null);
    }
    setShowCancelConfirm(false);
  };

  const resumePayment = () => {
    setShowCancelConfirm(false);
    setPaymentVisible(true);
  };

  if (loading) {
    return <View style={styles.container}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Check size={40} color={COLORS.white} />
        </View>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successText}>
          Your payment for {hostel?.name} has been received and is currently being processed by the property owner. You will receive a confirmation notification with your official move-in date and further instructions once acknowledged.
        </Text>

        <View style={styles.strictWarningBox}>
          <AlertCircle size={24} color={COLORS.error} />
          <Text style={styles.strictWarningText}>
            <Text style={{ fontFamily: FONT.bold }}>STRICT REQUIREMENT: </Text>
            You are required to provide a valid Student ID along with your booking QR code upon moving in. Entry may be denied without it.
          </Text>
        </View>

        {hostel?.verified && (
          <View style={styles.successProtectedRow}>
            <ShieldCheck size={16} color={COLORS.success} />
            <Text style={styles.successProtectedText}>This booking is protected by StudentNest</Text>
          </View>
        )}
        <TouchableOpacity style={styles.successBtn} onPress={() => router.replace('/(tabs)/bookings' as any)}>
          <Text style={styles.successBtnText}>View My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (step === 'pay') { setStep('room'); setError(''); }
          else router.back();
        }}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{step === 'room' ? 'Book a Room' : 'Proceed to Pay'}</Text>
        {hostel?.verified && <ProtectedBookingBadge compact />}
      </View>

      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotActive]} />
        <View style={[styles.stepLine, step === 'pay' && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 'pay' && styles.stepDotActive]} />
      </View>

      {step === 'room' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hostelCard}>
            <Text style={styles.hostelName}>{hostel?.name}</Text>
            <Text style={styles.hostelAddr}>{hostel?.campus_proximity}</Text>
          </View>

          {selectedRoom && (
            <View style={styles.selectedRoomCard}>
              <View style={styles.selectedRoomHeader}>
                <BedDouble size={18} color={COLORS.primary} />
                <Text style={styles.selectedRoomTitle}>Selected Room</Text>
              </View>
              <View style={styles.selectedRoomBody}>
                <Text style={styles.selectedRoomName}>{displayName}</Text>
                <View style={styles.selectedRoomPriceRow}>
                  <Text style={styles.selectedRoomPrice}>GH₵{totalYearPrice.toLocaleString()}</Text>
                  <Text style={styles.selectedRoomPriceSub}>/year</Text>
                </View>
                {occupants > 1 && (
                  <View style={styles.selectedRoomSplitRow}>
                    <Users size={14} color={COLORS.primary} />
                    <Text style={styles.selectedRoomSplit}>GH₵{perPersonYear.toLocaleString()} per person ({occupants} occupants)</Text>
                  </View>
                )}
                {selectedRoom.available_count > 0 && (
                  <Text style={styles.selectedRoomAvail}>{selectedRoom.available_count} of {selectedRoom.total_count} available</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.utilitiesCard}>
            <View style={styles.utilitiesHeader}>
              <CreditCard size={18} color={COLORS.primary} />
              <Text style={styles.utilitiesTitle}>What's in the Rent</Text>
            </View>
            <View style={styles.utilityToggleRow}>
              <TouchableOpacity
                style={[styles.utilityToggleBtn, utilityView === 'included' && styles.utilityToggleBtnActive]}
                onPress={() => setUtilityView('included')}
                activeOpacity={0.85}
              >
                <Text style={[styles.utilityToggleBtnText, utilityView === 'included' && styles.utilityToggleBtnTextActive]}>Included</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.utilityToggleBtn, utilityView === 'not_included' && styles.utilityToggleBtnActiveRed]}
                onPress={() => setUtilityView('not_included')}
                activeOpacity={0.85}
              >
                <Text style={[styles.utilityToggleBtnText, utilityView === 'not_included' && styles.utilityToggleBtnTextActiveRed]}>Not Included</Text>
              </TouchableOpacity>
            </View>
            {utilityView === 'included' && (
              utilityInclusions.included.length > 0 ? (
                utilityInclusions.included.map((item, idx) => (
                  <View key={idx} style={styles.utilityRow}>
                    <View style={styles.utilityDotGreen} />
                    <Text style={styles.utilityTextGreen}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.utilityEmpty}>No utilities confirmed as included</Text>
              )
            )}
            {utilityView === 'not_included' && (
              utilityInclusions.notIncluded.length > 0 ? (
                utilityInclusions.notIncluded.map((item, idx) => (
                  <View key={idx} style={styles.utilityRow}>
                    <View style={styles.utilityDotGrey} />
                    <Text style={styles.utilityTextGrey}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.utilityEmpty}>All utilities are included in the rent</Text>
              )
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={handleProceedToPay}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedBtnText}>Proceed to Pay</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {step === 'pay' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.payInfoCard}>
            <Text style={styles.payInfoTitle}>Your Details</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrap}>
                <User size={16} color={COLORS.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); setError(''); }}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrap}>
                <Hash size={16} color={COLORS.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={indexNumber}
                  onChangeText={(v) => { setIndexNumber(v); setError(''); }}
                  placeholder="Index Number"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrap}>
                <Phone size={16} color={COLORS.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={telephone}
                  onChangeText={(v) => { setTelephone(v); setError(''); }}
                  placeholder="Telephone"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Price Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{displayName}</Text>
              <Text style={styles.summaryValue}>GH₵{perPersonYear.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform fee</Text>
              <Text style={styles.summaryValue}>GH₵{calcPlatformFee().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Processing fee</Text>
              <Text style={styles.summaryValue}>GH₵{calcMomoFee().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={styles.summaryTotalValue}>GH₵{calcGrandTotal().toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Special Requests (optional)</Text>
          <TextInput
            style={styles.requestInput}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            placeholder="Any specific requirements..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {hostel?.verified && (
            <View style={styles.protectedRow}>
              <ProtectedBookingBadge />
            </View>
          )}

          <TouchableOpacity
            style={[styles.proceedBtn, submitting && styles.proceedBtnDisabled]}
            onPress={handleBook}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedBtnText}>
              {submitting ? 'Processing...' : `Pay GH₵${calcGrandTotal().toFixed(2)}`}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <PaystackModal
        visible={paymentVisible}
        amount={calcGrandTotal()}
        label={`Booking — ${hostel?.name ?? ''}`}
        onSuccess={handlePaymentSuccess}
        onClose={handlePaymentClose}
      />

      <Modal transparent visible={showCancelConfirm} animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Cancel Booking?</Text>
            <Text style={styles.confirmText}>
              Your booking has not been paid yet. Would you like to resume payment or cancel the booking?
            </Text>
            <TouchableOpacity style={styles.confirmResumeBtn} onPress={resumePayment}>
              <Text style={styles.confirmResumeBtnText}>Resume Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={confirmCancelBooking}>
              <Text style={styles.confirmCancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 100, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    gap: 0,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.border,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },

  content: { padding: SPACING.md },

  hostelCard: { backgroundColor: COLORS.navy, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  hostelName: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.white, marginBottom: 4 },
  hostelAddr: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  selectedRoomCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectedRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  selectedRoomTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  selectedRoomBody: { gap: 4 },
  selectedRoomName: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectedRoomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  selectedRoomPrice: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.primary,
  },
  selectedRoomPriceSub: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  selectedRoomSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  selectedRoomSplit: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.primary,
  },
  selectedRoomAvail: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.success,
    marginTop: 4,
  },

  utilitiesCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  utilitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  utilitiesTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  utilityToggleRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  utilityToggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  utilityToggleBtnActive: {
    backgroundColor: COLORS.success,
  },
  utilityToggleBtnActiveRed: {
    backgroundColor: COLORS.error,
  },
  utilityToggleBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  utilityToggleBtnTextActive: {
    color: COLORS.white,
  },
  utilityToggleBtnTextActiveRed: {
    color: COLORS.white,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 8,
  },
  utilityDotGreen: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success,
  },
  utilityTextGreen: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  utilityDotGrey: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textTertiary,
  },
  utilityTextGrey: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  utilityEmpty: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },

  payInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  payInfoTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
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
    height: 48,
    paddingHorizontal: SPACING.sm + 4,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    height: '100%',
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  summaryTotal: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  summaryTotalValue: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: COLORS.primary,
  },

  sectionTitle: { fontFamily: FONT.heading, fontSize: 16, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },

  requestInput: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },

  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error, marginBottom: SPACING.sm },
  protectedRow: { marginBottom: SPACING.md },

  proceedBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  proceedBtnDisabled: { opacity: 0.6 },
  proceedBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  successTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  successText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  
  strictWarningBox: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.error}10`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    alignItems: 'flex-start',
    gap: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  strictWarningText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 20,
  },

  successProtectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  successProtectedText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.success },
  successBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md },
  successBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  confirmCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 360 },
  confirmTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  confirmText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.lg },
  confirmResumeBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginBottom: SPACING.sm },
  confirmResumeBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
  confirmCancelBtn: { borderWidth: 1.5, borderColor: COLORS.error, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  confirmCancelBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.error },
});