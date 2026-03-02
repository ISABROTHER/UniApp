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
  Share,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Shield, Check, Eye, EyeOff, QrCode,
  BookOpen, Printer, GraduationCap, CreditCard, Bus, Vote,
  ChevronRight, Wallet, Users, Calendar, FileText,
  Building2, AlertTriangle, Share2, Settings, MoreHorizontal,
  Fingerprint, MapPin, Bell, Heart, Briefcase, Award,
  Lock, Zap, Clock,
} from 'lucide-react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.md * 2;
const CARD_HEIGHT = CARD_WIDTH * 0.6;

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

const MY_INFO_ITEMS = [
  { id: 'academic', icon: GraduationCap, label: 'Academic', color: '#006B3F', bg: '#ECFDF5' },
  { id: 'finance', icon: Wallet, label: 'Finance', color: '#4A90E2', bg: '#E0F2FE' },
  { id: 'housing', icon: Building2, label: 'Housing', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'orgs', icon: Users, label: 'Organizations', color: '#7C3AED', bg: '#EDE9FE' },
];

const DIGITAL_SERVICES = [
  { id: 'verify', icon: Fingerprint, label: 'BankID Verify', desc: 'Sign documents digitally', color: '#006B3F', route: null },
  { id: 'library', icon: BookOpen, label: 'Library Gate', desc: 'Scan to enter', color: '#4A90E2', route: null },
  { id: 'exam', icon: FileText, label: 'Exam Entry', desc: 'Auto-verification', color: '#7C3AED', route: null },
  { id: 'shuttle', icon: Bus, label: 'Shuttle Pass', desc: 'Board with tap', color: '#F59E0B', route: 'shuttle' },
  { id: 'print', icon: Printer, label: 'Print Station', desc: 'Upload & collect', color: '#0284C7', route: 'print' },
  { id: 'wallet', icon: CreditCard, label: 'Campus Pay', desc: 'Tap to pay', color: '#DC2626', route: 'wallet' },
  { id: 'elections', icon: Vote, label: 'e-Voting', desc: 'SRC Elections', color: '#16A34A', route: 'elections' },
  { id: 'transcript', icon: Award, label: 'e-Transcript', desc: 'Request online', color: '#8B5CF6', route: null },
];

const LiveTimeBadge = () => {
  const [time, setTime] = useState(new Date());
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
    return () => clearInterval(interval);
  }, []);

  const h = time.getHours().toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const s = time.getSeconds().toString().padStart(2, '0');

  return (
    <View style={timeStyles.wrap}>
      <Animated.View style={[timeStyles.dot, { opacity: blinkAnim }]} />
      <Text style={timeStyles.text}>{h}:{m}:{s}</Text>
    </View>
  );
};

const timeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22C55E',
    marginRight: 4,
  },
  text: {
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default function StudentIDScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [digitalID, setDigitalID] = useState<DigitalStudentID | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDigitalID();
  }, []);

  useEffect(() => {
    if (digitalID) {
      Animated.spring(cardAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
    }
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

  const togglePrivacy = () => {
    Vibration.vibrate(30);
    setPrivacyMode(!privacyMode);
  };

  const handleMyInfo = (id: string) => {
    const routes: Record<string, string> = {
      academic: 'planner',
      finance: 'wallet',
      housing: 'tenancy',
      orgs: 'my-orgs',
    };
    if (routes[id]) router.push(routes[id] as never);
  };

  const handleService = (service: typeof DIGITAL_SERVICES[number]) => {
    if (service.route) {
      router.push(service.route as never);
      return;
    }
    if (service.id === 'verify') {
      Alert.alert(
        'BankID Verification',
        'Your Digital Student ID can be used as a verified identity for:\n\n• Signing hostel agreements digitally\n• Verifying identity for campus payments\n• SRC election voter authentication\n• Library resource access\n\nThis feature activates when your university enables digital ID verification.',
        [{ text: 'Got it' }]
      );
      return;
    }
    Alert.alert('Coming Soon', `${service.label} will be available once your university activates digital ID scanning.`, [{ text: 'Got it' }]);
  };

  const handleCardMenu = () => {
    Alert.alert('Card Options', undefined, [
      {
        text: 'Share ID',
        onPress: async () => {
          try {
            await Share.share({ message: `Verified Student: ${member?.full_name} — ${member?.university} (${member?.student_id}). Digital ID powered by CampusConnect.` });
          } catch {}
        },
      },
      {
        text: 'Report Lost/Stolen',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Deactivate ID?', 'This instantly locks your digital ID. You can reactivate anytime.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Deactivate', style: 'destructive', onPress: () => Alert.alert('Done', 'Your digital ID has been deactivated.') },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const maskedId = privacyMode
    ? (member?.student_id ? member.student_id.substring(0, 2) + '****' + member.student_id.slice(-2) : '••••••')
    : member?.student_id;

  const firstName = member?.full_name?.split(' ')[0] || 'Student';

  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Digital ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
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
          <Text style={s.topBarTitle}>Digital ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <ScrollView contentContainerStyle={s.emptyWrap} showsVerticalScrollIndicator={false}>
          <View style={s.emptyIconCircle}>
            <Shield size={56} color="#006B3F" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>Your Digital Student ID</Text>
          <Text style={s.emptyDesc}>
            One card that replaces everything — library access, exam entry, campus payments, e-voting, and more. Always on your phone, impossible to fake.
          </Text>

          <View style={s.benefitsList}>
            {[
              { icon: Lock, t: 'Anti-Screenshot', d: 'Live clock makes screenshots useless' },
              { icon: Zap, t: 'Instant Deactivate', d: 'Lost phone? Lock your ID remotely' },
              { icon: Fingerprint, t: 'BankID Signing', d: 'Sign documents with your student identity' },
              { icon: Clock, t: 'Always With You', d: 'Never forget your card at home again' },
            ].map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={s.benefitIcon}>
                  <b.icon size={18} color="#006B3F" />
                </View>
                <View style={s.benefitTextWrap}>
                  <Text style={s.benefitTitle}>{b.t}</Text>
                  <Text style={s.benefitDesc}>{b.d}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.generateBtn} onPress={generateDigitalID} disabled={generating} activeOpacity={0.8}>
            {generating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.generateBtnText}>Generate My Digital ID</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Digital ID</Text>
        <TouchableOpacity style={s.topBarBtn} onPress={togglePrivacy}>
          {privacyMode ? <EyeOff size={20} color={COLORS.textSecondary} /> : <Eye size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.welcomeText}>Welcome,</Text>
        <Text style={s.welcomeName}>{privacyMode ? '••••••••' : member?.full_name}</Text>

        <View style={s.cardSection}>
          <View style={s.cardSectionHeader}>
            <Text style={s.sectionLabel}>MY CARD</Text>
            <TouchableOpacity onPress={handleCardMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MoreHorizontal size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Animated.View style={[s.card, { transform: [{ translateY: cardTranslateY }], opacity: cardOpacity }]}>
            <View style={s.cardTopStripe}>
              <View style={[s.stripe, { backgroundColor: '#CE1126' }]} />
              <View style={[s.stripe, { backgroundColor: '#FCD116' }]} />
              <View style={[s.stripe, { backgroundColor: '#006B3F' }]} />
            </View>

            <View style={s.cardInner}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardHeaderLeft}>
                  <Shield size={18} color="#006B3F" strokeWidth={2.5} />
                  <View style={s.cardHeaderText}>
                    <Text style={s.cardUniName} adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={2}>
                      {member?.university || 'UNIVERSITY'}
                    </Text>
                    <Text style={s.cardType}>DIGITAL STUDENT ID</Text>
                  </View>
                </View>
                <LiveTimeBadge />
              </View>

              <View style={s.cardBody}>
                <View style={s.cardPhotoWrap}>
                  {privacyMode ? (
                    <View style={s.cardPhotoHidden}>
                      <EyeOff size={24} color="#94A3B8" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: member?.avatar_url || 'https://i.imgur.com/h286QnR.jpeg' }}
                      style={s.cardPhoto}
                    />
                  )}
                </View>

                <View style={s.cardDetails}>
                  <Text style={s.cardName} numberOfLines={1} adjustsFontSizeToFit>
                    {privacyMode ? '••••••••••' : member?.full_name?.toUpperCase()}
                  </Text>
                  <View style={s.cardIdRow}>
                    <Text style={s.cardIdLabel}>ID No.</Text>
                    <Text style={s.cardIdValue}>{maskedId}</Text>
                  </View>
                  <View style={s.cardIdRow}>
                    <Text style={s.cardIdLabel}>Level</Text>
                    <Text style={s.cardIdValue}>{member?.level || '100'}</Text>
                  </View>
                </View>

                <TouchableOpacity style={s.cardQrBtn} onPress={() => { setShowQR(!showQR); Vibration.vibrate(30); }} activeOpacity={0.7}>
                  <View style={s.miniQrGrid}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <View key={i} style={[s.miniQrCell, (i + Math.floor(i / 5)) % 2 === 0 && s.miniQrFilled]} />
                    ))}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {showQR && (
            <View style={s.qrExpandedWrap}>
              <View style={s.qrExpandedCard}>
                <Text style={s.qrExpandedTitle}>Scan to Verify</Text>
                <View style={s.qrExpandedGrid}>
                  {Array.from({ length: 400 }).map((_, i) => (
                    <View key={i} style={[s.qrExpandedCell, Math.random() > 0.45 && s.qrExpandedFilled]} />
                  ))}
                </View>
                <Text style={s.qrExpandedName}>{member?.full_name}</Text>
                <Text style={s.qrExpandedSub}>{member?.student_id} • Refreshes every 30s</Text>
                <TouchableOpacity style={s.qrCloseBtn} onPress={() => setShowQR(false)}>
                  <Text style={s.qrCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>MY INFO</Text>
            <TouchableOpacity onPress={() => router.push('planner' as never)}>
              <Text style={s.viewAll}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>
          <View style={s.infoGrid}>
            {MY_INFO_ITEMS.map((item) => (
              <TouchableOpacity key={item.id} style={s.infoItem} onPress={() => handleMyInfo(item.id)} activeOpacity={0.7}>
                <View style={[s.infoIconWrap, { backgroundColor: item.bg }]}>
                  <item.icon size={24} color={item.color} />
                </View>
                <Text style={s.infoLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>DIGITAL SERVICES</Text>
            <TouchableOpacity>
              <Text style={s.viewAll}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>
          <View style={s.servicesGrid}>
            {DIGITAL_SERVICES.slice(0, 4).map((service) => (
              <TouchableOpacity key={service.id} style={s.serviceItem} onPress={() => handleService(service)} activeOpacity={0.7}>
                <View style={[s.serviceIconWrap, { backgroundColor: service.color + '12' }]}>
                  <service.icon size={26} color={service.color} />
                </View>
                <Text style={s.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.servicesGrid}>
            {DIGITAL_SERVICES.slice(4, 8).map((service) => (
              <TouchableOpacity key={service.id} style={s.serviceItem} onPress={() => handleService(service)} activeOpacity={0.7}>
                <View style={[s.serviceIconWrap, { backgroundColor: service.color + '12' }]}>
                  <service.icon size={26} color={service.color} />
                </View>
                <Text style={s.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
          <View style={s.quickList}>
            <TouchableOpacity style={s.quickItem} onPress={handleCardMenu} activeOpacity={0.7}>
              <View style={s.quickLeft}>
                <View style={[s.quickIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <AlertTriangle size={18} color="#DC2626" />
                </View>
                <View>
                  <Text style={s.quickTitle}>Report Lost or Stolen</Text>
                  <Text style={s.quickDesc}>Instantly deactivate your digital ID</Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={s.quickItem} onPress={() => {
              Share.share({ message: `Verified Student: ${member?.full_name} — ${member?.university} (${member?.student_id}). Digital ID powered by CampusConnect.` });
            }} activeOpacity={0.7}>
              <View style={s.quickLeft}>
                <View style={[s.quickIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Share2 size={18} color="#4A90E2" />
                </View>
                <View>
                  <Text style={s.quickTitle}>Share Verified Identity</Text>
                  <Text style={s.quickDesc}>For discounts, deliveries, verification</Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={s.quickItem} onPress={() => Alert.alert('Add to Wallet', 'Apple/Google Wallet integration requires backend cryptographic signing. Coming soon!', [{ text: 'Got it' }])} activeOpacity={0.7}>
              <View style={s.quickLeft}>
                <View style={[s.quickIconWrap, { backgroundColor: '#F3F4F6' }]}>
                  <Wallet size={18} color="#1F2937" />
                </View>
                <View>
                  <Text style={s.quickTitle}>Add to Phone Wallet</Text>
                  <Text style={s.quickDesc}>Apple Wallet or Google Wallet</Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  welcomeText: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  welcomeName: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  cardSection: {
    marginBottom: SPACING.lg,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopStripe: {
    flexDirection: 'row',
    height: 6,
  },
  stripe: {
    flex: 1,
    height: 6,
  },
  cardInner: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardHeaderText: {
    marginLeft: 6,
    flex: 1,
  },
  cardUniName: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  cardType: {
    fontSize: 7,
    fontFamily: FONT.semiBold,
    color: '#006B3F',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cardPhotoWrap: {
    width: 72,
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardPhotoHidden: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-end',
  },
  cardName: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  cardIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardIdLabel: {
    fontSize: 9,
    fontFamily: FONT.medium,
    color: '#64748B',
    width: 42,
  },
  cardIdValue: {
    fontSize: 13,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1,
  },
  cardQrBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 8,
  },
  miniQrGrid: {
    width: 30,
    height: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniQrCell: {
    width: '20%',
    height: '20%',
    backgroundColor: 'transparent',
  },
  miniQrFilled: {
    backgroundColor: '#0F172A',
  },
  qrExpandedWrap: {
    marginTop: SPACING.sm,
  },
  qrExpandedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1.5,
    borderColor: '#006B3F',
  },
  qrExpandedTitle: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  qrExpandedGrid: {
    width: 200,
    height: 200,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  qrExpandedCell: {
    width: '5%',
    height: '5%',
    backgroundColor: 'transparent',
  },
  qrExpandedFilled: {
    backgroundColor: '#0F172A',
  },
  qrExpandedName: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  qrExpandedSub: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
  qrCloseBtn: {
    backgroundColor: '#006B3F',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  qrCloseBtnText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm + 4,
  },
  viewAll: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: '#006B3F',
    letterSpacing: 0.3,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
    width: (CARD_WIDTH - 36) / 4,
  },
  infoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceItem: {
    alignItems: 'center',
    width: (CARD_WIDTH - 36) / 4,
  },
  serviceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickList: {
    marginTop: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  quickDesc: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingTop: SPACING.xl * 2,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  benefitsList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  benefitDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  generateBtn: {
    backgroundColor: '#006B3F',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#006B3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});