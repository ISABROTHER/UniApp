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
  ArrowLeft, Shield, Check, Wifi, QrCode, Zap, Clock, MapPin,
  BookOpen, Printer, ShoppingBag, CreditCard, Share2, Download,
  Sun, Moon, Eye, EyeOff, AlertTriangle, Lock, Fingerprint,
  ChevronRight, Building2, Bus, UtensilsCrossed, Dumbbell,
} from 'lucide-react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.xl * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.58;

const BARCODE_PATTERN = [2, 1, 3, 1, 2, 4, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2];

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

const VerifiedBadge = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[badgeStyles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={badgeStyles.outerCircle}>
        <View style={badgeStyles.innerCircle}>
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </View>
      </View>
    </Animated.View>
  );
};

const badgeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 107, 63, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 107, 63, 0.25)',
  },
  innerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#006B3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const HolographicOverlay = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_WIDTH, CARD_WIDTH],
  });

  return (
    <View style={holoStyles.container} pointerEvents="none">
      <Animated.View
        style={[
          holoStyles.shimmerBar,
          { transform: [{ translateX }, { rotate: '20deg' }] },
        ]}
      />
      <View style={holoStyles.holoStrip}>
        <Svg width={CARD_WIDTH} height={28} viewBox={`0 0 ${CARD_WIDTH} 28`}>
          <Defs>
            <LinearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#006B3F" stopOpacity="0.06" />
              <Stop offset="0.2" stopColor="#FCD116" stopOpacity="0.08" />
              <Stop offset="0.4" stopColor="#CE1126" stopOpacity="0.06" />
              <Stop offset="0.6" stopColor="#006B3F" stopOpacity="0.08" />
              <Stop offset="0.8" stopColor="#FCD116" stopOpacity="0.06" />
              <Stop offset="1" stopColor="#CE1126" stopOpacity="0.06" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={CARD_WIDTH} height="28" fill="url(#holoGrad)" />
        </Svg>
      </View>
      <View style={holoStyles.microDotGrid}>
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={[
              holoStyles.microDot,
              {
                left: (i % 6) * (CARD_WIDTH / 6) + 10,
                top: Math.floor(i / 6) * 20 + 5,
                opacity: 0.04 + (i % 3) * 0.02,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const holoStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    overflow: 'hidden',
    borderRadius: 16,
  },
  shimmerBar: {
    position: 'absolute',
    top: -20,
    width: 60,
    height: CARD_HEIGHT + 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  holoStrip: {
    position: 'absolute',
    bottom: 55,
    left: 0,
    right: 0,
    height: 28,
    overflow: 'hidden',
  },
  microDotGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  microDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#006B3F',
  },
});

const LiveTimestamp = () => {
  const [time, setTime] = useState(new Date());
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <View style={liveStyles.container}>
      <Animated.View style={[liveStyles.liveDot, { opacity: blinkAnim }]} />
      <Text style={liveStyles.liveLabel}>LIVE</Text>
      <Text style={liveStyles.timeText}>
        {hours}:{minutes}:{seconds}
      </Text>
    </View>
  );
};

const liveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 107, 63, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 107, 63, 0.15)',
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CE1126',
    marginRight: 3,
  },
  liveLabel: {
    fontSize: 6,
    fontFamily: FONT.bold,
    color: '#CE1126',
    letterSpacing: 1,
    marginRight: 4,
  },
  timeText: {
    fontSize: 8,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1,
  },
});

const GuillochePattern = () => (
  <View style={guillocheStyles.container} pointerEvents="none">
    <Svg width={CARD_WIDTH} height={CARD_HEIGHT} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}>
      <Defs>
        <LinearGradient id="guilGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#006B3F" stopOpacity="0.03" />
          <Stop offset="1" stopColor="#FCD116" stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      {Array.from({ length: 12 }).map((_, i) => (
        <Circle
          key={i}
          cx={CARD_WIDTH * 0.7}
          cy={CARD_HEIGHT * 0.5}
          r={30 + i * 15}
          stroke="url(#guilGrad)"
          strokeWidth={0.5}
          fill="none"
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <Circle
          key={`s${i}`}
          cx={CARD_WIDTH * 0.15}
          cy={CARD_HEIGHT * 0.8}
          r={20 + i * 12}
          stroke="url(#guilGrad)"
          strokeWidth={0.4}
          fill="none"
        />
      ))}
    </Svg>
  </View>
);

const guillocheStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
});

const AppleWalletIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.82 11.78 5.72 12.57 5.72C13.36 5.72 14.85 4.62 16.4 4.8C17.04 4.83 18.83 5.06 19.97 6.7C19.88 6.76 17.64 8.07 17.67 10.82C17.7 14.1 20.53 15.19 20.56 15.2C20.53 15.27 20.11 16.78 18.71 19.5Z"
      fill="#FFFFFF"
    />
    <Path
      d="M15.49 2.2C16.18 1.38 16.65 0.23 16.5 -0.92C15.52 -0.88 14.33 -0.28 13.6 0.55C12.95 1.28 12.38 2.47 12.56 3.59C13.66 3.67 14.79 3.02 15.49 2.2Z"
      fill="#FFFFFF"
    />
  </Svg>
);

const GoogleWalletIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <G>
      <Path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
      <Path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.69 5.84 14.09H2.18V16.94C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <Path d="M5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91V7.06H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.94L5.84 14.09Z" fill="#FBBC05" />
      <Path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.36 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.06L5.84 9.91C6.71 7.31 9.14 5.38 12 5.38Z" fill="#EA4335" />
    </G>
  </Svg>
);

const QUICK_ACTIONS = [
  { id: 'qr', icon: QrCode, label: 'Show QR', color: '#006B3F', bg: '#ECFDF5', route: null },
  { id: 'library', icon: BookOpen, label: 'Library', color: '#4A90E2', bg: '#E0F2FE', route: null },
  { id: 'exam', icon: Shield, label: 'Exam Pass', color: '#7C3AED', bg: '#EDE9FE', route: null },
  { id: 'shuttle', icon: Bus, label: 'Shuttle', color: '#F59E0B', bg: '#FEF3C7', route: 'shuttle' },
] as const;

const CAMPUS_ACCESS_ITEMS = [
  { id: 'library', icon: BookOpen, label: 'Library Access', desc: 'Tap to enter Sam Jonah Library', color: '#4A90E2', lastUsed: '2 hrs ago' },
  { id: 'exam', icon: Shield, label: 'Exam Verification', desc: 'Present for exam hall entry', color: '#7C3AED', lastUsed: 'Last Monday' },
  { id: 'shuttle', icon: Bus, label: 'Campus Shuttle', desc: 'Board with digital tap', color: '#F59E0B', lastUsed: 'Yesterday' },
  { id: 'dining', icon: UtensilsCrossed, label: 'Dining Hall', desc: 'Meal plan balance: 42 meals', color: '#16A34A', lastUsed: 'Today' },
  { id: 'gym', icon: Dumbbell, label: 'Sports Complex', desc: 'Gym & facility access', color: '#DC2626', lastUsed: '3 days ago' },
  { id: 'print', icon: Printer, label: 'Print Station', desc: 'Print credits: 120 pages', color: '#0284C7', lastUsed: 'Today' },
];

const ADVANTAGES = [
  { icon: Lock, title: 'Cannot Be Faked', desc: 'Live timestamp + biometric lock makes screenshots useless' },
  { icon: Zap, title: 'Instant Replace', desc: 'Lost your phone? Deactivate remotely, reactivate on new device' },
  { icon: Clock, title: 'Always With You', desc: 'No more forgetting your card at home — it\'s on your phone' },
  { icon: Eye, title: 'Privacy Mode', desc: 'Hide sensitive details with one tap when in public' },
];

