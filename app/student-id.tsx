import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.md * 2;
const CARD_RATIO = 1.6;
const CARD_HEIGHT = CARD_WIDTH * CARD_RATIO;

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
      const isFinderPattern =
        (r < 7 && c < 7) ||
        (r < 7 && c >= size - 7) ||
        (r >= size - 7 && c < 7);
      const isFinderBorder =
        (r < 7 && c < 7 && (r === 0 || r === 6 || c === 0 || c === 6)) ||
        (r < 7 && c >= size - 7 && (r === 0 || r === 6 || c === size - 1 || c === size - 7)) ||
        (r >= size - 7 && c < 7 && (r === size - 1 || r === size - 7 || c === 0 || c === 6));
      const isFinderInner =
        (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
        (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
        (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4);
      if (isFinderBorder || isFinderInner) {
        matrix[r][c] = true;
      } else if (isFinderPattern) {
        matrix[r][c] = false;
      } else {
        matrix[r][c] = ((seed * (r * size + c + 1) * 7 + 13) % 100) > 42;
      }
    }
  }
  return matrix;
};

const BARCODE_PATTERN = [3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 2, 3, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 1, 2];

const SecurityWatermark = () => (
  <View style={wmStyles.container} pointerEvents="none">
    <Svg width={CARD_WIDTH} height={CARD_HEIGHT} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}>
      <Defs>
        <LinearGradient id="wmGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#006B3F" stopOpacity="0.018" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.008" />
        </LinearGradient>
      </Defs>
      {Array.from({ length: 10 }).map((_, i) => (
        <Circle
          key={i}
          cx={CARD_WIDTH * 0.75}
          cy={CARD_HEIGHT * 0.4}
          r={25 + i * 18}
          stroke="url(#wmGrad)"
          strokeWidth={0.5}
          fill="none"
        />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <Line
          key={`l${i}`}
          x1={0}
          y1={CARD_HEIGHT * 0.15 + i * (CARD_HEIGHT * 0.14)}
          x2={CARD_WIDTH}
          y2={CARD_HEIGHT * 0.18 + i * (CARD_HEIGHT * 0.14)}
          stroke="url(#wmGrad)"
          strokeWidth={0.3}
        />
      ))}
    </Svg>
  </View>
);

const wmStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
});

