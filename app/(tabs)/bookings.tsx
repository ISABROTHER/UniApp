import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  RefreshControl, Modal, Animated, Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Booking } from '@/lib/types';
import QRCode from '@/components/QRCode';
import {
  CalendarCheck, MapPin, QrCode, ChevronRight, Clock,
  X, Share2, ScanLine, CheckCircle, AlertCircle,
  Building2, Calendar, ArrowRight, RotateCcw,
} from 'lucide-react-native';

function StatusBadge({ status }: { status: string }) {
  const color = BOOKING_STATUS_COLORS[status] || COLORS.textSecondary;
  const label = status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

const TABS = ['All', 'Pending', 'Confirmed', 'Checked In', 'Completed', 'Cancelled'];

interface QRModalState {
  visible: boolean;
  booking: Booking & { hostel?: any } | null;
}

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<(Booking & { hostel?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [qrModal, setQrModal] = useState<QRModalState>({ visible: false, booking: null });
  const qrScale = useRef(new Animated.Value(0.8)).current;
  const qrOpacity = useRef(new Animated.Value(0)).current;

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('bookings')
        .select('*, hostels(name, address, campus_proximity, hostel_images(url))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setBookings((data || []) as (Booking & { hostel?: any })[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchBookings(); }, []));

  const openQR = (booking: Booking & { hostel?: any }) => {
    setQrModal({ visible: true, booking });
    Animated.parallel([
      Animated.spring(qrScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(qrOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeQR = () => {
    Animated.parallel([
      Animated.timing(qrScale, { toValue: 0.8, duration: 160, useNativeDriver: true }),
      Animated.timing(qrOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setQrModal({ visible: false, booking: null }));
  };

  const shareQR = async (booking: Booking & { hostel?: any }) => {
    try {
      await Share.share({
        message: `My UCC Housing booking QR: ${booking.qr_code}\nProperty: ${booking.hostel?.name || 'Hostel'}\nCheck-in: ${booking.check_in_date}`,
        title: 'My Booking QR Code',
      });
    } catch {}
  };

  const tabFilter = (t: string) => {
    if (t === 'All') return true;
    const map: Record<string, string> = {
      'Pending': 'pending', 'Confirmed': 'confirmed',
      'Checked In': 'checked_in', 'Completed': 'completed', 'Cancelled': 'cancelled',
    };
    return (b: Booking) => b.status === map[t];
  };

  const filtered = activeTab === 'All'
    ? bookings
    : bookings.filter((b) => {
        const map: Record<string, string> = {
          'Pending': 'pending', 'Confirmed': 'confirmed',
          'Checked In': 'checked_in', 'Completed': 'completed', 'Cancelled': 'cancelled',
        };
        return b.status === map[activeTab];
      });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

  const qrColor = (status: string) => {
    if (status === 'confirmed') return COLORS.navy;
    if (status === 'checked_in') return COLORS.info;
    if (status === 'completed') return COLORS.textSecondary;
    return COLORS.navy;
  };

  const b = qrModal.booking;
  const hostel = (b as any)?.hostels;

  return (
    <View style={styles.container}>
      {/* Header + Tabs */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>My Bookings</Text>
          {/* Owner scan button */}
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push('/qr-scan' as any)}
            activeOpacity={0.8}
          >
            <ScanLine size={16} color={COLORS.white} />
            <Text style={styles.scanBtnText}>Scan</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)} activeOpacity={0.7}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {filtered.length === 0 && !loading && (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconBg}>
              <CalendarCheck size={36} color={COLORS.textTertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Browse hostels and book your ideal room for the upcoming semester.</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)' as any)} activeOpacity={0.8}>
              <Text style={styles.browseBtnText}>Browse Hostels</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.map((booking) => {
          const hostel = (booking as any).hostels;
          const canShowQR = ['confirmed', 'checked_in'].includes(booking.status) && booking.qr_code;
          return (
            <View key={booking.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.hostelName} numberOfLines={1}>{hostel?.name || 'Hostel'}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={COLORS.textSecondary} />
                    <Text style={styles.locationText} numberOfLines={1}>{hostel?.campus_proximity || hostel?.address}</Text>
                  </View>
                </View>
                <StatusBadge status={booking.status} />
              </View>

              <View style={styles.datesRow}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>Check-in</Text>
                  <Text style={styles.dateValue}>{formatDate(booking.check_in_date)}</Text>
                </View>
                <View style={styles.dateDivider}>
                  <Clock size={14} color={COLORS.textTertiary} />
                  <Text style={styles.nightsText}>{booking.nights} nights</Text>
                </View>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>Check-out</Text>
                  <Text style={styles.dateValue}>{formatDate(booking.check_out_date)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>GH₵{booking.total_price.toLocaleString()}</Text>
                </View>
                <View style={styles.footerActions}>
                  {canShowQR && (
                    <TouchableOpacity style={styles.qrBtn} onPress={() => openQR(booking)} activeOpacity={0.7}>
                      <QrCode size={15} color={COLORS.primary} />
                      <Text style={styles.qrBtnText}>QR Code</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.detailBtn} onPress={() => router.push(`/detail?id=${booking.hostel_id}` as any)} activeOpacity={0.7}>
                    <Text style={styles.detailBtnText}>View</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pending check-in tip */}
              {booking.status === 'confirmed' && (
                <View style={styles.checkInTip}>
                  <CheckCircle size={13} color={COLORS.success} />
                  <Text style={styles.checkInTipText}>Show your QR code at the property to check in</Text>
                </View>
              )}
              {booking.status === 'checked_in' && (
                <View style={[styles.checkInTip, { backgroundColor: `${COLORS.info}10` }]}>
                  <AlertCircle size={13} color={COLORS.info} />
                  <Text style={[styles.checkInTipText, { color: COLORS.info }]}>You are currently checked in</Text>
                </View>
              )}
              {booking.status === 'completed' && (
                <TouchableOpacity
                  style={styles.rebookBtn}
                  onPress={() => router.push(`/detail?id=${booking.hostel_id}` as any)}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={13} color={COLORS.primary} />
                  <Text style={styles.rebookBtnText}>Rebook for Next Semester</Text>
                  <ArrowRight size={13} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ─── QR CODE MODAL ─── */}
      <Modal visible={qrModal.visible} transparent animationType="none" onRequestClose={closeQR}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeQR}>
          <Animated.View
            style={[styles.qrModalCard, { transform: [{ scale: qrScale }], opacity: qrOpacity }]}
          >
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              {/* Header */}
              <View style={styles.qrModalHeader}>
                <View style={styles.qrModalHeaderLeft}>
                  <Building2 size={16} color={COLORS.accent} />
                  <View>
                    <Text style={styles.qrModalHostel} numberOfLines={1}>{hostel?.name || 'Booking'}</Text>
                    <Text style={styles.qrModalLocation} numberOfLines={1}>{hostel?.campus_proximity || hostel?.address || ''}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.qrCloseBtn} onPress={closeQR}>
                  <X size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Status strip */}
              {b && (
                <View style={[styles.qrStatusStrip, { backgroundColor: `${BOOKING_STATUS_COLORS[b.status] || COLORS.textSecondary}12` }]}>
                  <View style={[styles.qrStatusDot, { backgroundColor: BOOKING_STATUS_COLORS[b.status] || COLORS.textSecondary }]} />
                  <Text style={[styles.qrStatusText, { color: BOOKING_STATUS_COLORS[b.status] || COLORS.textSecondary }]}>
                    {b.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </View>
              )}

              {/* QR Code */}
              <View style={styles.qrCodeWrapper}>
                <View style={styles.qrCodeInner}>
                  {b?.qr_code && (
                    <QRCode
                      value={b.qr_code}
                      size={200}
                      color={qrColor(b.status)}
                      bg="#FFFFFF"
                      quietZone={2}
                    />
                  )}
                </View>
                {/* Corner decorations */}
                <View style={[styles.qrCorner, styles.qrCornerTL]} />
                <View style={[styles.qrCorner, styles.qrCornerTR]} />
                <View style={[styles.qrCorner, styles.qrCornerBL]} />
                <View style={[styles.qrCorner, styles.qrCornerBR]} />
              </View>

              {/* QR Code value */}
              {b?.qr_code && (
                <Text style={styles.qrValue}>{b.qr_code}</Text>
              )}

              {/* Booking details */}
              {b && (
                <View style={styles.qrDetails}>
                  <View style={styles.qrDetailRow}>
                    <Calendar size={13} color={COLORS.textSecondary} />
                    <Text style={styles.qrDetailText}>{formatDate(b.check_in_date)} → {formatDate(b.check_out_date)}</Text>
                  </View>
                  <View style={styles.qrDetailRow}>
                    <Clock size={13} color={COLORS.textSecondary} />
                    <Text style={styles.qrDetailText}>{b.nights} nights · GH₵{b.total_price.toLocaleString()}</Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.qrActions}>
                <TouchableOpacity
                  style={styles.qrShareBtn}
                  onPress={() => b && shareQR(b)}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color={COLORS.primary} />
                  <Text style={styles.qrShareBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qrScanBtn}
                  onPress={() => { closeQR(); setTimeout(() => router.push('/qr-scan' as any), 300); }}
                  activeOpacity={0.8}
                >
                  <ScanLine size={16} color={COLORS.white} />
                  <Text style={styles.qrScanBtnText}>Owner Scan</Text>
                  <ArrowRight size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.qrTip}>Present this QR code at the property reception</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const QR_CORNER_SIZE = 18;
const QR_CORNER_THICK = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' },

  headerContainer: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, zIndex: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  pageTitle: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
  },
  scanBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  tabsScroll: { maxHeight: 52, marginBottom: SPACING.sm },
  tabsContainer: { paddingHorizontal: SPACING.md, gap: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'transparent' },
  tabActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white, fontFamily: FONT.semiBold },

  scrollContent: { padding: SPACING.md, paddingBottom: Platform.OS === 'ios' ? 120 : 100 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  cardHeaderLeft: { flex: 1, marginRight: SPACING.sm },
  hostelName: { fontFamily: FONT.semiBold, fontSize: 17, color: COLORS.textPrimary, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FONT.semiBold, fontSize: 11 },

  datesRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  dateBlock: { flex: 1, alignItems: 'center' },
  dateLabel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginBottom: 4 },
  dateValue: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  dateDivider: { alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm },
  nightsText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  totalAmount: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.primary },
  footerActions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  qrBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  detailBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary },

  checkInTip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${COLORS.success}10`, borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: SPACING.sm,
  },
  checkInTipText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.success, flex: 1 },

  rebookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  rebookBtnText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.primary, flex: 1 },

  emptyStateCard: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: RADIUS.xl, padding: SPACING.xl, marginTop: SPACING.xl,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4,
  },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  browseBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.full, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  browseBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  // QR Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.md,
  },
  qrModalCard: {
    backgroundColor: COLORS.white, borderRadius: 28, padding: SPACING.lg,
    width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 20,
  },
  qrModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  qrModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  qrModalHostel: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  qrModalLocation: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  qrCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  qrStatusStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: SPACING.md },
  qrStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  qrStatusText: { fontFamily: FONT.semiBold, fontSize: 12 },

  qrCodeWrapper: {
    alignItems: 'center', justifyContent: 'center',
    padding: 16, position: 'relative',
    marginBottom: SPACING.sm,
  },
  qrCodeInner: {
    backgroundColor: COLORS.white, padding: 8, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  qrCorner: { position: 'absolute', width: QR_CORNER_SIZE, height: QR_CORNER_SIZE },
  qrCornerTL: { top: 8, left: 8, borderTopWidth: QR_CORNER_THICK, borderLeftWidth: QR_CORNER_THICK, borderColor: COLORS.primary, borderTopLeftRadius: 5 },
  qrCornerTR: { top: 8, right: 8, borderTopWidth: QR_CORNER_THICK, borderRightWidth: QR_CORNER_THICK, borderColor: COLORS.primary, borderTopRightRadius: 5 },
  qrCornerBL: { bottom: 8, left: 8, borderBottomWidth: QR_CORNER_THICK, borderLeftWidth: QR_CORNER_THICK, borderColor: COLORS.primary, borderBottomLeftRadius: 5 },
  qrCornerBR: { bottom: 8, right: 8, borderBottomWidth: QR_CORNER_THICK, borderRightWidth: QR_CORNER_THICK, borderColor: COLORS.primary, borderBottomRightRadius: 5 },

  qrValue: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.textTertiary, textAlign: 'center', letterSpacing: 1.5, marginBottom: SPACING.md },

  qrDetails: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.sm, gap: 6, marginBottom: SPACING.md },
  qrDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrDetailText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },

  qrActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  qrShareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  qrShareBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary },
  qrScanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.navy,
  },
  qrScanBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },

  qrTip: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, textAlign: 'center' },
}); 