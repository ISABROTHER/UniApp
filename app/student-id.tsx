import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Image,
  Easing,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Check, Fingerprint, Ticket } from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_W - SPACING.md * 2;
const CARD_HEIGHT = CARD_WIDTH / 1.5926;

interface DigitalStudentID {
  id: string;
  user_id: string;
  university: string;
  student_number: string;
  qr_code_data: string;
  issued_at: string;
  expires_at: string;
  is_active: boolean;
}

interface TicketItem {
  id: string;
  event_name: string;
  event_date: string;
  status: 'valid' | 'used' | 'expired';
}

const generateQRMatrix = (seed: number): boolean[][] => {
  const size = 21;
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    matrix[r] = [];
    for (let c = 0; c < size; c++) {
      const isFP =
        (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
      const isBorder =
        (r < 7 && c < 7 && (r === 0 || r === 6 || c === 0 || c === 6)) ||
        (r < 7 && c >= size - 7 && (r === 0 || r === 6 || c === size - 1 || c === size - 7)) ||
        (r >= size - 7 && c < 7 && (r === size - 1 || r === size - 7 || c === 0 || c === 6));
      const isInner =
        (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
        (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
        (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4);
      if (isBorder || isInner) matrix[r][c] = true;
      else if (isFP) matrix[r][c] = false;
      else matrix[r][c] = ((seed * (r * size + c + 1) * 7 + 13) % 100) > 42;
    }
  }
  return matrix;
};

const BARCODE = [3,1,2,1,3,1,1,2,3,1,2,1,2,3,1,1,3,2,1,1,2,1,3,1,2,1,1,3,2,1,2,1,3,1,1,2,1,2,3,1];

const LiveClock = () => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <Text style={clockStyle.text}>
      {t.getHours().toString().padStart(2,'0')}:{t.getMinutes().toString().padStart(2,'0')}:{t.getSeconds().toString().padStart(2,'0')}
    </Text>
  );
};
const clockStyle = StyleSheet.create({
  text: { fontSize: 8, fontFamily: 'Courier', fontWeight: '700', color: '#475569', letterSpacing: 0.5 },
});

const CardWatermark = () => (
  <View style={wmS.c} pointerEvents="none">
    <Svg width={CARD_WIDTH} height={CARD_HEIGHT} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}>
      <Defs>
        <LinearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#006B3F" stopOpacity="0.02" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.005" />
        </LinearGradient>
      </Defs>
      {Array.from({ length: 8 }).map((_, i) => (
        <Circle key={i} cx={CARD_WIDTH * 0.78} cy={CARD_HEIGHT * 0.5} r={15 + i * 12} stroke="url(#wm)" strokeWidth={0.4} fill="none" />
      ))}
    </Svg>
  </View>
);
const wmS = StyleSheet.create({ c: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, overflow: 'hidden', borderRadius: 10 } });