export default function StudentIDScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [digitalID, setDigitalID] = useState<DigitalStudentID | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrSeed, setQrSeed] = useState(1);
  const [activeService, setActiveService] = useState<'bankid' | 'tickets'>('bankid');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const verifyPulse = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDigitalID();
    loadTickets();
  }, []);

  useEffect(() => {
    if (!digitalID) return;

    const qrInterval = setInterval(() => {
      setQrSeed(prev => prev + 1);
    }, 30000);

    Animated.loop(
      Animated.sequence([
        Animated.timing(verifyPulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(verifyPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ).start();

    return () => clearInterval(qrInterval);
  }, [digitalID]);

  const loadDigitalID = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('digital_student_ids')
        .select('*')
        .eq('user_id', member?.id)
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setDigitalID(data);
    } catch (error) {
      console.error('Error loading digital ID:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('id, events(title, event_date, status)')
        .eq('user_id', member?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const mapped: TicketItem[] = data.map((r: Record<string, unknown>) => {
          const evt = r.events as Record<string, string> | null;
          const eventDate = evt?.event_date ? new Date(evt.event_date) : new Date();
          const now = new Date();
          let status: 'valid' | 'used' | 'expired' = 'valid';
          if (eventDate < now) status = 'expired';
          return {
            id: r.id as string,
            event_name: evt?.title || 'Event',
            event_date: eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            status,
          };
        });
        setTickets(mapped);
      }
    } catch {}
  };

  const generateDigitalID = async () => {
    try {
      setGenerating(true);
      const qrData = JSON.stringify({
        studentId: member?.student_id,
        name: member?.full_name,
        university: member?.university,
        timestamp: new Date().toISOString(),
      });
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 4);

      const { data, error } = await supabase
        .from('digital_student_ids')
        .insert({
          user_id: member?.id,
          university: member?.university,
          student_number: member?.student_id,
          qr_code_data: qrData,
          issued_at: issuedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setDigitalID(data);
    } catch (error) {
      console.error('Error generating digital ID:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const qrMatrix = generateQRMatrix(qrSeed);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_WIDTH, CARD_WIDTH],
  });

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
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
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Student ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyBadge}>
            <Shield size={48} color="#006B3F" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>Digital Student ID</Text>
          <Text style={s.emptyDesc}>
            Generate your official digital student identification card. This card can be used for campus access, exam verification, and identity authentication.
          </Text>
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
        <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Student ID</Text>
        <View style={s.topBarBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={s.card}>
          <SecurityWatermark />

          <Animated.View
            style={[s.shimmerBar, { transform: [{ translateX: shimmerTranslate }, { rotate: '15deg' }] }]}
            pointerEvents="none"
          />

          <View style={s.cardTopAccent}>
            <View style={[s.accentStripe, { backgroundColor: '#CE1126' }]} />
            <View style={[s.accentStripe, { backgroundColor: '#FCD116' }]} />
            <View style={[s.accentStripe, { backgroundColor: '#006B3F' }]} />
          </View>

          <View style={s.cardPad}>

            <View style={s.headerSection}>
              <Shield size={22} color="#006B3F" strokeWidth={2.5} />
              <View style={s.headerTextWrap}>
                <Text style={s.institutionName} adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={2}>
                  {(member?.university || 'UNIVERSITY').toUpperCase()}
                </Text>
                <Text style={s.cardTitle}>STUDENT IDENTIFICATION CARD</Text>
              </View>
            </View>

            <View style={s.headerDivider} />

            <View style={s.identitySection}>
              <View style={s.photoContainer}>
                <Image
                  source={{ uri: member?.avatar_url || 'https://i.imgur.com/h286QnR.jpeg' }}
                  style={s.photo}
                />
              </View>

              <View style={s.identityInfo}>
                <Text style={s.fullName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {member?.full_name?.toUpperCase() || 'STUDENT NAME'}
                </Text>

                <View style={s.fieldRow}>
                  <Text style={s.fieldLabel}>STUDENT ID</Text>
                  <Text style={s.fieldValue}>{member?.student_id || '—'}</Text>
                </View>

                <View style={s.fieldRow}>
                  <Text style={s.fieldLabel}>PROGRAMME</Text>
                  <Text style={s.fieldValue} numberOfLines={1}>
                    {member?.traditional_hall || 'Undergraduate'}
                  </Text>
                </View>

                <View style={s.fieldRow}>
                  <Text style={s.fieldLabel}>LEVEL</Text>
                  <Text style={s.fieldValue}>Level {member?.level || '100'}</Text>
                </View>
              </View>
            </View>

            <View style={s.credentialSection}>
              <View style={s.credRow}>
                <View style={s.credItem}>
                  <Text style={s.credLabel}>DATE OF ISSUE</Text>
                  <Text style={s.credValue}>{formatDate(digitalID.issued_at)}</Text>
                </View>
                <View style={s.credItem}>
                  <Text style={s.credLabel}>EXPIRY DATE</Text>
                  <Text style={s.credValue}>{formatDate(digitalID.expires_at)}</Text>
                </View>
              </View>
              <View style={s.credRow}>
                <View style={s.credItem}>
                  <Text style={s.credLabel}>STATUS</Text>
                  <View style={s.statusBadge}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>ACTIVE</Text>
                  </View>
                </View>
                <View style={s.credItem}>
                  <Text style={s.credLabel}>CAMPUS CODE</Text>
                  <Text style={s.credValue}>MAIN</Text>
                </View>
              </View>
            </View>

            <View style={s.securitySection}>
              <View style={s.qrContainer}>
                <View style={s.qrGrid}>
                  {qrMatrix.map((row, rIdx) =>
                    row.map((filled, cIdx) => (
                      <View
                        key={`${rIdx}-${cIdx}`}
                        style={[
                          s.qrCell,
                          { width: `${100 / 21}%`, height: `${100 / 21}%` },
                          filled && s.qrFilled,
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>

              <View style={s.barcodeContainer}>
                <View style={s.barcodeRow}>
                  {BARCODE_PATTERN.map((w, i) => (
                    <View key={i} style={[s.barcodeLine, { width: w }]} />
                  ))}
                </View>
                <Text style={s.barcodeNumber}>{member?.student_id || ''}</Text>
              </View>

              <View style={s.verifyBadge}>
                <Animated.View style={[s.verifyDot, { opacity: verifyPulse }]} />
                <Text style={s.verifyLive}>LIVE</Text>
                <LiveClock />
              </View>
            </View>

            <View style={s.footerSection}>
              <Text style={s.footerText}>
                Property of {member?.university || 'Institution'}. If found, return to campus administration.
              </Text>
              <Text style={s.footerCode}>
                VER: {digitalID.id.substring(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.servicesSection}>
          <Text style={s.servicesTitle}>DIGITAL SERVICES</Text>
          <View style={s.servicesTabs}>
            <TouchableOpacity
              style={[s.serviceTab, activeService === 'bankid' && s.serviceTabActive]}
              onPress={() => setActiveService('bankid')}
              activeOpacity={0.7}
            >
              <Fingerprint size={18} color={activeService === 'bankid' ? '#FFFFFF' : '#006B3F'} />
              <Text style={[s.serviceTabText, activeService === 'bankid' && s.serviceTabTextActive]}>BankID</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.serviceTab, activeService === 'tickets' && s.serviceTabActive]}
              onPress={() => setActiveService('tickets')}
              activeOpacity={0.7}
            >
              <Ticket size={18} color={activeService === 'tickets' ? '#FFFFFF' : '#006B3F'} />
              <Text style={[s.serviceTabText, activeService === 'tickets' && s.serviceTabTextActive]}>Tickets</Text>
            </TouchableOpacity>
          </View>

          {activeService === 'bankid' && (
            <View style={s.bankIdContent}>
              <View style={s.bankIdHeader}>
                <Fingerprint size={28} color="#006B3F" />
                <View style={s.bankIdHeaderText}>
                  <Text style={s.bankIdTitle}>Student BankID</Text>
                  <Text style={s.bankIdSub}>Verified Digital Identity</Text>
                </View>
              </View>
              <View style={s.bankIdDivider} />
              <Text style={s.bankIdDesc}>
                Your Student ID serves as a verified digital identity for secure authentication across campus services.
              </Text>
              <View style={s.bankIdFeatures}>
                {[
                  { t: 'Document Signing', d: 'Sign hostel agreements and forms digitally' },
                  { t: 'Identity Verification', d: 'Prove student status for discounts and services' },
                  { t: 'Exam Authentication', d: 'Verify identity at exam halls automatically' },
                  { t: 'Voter Authentication', d: 'SRC election voter ID verification' },
                ].map((f, i) => (
                  <View key={i} style={s.bankIdFeatureRow}>
                    <View style={s.bankIdCheck}>
                      <Check size={12} color="#006B3F" strokeWidth={3} />
                    </View>
                    <View style={s.bankIdFeatureText}>
                      <Text style={s.bankIdFeatureTitle}>{f.t}</Text>
                      <Text style={s.bankIdFeatureDesc}>{f.d}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={s.bankIdBtn} onPress={() => {
                Vibration.vibrate(30);
                Alert.alert('BankID Activated', 'Your digital identity is ready. Present your QR code when prompted for verification.', [{ text: 'OK' }]);
              }} activeOpacity={0.8}>
                <Text style={s.bankIdBtnText}>Authenticate Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeService === 'tickets' && (
            <View style={s.ticketsContent}>
              {tickets.length === 0 ? (
                <View style={s.ticketsEmpty}>
                  <Ticket size={32} color={COLORS.textTertiary} />
                  <Text style={s.ticketsEmptyTitle}>No Tickets</Text>
                  <Text style={s.ticketsEmptyDesc}>
                    Tickets you purchase for campus events will appear here automatically.
                  </Text>
                  <TouchableOpacity style={s.ticketsBrowseBtn} onPress={() => router.push('events' as never)} activeOpacity={0.8}>
                    <Text style={s.ticketsBrowseBtnText}>Browse Events</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                tickets.map((ticket) => (
                  <View key={ticket.id} style={s.ticketCard}>
                    <View style={s.ticketInfo}>
                      <Text style={s.ticketName} numberOfLines={1}>{ticket.event_name}</Text>
                      <Text style={s.ticketDate}>{ticket.event_date}</Text>
                    </View>
                    <View style={[
                      s.ticketStatus,
                      ticket.status === 'valid' && s.ticketStatusValid,
                      ticket.status === 'used' && s.ticketStatusUsed,
                      ticket.status === 'expired' && s.ticketStatusExpired,
                    ]}>
                      <Text style={[
                        s.ticketStatusText,
                        ticket.status === 'valid' && s.ticketStatusTextValid,
                        ticket.status === 'used' && s.ticketStatusTextUsed,
                        ticket.status === 'expired' && s.ticketStatusTextExpired,
                      ]}>{ticket.status.toUpperCase()}</Text>
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

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  const h = time.getHours().toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const sec = time.getSeconds().toString().padStart(2, '0');
  return <Text style={s.verifyClock}>{h}:{m}:{sec}</Text>;
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: SPACING.lg,
  },
  shimmerBar: {
    position: 'absolute',
    top: -30,
    width: 50,
    height: CARD_HEIGHT + 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 2,
  },
  cardTopAccent: {
    flexDirection: 'row',
    height: 5,
  },
  accentStripe: {
    flex: 1,
    height: 5,
  },
  cardPad: {
    padding: 16,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTextWrap: {
    marginLeft: 8,
    flex: 1,
  },
  institutionName: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.8,
    lineHeight: 16,
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: FONT.semiBold,
    color: '#006B3F',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  identitySection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoContainer: {
    width: 88,
    height: 110,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  identityInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  fullName: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 10,
    lineHeight: 20,
  },
  fieldRow: {
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 8,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  credentialSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  credRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  credItem: {
    flex: 1,
  },
  credLabel: {
    fontSize: 7,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 2,
  },
  credValue: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  qrContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
  },
  qrGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    backgroundColor: '#FFFFFF',
  },
  qrFilled: {
    backgroundColor: '#0F172A',
  },
  barcodeContainer: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'center',
  },
  barcodeRow: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'flex-end',
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: '#0F172A',
    marginRight: 1,
  },
  barcodeNumber: {
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 2,
    marginTop: 3,
  },
  verifyBadge: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 10,
    paddingBottom: 2,
  },
  verifyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginBottom: 3,
  },
  verifyLive: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: '#16A34A',
    letterSpacing: 1,
    marginBottom: 2,
  },
  verifyClock: {
    fontSize: 8,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    fontFamily: FONT.regular,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 10,
    marginBottom: 3,
  },
  footerCode: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 1,
  },
  servicesSection: {
    marginBottom: SPACING.md,
  },
  servicesTitle: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 10,
  },
  servicesTabs: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  serviceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#006B3F',
  },
  serviceTabActive: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  serviceTabText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: '#006B3F',
  },
  serviceTabTextActive: {
    color: '#FFFFFF',
  },
  bankIdContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bankIdHeaderText: {
    flex: 1,
  },
  bankIdTitle: {
    fontSize: 17,
    fontFamily: FONT.bold,
    color: '#0F172A',
  },
  bankIdSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: '#64748B',
    marginTop: 1,
  },
  bankIdDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  bankIdDesc: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  bankIdFeatures: {
    marginBottom: 16,
  },
  bankIdFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bankIdCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  bankIdFeatureText: {
    flex: 1,
  },
  bankIdFeatureTitle: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  bankIdFeatureDesc: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: '#64748B',
    marginTop: 1,
  },
  bankIdBtn: {
    backgroundColor: '#006B3F',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  bankIdBtnText: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ticketsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketsEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  ticketsEmptyTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 6,
  },
  ticketsEmptyDesc: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  ticketsBrowseBtn: {
    backgroundColor: '#006B3F',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ticketsBrowseBtnText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: '#FFFFFF',
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketName: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  ticketDate: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: '#64748B',
    marginTop: 2,
  },
  ticketStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ticketStatusValid: {
    backgroundColor: '#ECFDF5',
  },
  ticketStatusUsed: {
    backgroundColor: '#F1F5F9',
  },
  ticketStatusExpired: {
    backgroundColor: '#FEF2F2',
  },
  ticketStatusText: {
    fontSize: 10,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
  ticketStatusTextValid: {
    color: '#16A34A',
  },
  ticketStatusTextUsed: {
    color: '#64748B',
  },
  ticketStatusTextExpired: {
    color: '#DC2626',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.xl,
  },
  genBtn: {
    backgroundColor: '#006B3F',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  genBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },
});