export default function StudentIDScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [digitalID, setDigitalID] = useState<DigitalStudentID | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'access' | 'history'>('card');
  const flipAnim = useRef(new Animated.Value(0)).current;
  const qrSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDigitalID();
  }, []);

  const loadDigitalID = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('digital_student_ids')
        .select('*')
        .eq('user_id', member?.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

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

  const flipCard = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const togglePrivacyMode = () => {
    Vibration.vibrate(50);
    setPrivacyMode(!privacyMode);
  };

  const toggleQR = () => {
    const toValue = showQR ? 0 : 1;
    Animated.spring(qrSlideAnim, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setShowQR(!showQR);
    if (!showQR) Vibration.vibrate(30);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My verified student ID: ${member?.full_name} — ${member?.university} (${member?.student_id}). Verified via CampusConnect Digital ID.`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleReportLost = () => {
    Alert.alert(
      'Report Card Lost/Stolen',
      'This will instantly deactivate your digital ID and prevent anyone from using it. You can reactivate on this device or a new device anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate Now',
          style: 'destructive',
          onPress: () => {
            Alert.alert('ID Deactivated', 'Your digital student ID has been deactivated. You can reactivate it anytime from this screen.');
          },
        },
      ]
    );
  };

  const handleQuickAction = (actionId: string, route: string | null) => {
    if (actionId === 'qr') {
      toggleQR();
      return;
    }
    if (route) {
      router.push(route as never);
      return;
    }
    Alert.alert(
      'Coming Soon',
      'This campus access feature will be available once your university activates digital ID scanning.',
      [{ text: 'Got it' }]
    );
  };

  const handleAddToWallet = (type: 'apple' | 'google') => {
    Alert.alert(
      `${type === 'apple' ? 'Apple Wallet' : 'Google Wallet'} Integration`,
      `Generating a secure .pkpass file for ${type === 'apple' ? 'Apple Wallet' : 'Google Wallet'} requires a backend cryptographic signature. This feature will be active once the backend service is deployed!`,
      [{ text: 'Got it', style: 'cancel' }]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const cardScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.95, 1],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [1, 0, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const backTransform = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const qrTranslateY = qrSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 0],
  });

  const qrOpacity = qrSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const nameParts = member?.full_name?.trim().split(' ') || [];
  const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : (nameParts[0]?.toUpperCase() || 'UNKNOWN');
  const givenNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ').toUpperCase() : '';
  const maskedId = privacyMode ? member?.student_id?.replace(/./g, '•') : member?.student_id;
  const maskedName = privacyMode ? '••••••••' : undefined;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Digital Student ID</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!digitalID) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Digital Student ID</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Shield size={64} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Digital ID</Text>
          <Text style={styles.emptyDescription}>
            Generate your digital student ID card to access campus services and verify your identity.
          </Text>

          <View style={styles.advantagesList}>
            {ADVANTAGES.map((item, idx) => (
              <View key={idx} style={styles.advantageRow}>
                <View style={styles.advantageIconWrap}>
                  <item.icon size={18} color="#006B3F" />
                </View>
                <View style={styles.advantageText}>
                  <Text style={styles.advantageTitle}>{item.title}</Text>
                  <Text style={styles.advantageDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateDigitalID}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.generateButtonText}>Generate Digital ID</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Student ID</Text>
        <TouchableOpacity style={styles.backButton} onPress={togglePrivacyMode}>
          {privacyMode ? (
            <EyeOff size={22} color={COLORS.textSecondary} />
          ) : (
            <Eye size={22} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showQR && (
          <Animated.View style={[styles.qrOverlay, { transform: [{ translateY: qrTranslateY }], opacity: qrOpacity }]}>
            <View style={styles.qrOverlayCard}>
              <Text style={styles.qrOverlayTitle}>Scan to Verify Identity</Text>
              <View style={styles.qrOverlayGrid}>
                {Array.from({ length: 100 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.qrOverlayPixel,
                      Math.random() > 0.4 && styles.qrOverlayPixelFilled,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.qrOverlaySub}>{member?.full_name} • {member?.student_id}</Text>
              <Text style={styles.qrOverlayHint}>QR refreshes every 30 seconds for security</Text>
              <TouchableOpacity style={styles.qrOverlayClose} onPress={toggleQR}>
                <Text style={styles.qrOverlayCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <TouchableOpacity
          activeOpacity={0.95}
          onPress={flipCard}
          style={styles.cardWrapper}
        >
          <Animated.View
            style={[
              styles.cardContainer,
              { transform: [{ scale: cardScale }] }
            ]}
          >
            <Animated.View style={[styles.cardSide, styles.cardFront, { opacity: frontOpacity }]}>
              <View style={styles.ghanaRibbon}>
                <View style={[styles.ribbonStripe, { backgroundColor: '#CE1126' }]} />
                <View style={[styles.ribbonStripe, { backgroundColor: '#FCD116' }]} />
                <View style={[styles.ribbonStripe, { backgroundColor: '#006B3F' }]} />
              </View>

              <GuillochePattern />
              <HolographicOverlay />

              <View style={styles.watermarkContainer}>
                <Shield size={280} color="rgba(0, 0, 0, 0.03)" strokeWidth={1} />
              </View>

              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Shield size={28} color="#006B3F" strokeWidth={2.5} />
                  <View style={styles.headerTextGroup}>
                    <Text style={styles.universityName} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {member?.university || 'UNIVERSITY'}
                    </Text>
                    <Text style={styles.cardSubtitle}>DIGITAL STUDENT ID</Text>
                  </View>
                </View>
              </View>

              <View style={styles.photoSection}>
                <View style={styles.photoFrame}>
                  {privacyMode ? (
                    <View style={styles.photoHidden}>
                      <EyeOff size={32} color="#94A3B8" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: member?.avatar_url || 'https://i.imgur.com/h286QnR.jpeg' }}
                      style={styles.photoImage}
                    />
                  )}
                </View>
                <View style={styles.photoSideInfo}>
                  <VerifiedBadge />
                  <View style={styles.smartChip}>
                    <View style={styles.chipLineHorizontal} />
                    <View style={styles.chipLineVerticalLeft} />
                    <View style={styles.chipLineVerticalRight} />
                    <View style={styles.chipInnerRect} />
                  </View>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.nameRow}>
                  <View style={styles.nameBlock}>
                    <Text style={styles.labelMicro}>SURNAME</Text>
                    <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit>
                      {maskedName || surname}
                    </Text>
                  </View>
                  {givenNames ? (
                    <View style={styles.nameBlock}>
                      <Text style={styles.labelMicro}>GIVEN NAMES</Text>
                      <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit>
                        {maskedName || givenNames}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.labelMicro}>ID NUMBER</Text>
                    <Text style={styles.idNumber} numberOfLines={1} adjustsFontSizeToFit>{maskedId}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.labelMicro}>LEVEL</Text>
                    <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit>{member?.level || '100'}</Text>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <View style={styles.dateItem}>
                    <Text style={styles.labelMicro}>ISSUED</Text>
                    <Text style={styles.dateValue} numberOfLines={1} adjustsFontSizeToFit>{formatDate(digitalID.issued_at)}</Text>
                  </View>
                  <View style={styles.dateItem}>
                    <Text style={styles.labelMicro}>EXPIRES</Text>
                    <Text style={styles.dateValue} numberOfLines={1} adjustsFontSizeToFit>{formatDate(digitalID.expires_at)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.barcodeWrapper}>
                  {BARCODE_PATTERN.map((w, i) => (
                    <View key={i} style={[styles.barcodeLine, { width: w }]} />
                  ))}
                </View>
                <LiveTimestamp />
              </View>

              <View style={styles.cardEdgeHighlight} />
            </Animated.View>

            <Animated.View
              style={[
                styles.cardSide,
                styles.cardBack,
                { opacity: backOpacity, transform: [{ rotateY: backTransform }] },
              ]}
            >
              <View style={styles.ghanaRibbon}>
                <View style={[styles.ribbonStripe, { backgroundColor: '#CE1126' }]} />
                <View style={[styles.ribbonStripe, { backgroundColor: '#FCD116' }]} />
                <View style={[styles.ribbonStripe, { backgroundColor: '#006B3F' }]} />
              </View>

              <View style={styles.magStripe} />

              <View style={styles.backContent}>
                <Text style={styles.backDisclaimer} adjustsFontSizeToFit>
                  This card is the property of {member?.university}. It must be returned upon graduation, withdrawal, or upon request by university officials.
                </Text>

                <View style={styles.signatureBox}>
                  <Text style={styles.signatureLabel} numberOfLines={1}>AUTHORIZED SIGNATURE</Text>
                  <Text style={styles.signatureCursive} numberOfLines={1} adjustsFontSizeToFit>{member?.full_name}</Text>
                </View>

                <View style={styles.qrRow}>
                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrCodeGrid}>
                      {Array.from({ length: 100 }).map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.qrPixel,
                            Math.random() > 0.4 && styles.qrPixelFilled,
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.qrDetails}>
                    <Text style={styles.qrTitle} numberOfLines={1} adjustsFontSizeToFit>SCAN TO VERIFY</Text>
                    <Text style={styles.qrSub} numberOfLines={2} adjustsFontSizeToFit>Official University{"\n"}Validation Code</Text>
                    <View style={styles.backStatusBadge}>
                      <Check size={10} color={COLORS.white} strokeWidth={3} />
                      <Text style={styles.backStatusText} numberOfLines={1}>VERIFIED SECURE</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.microPrint} numberOfLines={1} adjustsFontSizeToFit>
                  {digitalID.id} • {digitalID.student_number} • DO NOT DUPLICATE
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.flipHint}>Tap card to flip</Text>

        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={() => handleQuickAction(action.id, action.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                <action.icon size={20} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabBar}>
          {(['card', 'access', 'history'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'card' ? 'Wallet' : tab === 'access' ? 'Campus Access' : 'Activity'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'card' && (
          <View>
            <View style={styles.walletSection}>
              <TouchableOpacity
                style={[styles.walletButton, styles.appleWalletButton]}
                onPress={() => handleAddToWallet('apple')}
                activeOpacity={0.8}
              >
                <View style={styles.walletIconWrap}>
                  <AppleWalletIcon />
                </View>
                <View style={styles.walletTextGroup}>
                  <Text style={styles.walletLabelSmall}>Add to</Text>
                  <Text style={styles.walletLabelBig}>Apple Wallet</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.walletButton, styles.googleWalletButton]}
                onPress={() => handleAddToWallet('google')}
                activeOpacity={0.8}
              >
                <View style={styles.walletIconWrap}>
                  <GoogleWalletIcon />
                </View>
                <View style={styles.walletTextGroup}>
                  <Text style={styles.walletLabelSmall}>Add to</Text>
                  <Text style={styles.walletLabelBig}>Google Wallet</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
                <Share2 size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Share ID</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleReportLost} activeOpacity={0.7}>
                <AlertTriangle size={18} color="#DC2626" />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Report Lost</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securityInfoCard}>
              <View style={styles.securityInfoHeader}>
                <Lock size={16} color="#006B3F" />
                <Text style={styles.securityInfoTitle}>Why Digital Beats Physical</Text>
              </View>
              {ADVANTAGES.map((item, idx) => (
                <View key={idx} style={styles.securityInfoRow}>
                  <item.icon size={15} color="#64748B" />
                  <View style={styles.securityInfoTextWrap}>
                    <Text style={styles.securityInfoRowTitle}>{item.title}</Text>
                    <Text style={styles.securityInfoRowDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'access' && (
          <View style={styles.accessSection}>
            {CAMPUS_ACCESS_ITEMS.map((item) => (
              <TouchableOpacity key={item.id} style={styles.accessCard} activeOpacity={0.7}
                onPress={() => Alert.alert('Coming Soon', `${item.label} will be available once your university activates digital ID scanning.`)}>
                <View style={[styles.accessIconWrap, { backgroundColor: item.color + '15' }]}>
                  <item.icon size={22} color={item.color} />
                </View>
                <View style={styles.accessInfo}>
                  <Text style={styles.accessLabel}>{item.label}</Text>
                  <Text style={styles.accessDesc}>{item.desc}</Text>
                </View>
                <View style={styles.accessRight}>
                  <Text style={styles.accessLastUsed}>{item.lastUsed}</Text>
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historySection}>
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: '#16A34A' }]} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyAction}>ID Verified at Library</Text>
                <Text style={styles.historyTime}>Today, 2:34 PM</Text>
              </View>
            </View>
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: '#4A90E2' }]} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyAction}>Exam Hall Check-in</Text>
                <Text style={styles.historyTime}>Yesterday, 9:00 AM</Text>
              </View>
            </View>
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: '#F59E0B' }]} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyAction}>Campus Shuttle Boarding</Text>
                <Text style={styles.historyTime}>Mon, 7:45 AM</Text>
              </View>
            </View>
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: '#7C3AED' }]} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyAction}>Digital ID Generated</Text>
                <Text style={styles.historyTime}>{formatDate(digitalID.issued_at)}</Text>
              </View>
            </View>
            <View style={styles.historyEmptyNote}>
              <Text style={styles.historyEmptyText}>Full scan history appears here as you use your digital ID across campus</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  advantagesList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  advantageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  advantageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  advantageText: {
    flex: 1,
  },
  advantageTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  advantageDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    minWidth: 200,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  cardWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
    perspective: 1000,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardSide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backfaceVisibility: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    overflow: 'hidden',
  },
  cardEdgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardFront: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ghanaRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 9,
    flexDirection: 'column',
    zIndex: 10,
  },
  ribbonStripe: {
    flex: 1,
    width: '100%',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -60,
    bottom: -40,
    opacity: 0.05,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextGroup: {
    marginLeft: 8,
    flex: 1,
  },
  universityName: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 8,
    fontFamily: FONT.semiBold,
    color: '#006B3F',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    zIndex: 10,
  },
  photoFrame: {
    width: 120,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  photoImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 5,
    resizeMode: 'cover',
  },
  photoHidden: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSideInfo: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    gap: 16,
  },
  smartChip: {
    width: 42,
    height: 30,
    backgroundColor: '#FCD116',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#997A00',
  },
  chipLineHorizontal: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#B8860B' },
  chipLineVerticalLeft: { position: 'absolute', left: '30%', top: 0, bottom: 0, width: 1, backgroundColor: '#B8860B' },
  chipLineVerticalRight: { position: 'absolute', right: '30%', top: 0, bottom: 0, width: 1, backgroundColor: '#B8860B' },
  chipInnerRect: { position: 'absolute', top: '25%', left: '35%', width: '30%', height: '50%', borderWidth: 1, borderColor: '#B8860B', borderRadius: 2 },
  infoSection: {
    flex: 1,
    zIndex: 10,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 16,
  },
  nameBlock: {
    flex: 1,
  },
  labelMicro: {
    fontSize: 7,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  studentName: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: '#0F172A',
    lineHeight: 17,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  idNumber: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateItem: {
    flex: 1,
  },
  dateValue: {
    fontSize: 10,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    zIndex: 10,
  },
  barcodeWrapper: {
    flexDirection: 'row',
    height: 22,
    alignItems: 'center',
    opacity: 0.8,
    flexShrink: 1,
    overflow: 'hidden',
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: '#0F172A',
    marginRight: 2,
  },
  cardBack: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  magStripe: {
    width: '100%',
    height: 45,
    backgroundColor: '#0F172A',
    marginTop: SPACING.xl,
  },
  backContent: {
    padding: SPACING.lg,
    flex: 1,
    justifyContent: 'space-between',
  },
  backDisclaimer: {
    fontSize: 9,
    fontFamily: FONT.regular,
    color: '#475569',
    lineHeight: 13,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    flexShrink: 1,
  },
  signatureBox: {
    backgroundColor: '#F8FAFC',
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: SPACING.sm,
  },
  signatureLabel: {
    position: 'absolute',
    top: -14,
    left: 0,
    fontSize: 8,
    fontFamily: FONT.semiBold,
    color: '#64748B',
  },
  signatureCursive: {
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
    fontSize: 20,
    color: '#0F172A',
    fontStyle: 'italic',
    flexShrink: 1,
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexShrink: 1,
  },
  qrCodeContainer: {
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  qrCodeGrid: {
    width: 70,
    height: 70,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrPixel: {
    width: '10%',
    height: '10%',
    backgroundColor: 'transparent',
  },
  qrPixelFilled: {
    backgroundColor: '#000000',
  },
  qrDetails: {
    flex: 1,
    justifyContent: 'center',
    flexShrink: 1,
  },
  qrTitle: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  qrSub: {
    fontSize: 9,
    fontFamily: FONT.regular,
    color: '#475569',
    marginVertical: 4,
    flexShrink: 1,
  },
  backStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006B3F',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginTop: 4,
  },
  backStatusText: {
    fontSize: 8,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  microPrint: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: SPACING.xs,
    flexShrink: 1,
  },
  flipHint: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabItemActive: {
    backgroundColor: '#006B3F',
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: FONT.semiBold,
  },
  walletSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: 2,
  },
  walletButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  appleWalletButton: {
    backgroundColor: '#000000',
    marginRight: SPACING.sm,
  },
  googleWalletButton: {
    backgroundColor: '#1F1F1F',
    marginLeft: SPACING.sm,
    borderWidth: 1,
    borderColor: '#333333',
  },
  walletIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walletTextGroup: {
    flexDirection: 'column',
  },
  walletLabelSmall: {
    fontSize: 9,
    fontFamily: FONT.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.3,
    lineHeight: 12,
  },
  walletLabelBig: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  securityInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  securityInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  securityInfoTitle: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  securityInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  securityInfoTextWrap: {
    flex: 1,
  },
  securityInfoRowTitle: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  securityInfoRowDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  accessSection: {
    gap: 8,
  },
  accessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  accessIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accessInfo: {
    flex: 1,
  },
  accessLabel: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  accessDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  accessRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  accessLastUsed: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
  },
  historySection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyAction: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  historyTime: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  historyEmptyNote: {
    paddingTop: 12,
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  qrOverlay: {
    marginBottom: SPACING.md,
    zIndex: 20,
  },
  qrOverlayCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#006B3F',
  },
  qrOverlayTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  qrOverlayGrid: {
    width: 180,
    height: 180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  qrOverlayPixel: {
    width: '5%',
    height: '5%',
    backgroundColor: 'transparent',
  },
  qrOverlayPixelFilled: {
    backgroundColor: '#000000',
  },
  qrOverlaySub: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  qrOverlayHint: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
  qrOverlayClose: {
    backgroundColor: '#006B3F',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  qrOverlayCloseText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: '#FFFFFF',
  },
});