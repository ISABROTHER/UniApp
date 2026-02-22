import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Animated, Easing, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Booking } from '@/lib/types';
import {
  X, QrCode, CheckCircle, AlertCircle, Building2,
  MapPin, Calendar, User, Zap,
} from 'lucide-react-native';

type ScanState = 'scanning' | 'found' | 'checking_in' | 'success' | 'error';

interface ScannedBooking extends Booking {
  hostel?: { name: string; address: string; campus_proximity: string };
  member?: { full_name: string; email: string };
}

export default function QRScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedBooking, setScannedBooking] = useState<ScannedBooking | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanned, setScanned] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(false);

  // Scanning line animation
  const scanLineY = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    const scanAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanLineY, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    scanAnim.start();
    return () => scanAnim.stop();
  }, []);

  const slideResultIn = () => {
    Animated.spring(resultSlide, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }).start();
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    const qrValue = result.data;

    setScanState('found');
    slideResultIn();

    // Look up the booking by qr_code
    const { data, error } = await supabase
      .from('bookings')
      .select('*, hostels(name, address, campus_proximity), members:user_id(full_name, email)')
      .eq('qr_code', qrValue)
      .maybeSingle();

    if (error || !data) {
      setScanState('error');
      setErrorMsg('No booking found for this QR code. It may be invalid or expired.');
      return;
    }

    setScannedBooking(data as ScannedBooking);
    setScanState('found');
  };

  const handleCheckIn = async () => {
    if (!scannedBooking) return;
    setScanState('checking_in');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setScanState('error'); setErrorMsg('Not authenticated.'); return; }

    const now = new Date().toISOString();

    const isAlreadyIn = scannedBooking.status === 'checked_in';

    await Promise.all([
      // Update booking status
      supabase.from('bookings').update({
        status: isAlreadyIn ? 'completed' : 'checked_in',
        updated_at: now,
      }).eq('id', scannedBooking.id),

      // Upsert check_in record
      supabase.from('check_ins').upsert({
        booking_id: scannedBooking.id,
        user_id: scannedBooking.user_id,
        qr_code: scannedBooking.qr_code,
        status: isAlreadyIn ? 'checked_out' : 'checked_in',
        check_in_time: isAlreadyIn ? undefined : now,
        check_out_time: isAlreadyIn ? now : undefined,
      }, { onConflict: 'booking_id' }),

      // Notify student
      supabase.from('notifications').insert({
        user_id: scannedBooking.user_id,
        type: isAlreadyIn ? 'booking_checked_out' : 'booking_checked_in',
        title: isAlreadyIn ? 'Checked Out' : '✅ Checked In!',
        message: isAlreadyIn
          ? `You have checked out of ${(scannedBooking as any).hostels?.name}.`
          : `Welcome! You've successfully checked in to ${(scannedBooking as any).hostels?.name}.`,
        read: false,
      }),

      // Audit log
      supabase.from('audit_logs').insert({
        user_id: user.id,
        action: isAlreadyIn ? 'check_out' : 'check_in',
        entity_type: 'booking',
        entity_id: scannedBooking.id,
        metadata: { qr_code: scannedBooking.qr_code, platform: Platform.OS },
      }),
    ]);

    setScanState('success');
    Animated.spring(successScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  };

  const resetScan = () => {
    setScanned(false);
    setScannedBooking(null);
    setErrorMsg('');
    setScanState('scanning');
    resultSlide.setValue(300);
    successScale.setValue(0);
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permCenter]}>
        <View style={styles.permCard}>
          <View style={styles.permIconBox}>
            <QrCode size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permText}>
            To scan QR codes for check-in, please grant camera access.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permBack} onPress={() => router.back()}>
            <Text style={styles.permBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const scanLineTranslate = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const hostels = (scannedBooking as any)?.hostels;
  const member = (scannedBooking as any)?.members;
  const isAlreadyIn = scannedBooking?.status === 'checked_in';

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.viewfinder}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {/* Animated scan line */}
            {scanState === 'scanning' && (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]} />
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <X size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Check-In</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Instruction */}
      {scanState === 'scanning' && (
        <View style={styles.instructionBox}>
          <QrCode size={16} color={COLORS.white} />
          <Text style={styles.instructionText}>Point at the booking QR code</Text>
        </View>
      )}

      {/* Result sheet */}
      {(scanState !== 'scanning') && (
        <Animated.View style={[styles.resultSheet, { transform: [{ translateY: resultSlide }] }]}>
          <View style={styles.sheetHandle} />

          {/* ERROR */}
          {scanState === 'error' && (
            <View style={styles.errorBox}>
              <View style={styles.errorIconBox}>
                <AlertCircle size={32} color={COLORS.error} />
              </View>
              <Text style={styles.errorTitle}>Invalid QR Code</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={resetScan}>
                <Text style={styles.retryBtnText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* FOUND */}
          {(scanState === 'found') && scannedBooking && (
            <>
              <View style={styles.foundHeader}>
                <View style={[styles.statusPill, { backgroundColor: isAlreadyIn ? `${COLORS.warning}18` : `${COLORS.success}18` }]}>
                  <View style={[styles.statusDot, { backgroundColor: isAlreadyIn ? COLORS.warning : COLORS.success }]} />
                  <Text style={[styles.statusPillText, { color: isAlreadyIn ? COLORS.warning : COLORS.success }]}>
                    {isAlreadyIn ? 'Already Checked In — Check Out?' : 'Ready to Check In'}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                  <Building2 size={16} color={COLORS.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCardLabel}>Property</Text>
                    <Text style={styles.bookingCardValue}>{hostels?.name || 'Hostel'}</Text>
                  </View>
                </View>
                <View style={styles.bookingDivider} />
                <View style={styles.bookingRow}>
                  <User size={16} color={COLORS.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCardLabel}>Guest</Text>
                    <Text style={styles.bookingCardValue}>{member?.full_name || 'Student'}</Text>
                    <Text style={styles.bookingCardSub}>{member?.email}</Text>
                  </View>
                </View>
                <View style={styles.bookingDivider} />
                <View style={styles.bookingRow}>
                  <MapPin size={16} color={COLORS.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCardLabel}>Location</Text>
                    <Text style={styles.bookingCardValue}>{hostels?.campus_proximity || hostels?.address || '—'}</Text>
                  </View>
                </View>
                <View style={styles.bookingDivider} />
                <View style={styles.bookingRow}>
                  <Calendar size={16} color={COLORS.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCardLabel}>Period</Text>
                    <Text style={styles.bookingCardValue}>{scannedBooking.check_in_date} → {scannedBooking.check_out_date}</Text>
                    <Text style={styles.bookingCardSub}>{scannedBooking.nights} nights · GH₵{scannedBooking.total_price.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.bookingDivider} />
                <View style={styles.bookingRow}>
                  <Zap size={16} color={COLORS.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCardLabel}>QR Reference</Text>
                    <Text style={[styles.bookingCardValue, { fontFamily: FONT.bold, letterSpacing: 1, fontSize: 12 }]}>
                      {scannedBooking.qr_code}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={resetScan}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkInBtn, { backgroundColor: isAlreadyIn ? COLORS.warning : COLORS.success }]}
                  onPress={handleCheckIn}
                >
                  <CheckCircle size={18} color={COLORS.white} />
                  <Text style={styles.checkInBtnText}>
                    {isAlreadyIn ? 'Confirm Check-Out' : 'Confirm Check-In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* CHECKING IN */}
          {scanState === 'checking_in' && (
            <View style={styles.loadingBox}>
              <View style={styles.loadingIconBox}>
                <QrCode size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.loadingTitle}>Processing...</Text>
              <Text style={styles.loadingText}>Updating check-in status</Text>
            </View>
          )}

          {/* SUCCESS */}
          {scanState === 'success' && (
            <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }] }]}>
              <View style={[styles.successIconCircle, { backgroundColor: isAlreadyIn ? `${COLORS.warning}18` : COLORS.successLight }]}>
                <CheckCircle size={44} color={isAlreadyIn ? COLORS.warning : COLORS.success} />
              </View>
              <Text style={styles.successTitle}>
                {isAlreadyIn ? 'Checked Out!' : 'Checked In!'}
              </Text>
              <Text style={styles.successText}>
                {member?.full_name || 'Guest'} has been {isAlreadyIn ? 'checked out of' : 'checked in to'}{' '}
                {hostels?.name || 'the property'}.
              </Text>
              <Text style={styles.successTime}>
                {new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={styles.successActions}>
                <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
                  <QrCode size={16} color={COLORS.primary} />
                  <Text style={styles.scanAgainText}>Scan Another</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.62)';
const VF_SIZE = 240;
const CORNER_SIZE = 22;
const CORNER_THICK = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permCenter: { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  permCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', width: '100%', maxWidth: 360 },
  permIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  permTitle: { fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  permText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: RADIUS.full, marginBottom: SPACING.sm, width: '100%', alignItems: 'center' },
  permBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
  permBack: { paddingVertical: 10 },
  permBackText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 20,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.white },

  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { flexDirection: 'row', height: VF_SIZE },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayBottom: { flex: 2, backgroundColor: OVERLAY_COLOR },
  viewfinder: {
    width: VF_SIZE, height: VF_SIZE,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },

  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderColor: COLORS.primary, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderColor: COLORS.primary, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderColor: COLORS.primary, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderColor: COLORS.primary, borderBottomRightRadius: 6 },

  scanLine: {
    position: 'absolute', left: 8, right: 8, height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },

  instructionBox: {
    position: 'absolute',
    bottom: 340,
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  instructionText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.white },

  resultSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: SPACING.lg, paddingBottom: 40,
    maxHeight: '72%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },

  errorBox: { alignItems: 'center', paddingVertical: SPACING.md },
  errorIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.errorLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  errorTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  errorText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: RADIUS.full },
  retryBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  foundHeader: { marginBottom: SPACING.sm },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontFamily: FONT.semiBold, fontSize: 12 },

  bookingCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.md },
  bookingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md },
  bookingDivider: { height: 1, backgroundColor: COLORS.borderLight },
  bookingCardLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginBottom: 2 },
  bookingCardValue: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  bookingCardSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  sheetActions: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textSecondary },
  checkInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.md, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  checkInBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  loadingBox: { alignItems: 'center', paddingVertical: SPACING.lg },
  loadingIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  loadingTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: 6 },
  loadingText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },

  successBox: { alignItems: 'center', paddingVertical: SPACING.md },
  successIconCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  successTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.sm },
  successTime: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textTertiary, marginTop: 6, marginBottom: SPACING.lg },
  successActions: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  scanAgainBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary },
  scanAgainText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary },
  doneBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 13, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
});