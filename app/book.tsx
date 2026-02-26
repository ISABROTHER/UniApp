import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, GHANA_RENT_ACT, PAYSTACK_FEES } from '@/lib/constants';
import { Hostel, HostelRoom } from '@/lib/types';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react-native';
import PaystackModal from '@/components/PaystackModal';
import RentActDisclosure from '@/components/RentActDisclosure';
import SemesterDatePicker from '@/components/SemesterDatePicker';
import ProtectedBookingBadge from '@/components/ProtectedBookingBadge';

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hostelId = (params.hostel_id || params.id) as string;

  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (hostelId) fetchHostel();
  }, [hostelId]);

  const fetchHostel = async () => {
    const { data } = await supabase.from('hostels').select('*, hostel_rooms(*)').eq('id', hostelId).maybeSingle();
    if (data) {
      setHostel(data as Hostel);
      const r = (data as any).hostel_rooms || [];
      setRooms(r);
      if (r.length > 0) setSelectedRoom(r[0]);
    }
    setLoading(false);
  };

  const calcNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const calcRoomTotal = () => {
    if (!selectedRoom) return 0;
    const nights = calcNights();
    if (nights === 0) return 0;
    const pricePerMonth = selectedRoom.price_per_month ?? 0;
    return parseFloat(((pricePerMonth / 30) * nights).toFixed(2));
  };

  const calcPlatformFee = () => Math.round(calcRoomTotal() * PAYSTACK_FEES.PLATFORM_FEE_PERCENT * 100) / 100;
  const calcMomoFee = () => Math.min(
    Math.round(calcRoomTotal() * PAYSTACK_FEES.MOMO_PERCENT * 100) / 100,
    PAYSTACK_FEES.MOMO_CAP_GHS
  );
  const calcGrandTotal = () => {
    const total = calcRoomTotal() + calcPlatformFee() + calcMomoFee();
    return isNaN(total) ? 0 : parseFloat(total.toFixed(2));
  };

  const exceeds6Months = calcNights() > GHANA_RENT_ACT.MAX_ADVANCE_DAYS;

  const handleBook = async () => {
    setError('');
    if (!selectedRoom) return setError('Select a room type');
    if (!checkIn) return setError('Select check-in date');
    if (!checkOut) return setError('Select check-out date');
    if (calcNights() < 1) return setError('Check-out must be after check-in');
    if (exceeds6Months) return setError(`Bookings cannot exceed ${GHANA_RENT_ACT.MAX_ADVANCE_MONTHS} months advance rent (${GHANA_RENT_ACT.ACT_REFERENCE})`);

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in to book'); setSubmitting(false); return; }

    const qrCode = `STNEST-${Date.now()}-${user.id.slice(0, 8)}`;

    const { data: bookingData, error: bookError } = await supabase.from('bookings').insert({
      hostel_id: hostelId,
      room_id: selectedRoom.id,
      user_id: user.id,
      check_in_date: checkIn,
      check_out_date: checkOut,
      nights: calcNights(),
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

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
        <Text style={styles.successTitle}>Booking Submitted!</Text>
        <Text style={styles.successText}>
          Your booking at {hostel?.name} is pending confirmation. You'll receive a notification once confirmed.
        </Text>
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Room</Text>
        {hostel?.verified && <ProtectedBookingBadge compact />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hostelCard}>
          <Text style={styles.hostelName}>{hostel?.name}</Text>
          <Text style={styles.hostelAddr}>{hostel?.campus_proximity}</Text>
        </View>

        <Text style={styles.sectionTitle}>Room Type</Text>
        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={[styles.roomCard, selectedRoom?.id === room.id && styles.roomCardActive]}
            onPress={() => setSelectedRoom(room)}
          >
            <View style={styles.roomInfo}>
              <Text style={styles.roomType}>{room.room_type}</Text>
              <Text style={styles.roomDesc}>{room.description}</Text>
              <Text style={styles.roomAvail}>{room.available_count} available</Text>
            </View>
            <View style={styles.roomPriceCol}>
              <Text style={styles.roomPrice}>GH₵{(room.price_per_month ?? 0).toLocaleString()}</Text>
              <Text style={styles.roomPriceSub}>/month</Text>
            </View>
            {selectedRoom?.id === room.id && <Check size={16} color={COLORS.primary} />}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Dates</Text>
        <SemesterDatePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
        />

        {calcNights() > 0 && selectedRoom && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Price Summary</Text>
            <RentActDisclosure
              totalPrice={calcRoomTotal()}
              nights={calcNights()}
              exceeds6Months={exceeds6Months}
            />
          </View>
        )}

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
          style={[styles.bookBtn, (submitting || exceeds6Months) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={submitting || exceeds6Months}
          activeOpacity={0.8}
        >
          <Text style={styles.bookBtnText}>
            {submitting ? 'Creating Booking...' : calcNights() > 0 ? `Pay GH₵${calcGrandTotal().toFixed(2)}` : 'Confirm Booking'}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>

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
  content: { padding: SPACING.md, gap: 0 },

  hostelCard: { backgroundColor: COLORS.navy, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  hostelName: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.white, marginBottom: 4 },
  hostelAddr: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  sectionTitle: { fontFamily: FONT.heading, fontSize: 16, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  roomCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  roomInfo: { flex: 1 },
  roomType: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  roomDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  roomAvail: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  roomPriceCol: { alignItems: 'flex-end' },
  roomPrice: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.primary },
  roomPriceSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  summarySection: { marginTop: SPACING.xs },

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

  bookBtn: {
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
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  successTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.md },
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