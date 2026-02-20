import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel, HostelRoom } from '@/lib/types';
import { ArrowLeft, Calendar, ChevronDown, Check } from 'lucide-react-native';

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hostelId = params.id as string;

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
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const calcTotal = () => {
    if (!selectedRoom) return 0;
    const nights = calcNights();
    if (nights === 0) return 0;
    const monthlyRate = selectedRoom.price_per_month;
    return parseFloat(((monthlyRate / 30) * nights).toFixed(2));
  };

  const handleBook = async () => {
    setError('');
    if (!selectedRoom) return setError('Select a room type');
    if (!checkIn) return setError('Select check-in date');
    if (!checkOut) return setError('Select check-out date');
    if (calcNights() < 1) return setError('Check-out must be after check-in');

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in to book'); setSubmitting(false); return; }

    const qrCode = `STNEST-${Date.now()}-${user.id.slice(0, 8)}`;

    const { error: bookError } = await supabase.from('bookings').insert({
      hostel_id: hostelId,
      room_id: selectedRoom.id,
      user_id: user.id,
      check_in_date: checkIn,
      check_out_date: checkOut,
      nights: calcNights(),
      total_price: calcTotal(),
      special_requests: specialRequests || null,
      status: 'pending',
      qr_code: qrCode,
    });

    setSubmitting(false);
    if (bookError) return setError(bookError.message);

    await supabase.from('notifications').insert({
      user_id: user.id, type: 'booking_confirmed',
      title: 'Booking Submitted', body: `Your booking at ${hostel?.name} is pending confirmation.`,
    });

    setSuccess(true);
  };

  if (loading) {
    return <View style={styles.container}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}><Check size={40} color={COLORS.white} /></View>
        <Text style={styles.successTitle}>Booking Submitted!</Text>
        <Text style={styles.successText}>Your booking at {hostel?.name} is pending confirmation. You'll receive a notification once confirmed.</Text>
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
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hostelCard}>
          <Text style={styles.hostelName}>{hostel?.name}</Text>
          <Text style={styles.hostelAddr}>{hostel?.campus_proximity}</Text>
        </View>

        <Text style={styles.sectionTitle}>Room Type</Text>
        {rooms.map((room) => (
          <TouchableOpacity key={room.id} style={[styles.roomCard, selectedRoom?.id === room.id && styles.roomCardActive]} onPress={() => setSelectedRoom(room)}>
            <View style={styles.roomInfo}>
              <Text style={styles.roomType}>{room.room_type}</Text>
              <Text style={styles.roomDesc}>{room.description}</Text>
              <Text style={styles.roomAvail}>{room.available_count} available</Text>
            </View>
            <View style={styles.roomPriceCol}>
              <Text style={styles.roomPrice}>GH₵{room.price_per_month.toLocaleString()}</Text>
              <Text style={styles.roomPriceSub}>/month</Text>
            </View>
            {selectedRoom?.id === room.id && <Check size={16} color={COLORS.primary} />}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Dates</Text>
        <View style={styles.datesRow}>
          <View style={styles.dateInput}>
            <Text style={styles.dateLabel}>Check-in</Text>
            <View style={styles.dateField}>
              <Calendar size={16} color={COLORS.textSecondary} />
              <TextInput
                style={styles.dateText}
                value={checkIn}
                onChangeText={setCheckIn}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
          <View style={styles.dateInput}>
            <Text style={styles.dateLabel}>Check-out</Text>
            <View style={styles.dateField}>
              <Calendar size={16} color={COLORS.textSecondary} />
              <TextInput
                style={styles.dateText}
                value={checkOut}
                onChangeText={setCheckOut}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {calcNights() > 0 && selectedRoom && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Price Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{calcNights()} nights × GH₵{(selectedRoom.price_per_month / 30).toFixed(0)}/night</Text>
              <Text style={styles.summaryValue}>GH₵{calcTotal()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>GH₵{calcTotal()}</Text>
            </View>
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

        <TouchableOpacity style={[styles.bookBtn, submitting && styles.bookBtnDisabled]} onPress={handleBook} disabled={submitting} activeOpacity={0.8}>
          <Text style={styles.bookBtnText}>{submitting ? 'Booking...' : 'Confirm Booking'}</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  loadingText: { textAlign: 'center', marginTop: 100, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },
  content: { padding: SPACING.md },

  hostelCard: { backgroundColor: COLORS.navy, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  hostelName: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.white, marginBottom: 4 },
  hostelAddr: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  sectionTitle: { fontFamily: FONT.heading, fontSize: 16, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  roomCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border, gap: SPACING.sm },
  roomCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  roomInfo: { flex: 1 },
  roomType: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  roomDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  roomAvail: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  roomPriceCol: { alignItems: 'flex-end' },
  roomPrice: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.primary },
  roomPriceSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  datesRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  dateInput: { flex: 1 },
  dateLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6 },
  dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.sm, height: 46, gap: 6 },
  dateText: { flex: 1, fontFamily: FONT.regular, fontSize: 13, color: COLORS.textPrimary },

  summary: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  summaryTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },
  summaryTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4 },
  summaryTotalLabel: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.textPrimary },
  summaryTotalValue: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.primary },

  requestInput: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: SPACING.md },

  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error, marginBottom: SPACING.sm },
  bookBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', elevation: 3, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  successTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  successBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md },
  successBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
});