export default function StudentIDScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [digitalID, setDigitalID] = useState<DigitalStudentID | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrSeed, setQrSeed] = useState(1);
  const [activeService, setActiveService] = useState<'bankid' | 'tickets'>('bankid');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const verifyPulse = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadDigitalID(); loadTickets(); }, []);

  useEffect(() => {
    if (!digitalID) return;
    const qrInterval = setInterval(() => setQrSeed(p => p + 1), 30000);
    Animated.loop(Animated.sequence([
      Animated.timing(verifyPulse, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(verifyPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })).start();
    return () => clearInterval(qrInterval);
  }, [digitalID]);

  const loadDigitalID = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('digital_student_ids').select('*').eq('user_id', member?.id).eq('is_active', true).single();
      if (error && error.code !== 'PGRST116') throw error;
      setDigitalID(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadTickets = async () => {
    try {
      const { data } = await supabase.from('event_rsvps').select('id, events(title, event_date, status)').eq('user_id', member?.id).order('created_at', { ascending: false }).limit(10);
      if (data && data.length > 0) {
        setTickets(data.map((r: Record<string, unknown>) => {
          const evt = r.events as Record<string, string> | null;
          const d = evt?.event_date ? new Date(evt.event_date) : new Date();
          return { id: r.id as string, event_name: evt?.title || 'Event', event_date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), status: d < new Date() ? 'expired' as const : 'valid' as const };
        }));
      }
    } catch {}
  };

  const generateDigitalID = async () => {
    try {
      setGenerating(true);
      const qrData = JSON.stringify({ studentId: member?.student_id, name: member?.full_name, university: member?.university, timestamp: new Date().toISOString() });
      const issuedAt = new Date(); const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 4);
      const { data, error } = await supabase.from('digital_student_ids').insert({ user_id: member?.id, university: member?.university, student_number: member?.student_id, qr_code_data: qrData, issued_at: issuedAt.toISOString(), expires_at: expiresAt.toISOString(), is_active: true }).select().single();
      if (error) throw error;
      setDigitalID(data);
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const flipCard = () => {
    Vibration.vibrate(20);
    const toValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsFlipped(!isFlipped);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const qrMatrix = generateQRMatrix(qrSeed);
  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-CARD_WIDTH, CARD_WIDTH] });
  const frontOp = flipAnim.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [1, 0, 0, 0] });
  const backOp = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const cardScale = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.96, 1] });

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}><ArrowLeft size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={s.topBarTitle}>Student ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <View style={s.loadWrap}><ActivityIndicator size="large" color="#006B3F" /></View>
      </View>
    );
  }

  if (!digitalID) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}><ArrowLeft size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={s.topBarTitle}>Student ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyBadge}><Shield size={48} color="#006B3F" strokeWidth={1.5} /></View>
          <Text style={s.emptyTitle}>Digital Student ID</Text>
          <Text style={s.emptyDesc}>Generate your official digital student identification card for campus access, exam verification, and identity authentication.</Text>
          <TouchableOpacity style={s.genBtn} onPress={generateDigitalID} disabled={generating} activeOpacity={0.8}>
            {generating ? <ActivityIndicator color="#FFF" /> : <Text style={s.genBtnText}>Generate ID Card</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}><ArrowLeft size={22} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.topBarTitle}>Student ID</Text>
        <View style={s.topBarBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <TouchableOpacity activeOpacity={0.97} onPress={flipCard} style={s.cardWrapper}>
          <Animated.View style={[s.cardOuter, { transform: [{ scale: cardScale }] }]}>

            <Animated.View style={[s.cardSide, s.cardFront, { opacity: frontOp }]}>
              <CardWatermark />
              <Animated.View style={[s.shimmer, { transform: [{ translateX: shimmerX }, { rotate: '15deg' }] }]} pointerEvents="none" />

              <View style={s.frontAccent}>
                <View style={[s.accentBar, { backgroundColor: '#CE1126' }]} />
                <View style={[s.accentBar, { backgroundColor: '#FCD116' }]} />
                <View style={[s.accentBar, { backgroundColor: '#006B3F' }]} />
              </View>

              <View style={s.frontPad}>
                <View style={s.frontHeader}>
                  <Shield size={16} color="#006B3F" strokeWidth={2.5} />
                  <View style={s.frontHeaderText}>
                    <Text style={s.frontUni} adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={1}>
                      {(member?.university || 'UNIVERSITY').toUpperCase()}
                    </Text>
                    <Text style={s.frontCardType}>STUDENT IDENTIFICATION CARD</Text>
                  </View>
                  <View style={s.liveWrap}>
                    <Animated.View style={[s.liveDot, { opacity: verifyPulse }]} />
                    <Text style={s.liveText}>LIVE</Text>
                  </View>
                </View>

                <View style={s.frontDivider} />

                <View style={s.frontBody}>
                  <View style={s.frontPhoto}>
                    <Image source={{ uri: member?.avatar_url || 'https://i.imgur.com/h286QnR.jpeg' }} style={s.frontPhotoImg} />
                  </View>

                  <View style={s.frontInfo}>
                    <Text style={s.frontName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                      {member?.full_name?.toUpperCase() || 'STUDENT NAME'}
                    </Text>
                    <View style={s.frontField}>
                      <Text style={s.frontLabel}>STUDENT ID</Text>
                      <Text style={s.frontValue}>{member?.student_id || '—'}</Text>
                    </View>
                    <View style={s.frontField}>
                      <Text style={s.frontLabel}>PROGRAMME</Text>
                      <Text style={s.frontValueSm} numberOfLines={1}>{member?.traditional_hall || 'Undergraduate'}</Text>
                    </View>
                    <View style={s.frontFieldRow}>
                      <View style={s.frontFieldHalf}>
                        <Text style={s.frontLabel}>LEVEL</Text>
                        <Text style={s.frontValueSm}>{member?.level || '100'}</Text>
                      </View>
                      <View style={s.frontFieldHalf}>
                        <Text style={s.frontLabel}>STATUS</Text>
                        <View style={s.statusRow}>
                          <View style={s.statusDotGreen} />
                          <Text style={s.statusActiveText}>ACTIVE</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={s.frontBarcode}>
                  <View style={s.barcodeStrip}>
                    {BARCODE.map((w, i) => (
                      <View key={i} style={[s.barLine, { width: w }]} />
                    ))}
                  </View>
                  <View style={s.barcodeRight}>
                    <Text style={s.barcodeNum}>{member?.student_id || ''}</Text>
                    <LiveClock />
                  </View>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[s.cardSide, s.cardBack, { opacity: backOp, transform: [{ rotateY: backRotate }] }]}>

              <View style={s.magStripe} />

              <View style={s.backPad}>
                <View style={s.backTop}>
                  <View style={s.backQrWrap}>
                    <View style={s.backQrGrid}>
                      {qrMatrix.map((row, rI) =>
                        row.map((filled, cI) => (
                          <View key={`${rI}-${cI}`} style={[s.qrCell, { width: `${100/21}%`, height: `${100/21}%` }, filled && s.qrFilled]} />
                        ))
                      )}
                    </View>
                    <Text style={s.backQrLabel}>SCAN TO VERIFY</Text>
                  </View>

                  <View style={s.backCredentials}>
                    <View style={s.backCredRow}>
                      <Text style={s.backCredLabel}>DATE OF ISSUE</Text>
                      <Text style={s.backCredValue}>{fmtDate(digitalID.issued_at)}</Text>
                    </View>
                    <View style={s.backCredRow}>
                      <Text style={s.backCredLabel}>EXPIRY DATE</Text>
                      <Text style={s.backCredValue}>{fmtDate(digitalID.expires_at)}</Text>
                    </View>
                    <View style={s.backCredRow}>
                      <Text style={s.backCredLabel}>CAMPUS</Text>
                      <Text style={s.backCredValue}>MAIN CAMPUS</Text>
                    </View>
                    <View style={s.backCredRow}>
                      <Text style={s.backCredLabel}>CARD ID</Text>
                      <Text style={s.backCredValueMono}>{digitalID.id.substring(0, 8).toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.backSigBox}>
                  <Text style={s.backSigLabel}>AUTHORIZED SIGNATURE</Text>
                  <Text style={s.backSigName} numberOfLines={1} adjustsFontSizeToFit>{member?.full_name}</Text>
                </View>

                <View style={s.backFooter}>
                  <Text style={s.backDisclaimer}>
                    This card is the property of {member?.university || 'the institution'}. If found, please return to the Office of Student Affairs. Misuse is subject to disciplinary action.
                  </Text>
                  <Text style={s.backVerCode}>VER: {digitalID.id.substring(0, 12).toUpperCase()}</Text>
                </View>
              </View>
            </Animated.View>

          </Animated.View>
        </TouchableOpacity>

        <Text style={s.flipHint}>Tap card to flip</Text>

        <View style={s.servicesSection}>
          <Text style={s.servicesTitle}>DIGITAL SERVICES</Text>
          <View style={s.servicesTabs}>
            <TouchableOpacity style={[s.svcTab, activeService === 'bankid' && s.svcTabOn]} onPress={() => setActiveService('bankid')} activeOpacity={0.7}>
              <Fingerprint size={16} color={activeService === 'bankid' ? '#FFF' : '#006B3F'} />
              <Text style={[s.svcTabText, activeService === 'bankid' && s.svcTabTextOn]}>BankID</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.svcTab, activeService === 'tickets' && s.svcTabOn]} onPress={() => setActiveService('tickets')} activeOpacity={0.7}>
              <Ticket size={16} color={activeService === 'tickets' ? '#FFF' : '#006B3F'} />
              <Text style={[s.svcTabText, activeService === 'tickets' && s.svcTabTextOn]}>Tickets</Text>
            </TouchableOpacity>
          </View>

          {activeService === 'bankid' && (
            <View style={s.svcCard}>
              <View style={s.bidHeader}>
                <Fingerprint size={24} color="#006B3F" />
                <View style={s.bidHeaderText}>
                  <Text style={s.bidTitle}>Student BankID</Text>
                  <Text style={s.bidSub}>Verified Digital Identity</Text>
                </View>
              </View>
              <View style={s.bidDivider} />
              <Text style={s.bidDesc}>Your Student ID serves as a verified digital identity for secure authentication across campus services.</Text>
              <View style={s.bidFeatures}>
                {[
                  { t: 'Document Signing', d: 'Sign hostel agreements and forms digitally' },
                  { t: 'Identity Verification', d: 'Prove student status for discounts and services' },
                  { t: 'Exam Authentication', d: 'Verify identity at exam halls automatically' },
                  { t: 'Voter Authentication', d: 'SRC election voter ID verification' },
                ].map((f, i) => (
                  <View key={i} style={s.bidRow}>
                    <View style={s.bidCheck}><Check size={11} color="#006B3F" strokeWidth={3} /></View>
                    <View style={s.bidRowText}>
                      <Text style={s.bidRowTitle}>{f.t}</Text>
                      <Text style={s.bidRowDesc}>{f.d}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={s.bidBtn} onPress={() => { Vibration.vibrate(30); Alert.alert('BankID Activated', 'Your digital identity is ready. Present your QR code when prompted for verification.', [{ text: 'OK' }]); }} activeOpacity={0.8}>
                <Text style={s.bidBtnText}>Authenticate Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeService === 'tickets' && (
            <View style={s.svcCard}>
              {tickets.length === 0 ? (
                <View style={s.tixEmpty}>
                  <Ticket size={28} color={COLORS.textTertiary} />
                  <Text style={s.tixEmptyTitle}>No Tickets</Text>
                  <Text style={s.tixEmptyDesc}>Tickets you purchase for campus events will appear here automatically.</Text>
                  <TouchableOpacity style={s.tixBrowseBtn} onPress={() => router.push('events' as never)} activeOpacity={0.8}>
                    <Text style={s.tixBrowseBtnText}>Browse Events</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                tickets.map((tk) => (
                  <View key={tk.id} style={s.tixRow}>
                    <View style={s.tixInfo}>
                      <Text style={s.tixName} numberOfLines={1}>{tk.event_name}</Text>
                      <Text style={s.tixDate}>{tk.event_date}</Text>
                    </View>
                    <View style={[s.tixBadge, tk.status === 'valid' && s.tixBadgeValid, tk.status === 'used' && s.tixBadgeUsed, tk.status === 'expired' && s.tixBadgeExpired]}>
                      <Text style={[s.tixBadgeText, tk.status === 'valid' && { color: '#16A34A' }, tk.status === 'used' && { color: '#64748B' }, tk.status === 'expired' && { color: '#DC2626' }]}>{tk.status.toUpperCase()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  topBarBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontFamily: FONT.semiBold, color: COLORS.textPrimary },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.xl * 2 },

  cardWrapper: { alignItems: 'center', marginBottom: 6 },
  cardOuter: { width: CARD_WIDTH, height: CARD_HEIGHT },
  cardSide: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 10, backfaceVisibility: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, overflow: 'hidden' },

  cardFront: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  shimmer: { position: 'absolute', top: -20, width: 40, height: CARD_HEIGHT + 40, backgroundColor: 'rgba(255,255,255,0.07)', zIndex: 3 },
  frontAccent: { flexDirection: 'row', height: 4 },
  accentBar: { flex: 1, height: 4 },
  frontPad: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, justifyContent: 'space-between', zIndex: 5 },

  frontHeader: { flexDirection: 'row', alignItems: 'center' },
  frontHeaderText: { flex: 1, marginLeft: 6 },
  frontUni: { fontSize: 10, fontFamily: FONT.bold, color: '#0F172A', letterSpacing: 0.5, lineHeight: 13 },
  frontCardType: { fontSize: 6, fontFamily: FONT.semiBold, color: '#006B3F', letterSpacing: 1.2, marginTop: 1 },
  liveWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,163,74,0.08)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(22,163,74,0.15)' },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#16A34A', marginRight: 3 },
  liveText: { fontSize: 6, fontFamily: FONT.bold, color: '#16A34A', letterSpacing: 0.8 },

  frontDivider: { height: 0.5, backgroundColor: '#E2E8F0', marginVertical: 6 },

  frontBody: { flexDirection: 'row', flex: 1 },
  frontPhoto: { width: CARD_HEIGHT * 0.52, height: CARD_HEIGHT * 0.52 * 1.3, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F1F5F9' },
  frontPhotoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  frontInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  frontName: { fontSize: 12, fontFamily: FONT.bold, color: '#0F172A', letterSpacing: 0.3, marginBottom: 5, lineHeight: 15 },
  frontField: { marginBottom: 3 },
  frontLabel: { fontSize: 6, fontFamily: FONT.semiBold, color: '#64748B', letterSpacing: 0.8, marginBottom: 0.5 },
  frontValue: { fontSize: 11, fontFamily: FONT.semiBold, color: '#0F172A', letterSpacing: 0.5 },
  frontValueSm: { fontSize: 10, fontFamily: FONT.semiBold, color: '#0F172A' },
  frontFieldRow: { flexDirection: 'row', gap: 10 },
  frontFieldHalf: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDotGreen: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#16A34A', marginRight: 4 },
  statusActiveText: { fontSize: 9, fontFamily: FONT.bold, color: '#16A34A', letterSpacing: 0.3 },

  frontBarcode: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  barcodeStrip: { flexDirection: 'row', height: 22, alignItems: 'flex-end', flex: 1, overflow: 'hidden' },
  barLine: { height: '100%', backgroundColor: '#0F172A', marginRight: 1 },
  barcodeRight: { marginLeft: 8, alignItems: 'flex-end' },
  barcodeNum: { fontSize: 7, fontFamily: 'Courier', fontWeight: '600', color: '#475569', letterSpacing: 1.5, marginBottom: 1 },

  cardBack: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  magStripe: { width: '100%', height: 28, backgroundColor: '#1E293B', marginTop: 0 },
  backPad: { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, justifyContent: 'space-between' },

  backTop: { flexDirection: 'row' },
  backQrWrap: { alignItems: 'center', marginRight: 12 },
  backQrGrid: { width: 72, height: 72, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#E2E8F0', padding: 2, backgroundColor: '#FFF' },
  qrCell: { backgroundColor: '#FFF' },
  qrFilled: { backgroundColor: '#0F172A' },
  backQrLabel: { fontSize: 6, fontFamily: FONT.bold, color: '#64748B', letterSpacing: 0.8, marginTop: 3 },

  backCredentials: { flex: 1, justifyContent: 'center' },
  backCredRow: { marginBottom: 5 },
  backCredLabel: { fontSize: 6, fontFamily: FONT.semiBold, color: '#64748B', letterSpacing: 0.8, marginBottom: 0.5 },
  backCredValue: { fontSize: 9, fontFamily: FONT.semiBold, color: '#0F172A' },
  backCredValueMono: { fontSize: 9, fontFamily: 'Courier', fontWeight: '700', color: '#0F172A', letterSpacing: 1 },

  backSigBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, marginVertical: 6, borderRadius: 2 },
  backSigLabel: { fontSize: 5, fontFamily: FONT.semiBold, color: '#94A3B8', letterSpacing: 0.8, marginBottom: 2 },
  backSigName: { fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', fontSize: 14, color: '#0F172A', fontStyle: 'italic' },

  backFooter: { borderTopWidth: 0.5, borderTopColor: '#E2E8F0', paddingTop: 5 },
  backDisclaimer: { fontSize: 5.5, fontFamily: FONT.regular, color: '#94A3B8', lineHeight: 8, textAlign: 'center', marginBottom: 2 },
  backVerCode: { fontSize: 6, fontFamily: 'Courier', color: '#94A3B8', textAlign: 'center', letterSpacing: 1 },

  flipHint: { fontSize: 12, fontFamily: FONT.medium, color: COLORS.textTertiary, textAlign: 'center', marginBottom: SPACING.lg },

  servicesSection: { marginBottom: SPACING.md },
  servicesTitle: { fontSize: 11, fontFamily: FONT.bold, color: '#475569', letterSpacing: 1, marginBottom: 10 },
  servicesTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  svcTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1.5, borderColor: '#006B3F' },
  svcTabOn: { backgroundColor: '#006B3F' },
  svcTabText: { fontSize: 13, fontFamily: FONT.semiBold, color: '#006B3F' },
  svcTabTextOn: { color: '#FFF' },

  svcCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },

  bidHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bidHeaderText: { flex: 1 },
  bidTitle: { fontSize: 16, fontFamily: FONT.bold, color: '#0F172A' },
  bidSub: { fontSize: 11, fontFamily: FONT.regular, color: '#64748B', marginTop: 1 },
  bidDivider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 10 },
  bidDesc: { fontSize: 12, fontFamily: FONT.regular, color: '#475569', lineHeight: 18, marginBottom: 12 },
  bidFeatures: { marginBottom: 14 },
  bidRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bidCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 1 },
  bidRowText: { flex: 1 },
  bidRowTitle: { fontSize: 12, fontFamily: FONT.semiBold, color: '#0F172A' },
  bidRowDesc: { fontSize: 10, fontFamily: FONT.regular, color: '#64748B', marginTop: 1 },
  bidBtn: { backgroundColor: '#006B3F', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  bidBtnText: { fontSize: 14, fontFamily: FONT.bold, color: '#FFF', letterSpacing: 0.3 },

  tixEmpty: { alignItems: 'center', paddingVertical: 18 },
  tixEmptyTitle: { fontSize: 15, fontFamily: FONT.semiBold, color: COLORS.textPrimary, marginTop: 8, marginBottom: 4 },
  tixEmptyDesc: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  tixBrowseBtn: { backgroundColor: '#006B3F', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 8 },
  tixBrowseBtnText: { fontSize: 13, fontFamily: FONT.semiBold, color: '#FFF' },
  tixRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tixInfo: { flex: 1, marginRight: 10 },
  tixName: { fontSize: 13, fontFamily: FONT.semiBold, color: '#0F172A' },
  tixDate: { fontSize: 11, fontFamily: FONT.regular, color: '#64748B', marginTop: 1 },
  tixBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  tixBadgeValid: { backgroundColor: '#ECFDF5' },
  tixBadgeUsed: { backgroundColor: '#F1F5F9' },
  tixBadgeExpired: { backgroundColor: '#FEF2F2' },
  tixBadgeText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyBadge: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: '#BBF7D0' },
  emptyTitle: { fontSize: 20, fontFamily: FONT.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: SPACING.xl },
  genBtn: { backgroundColor: '#006B3F', paddingHorizontal: SPACING.xl, paddingVertical: 13, borderRadius: 10, width: '100%', alignItems: 'center' },
  genBtnText: { fontSize: 15, fontFamily: FONT.bold, color: '#FFF' },
});