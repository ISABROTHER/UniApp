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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Check, Wifi } from 'lucide-react-native';
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

const SecurityRing = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[ringStyles.ringContainer, { transform: [{ scale: pulseAnim }] }]}>
      <Animated.View style={[ringStyles.outerRing, { transform: [{ rotate }] }]}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Defs>
            <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#006B3F" stopOpacity="1" />
              <Stop offset="0.25" stopColor="#FCD116" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#006B3F" stopOpacity="1" />
              <Stop offset="0.75" stopColor="#CE1126" stopOpacity="1" />
              <Stop offset="1" stopColor="#006B3F" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle cx="36" cy="36" r="33" stroke="url(#ringGrad)" strokeWidth="3" fill="none" strokeDasharray="8 4" />
          <Circle cx="36" cy="36" r="28" stroke="#006B3F" strokeWidth="0.5" fill="none" strokeOpacity={0.3} />
        </Svg>
      </Animated.View>
      <View style={ringStyles.innerBadge}>
        <View style={ringStyles.activeIndicator} />
        <Text style={ringStyles.validText}>VALID</Text>
      </View>
    </Animated.View>
  );
};

const ringStyles = StyleSheet.create({
  ringContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 107, 63, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 107, 63, 0.3)',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006B3F',
    marginRight: 5,
  },
  validText: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: '#006B3F',
    letterSpacing: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 107, 63, 0.15)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CE1126',
    marginRight: 4,
  },
  liveLabel: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: '#CE1126',
    letterSpacing: 1,
    marginRight: 5,
  },
  timeText: {
    fontSize: 9,
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

export default function StudentIDScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [digitalID, setDigitalID] = useState<DigitalStudentID | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleAddToWallet = (type: 'apple' | 'google') => {
    Alert.alert(
      `${type === 'apple' ? 'Apple Wallet' : 'Google Wallet'} Integration`,
      `Generating a secure .pkpass file for ${type === 'apple' ? 'Apple Wallet' : 'Google Wallet'} requires a backend cryptographic signature. This feature will be active once the backend service is deployed!`,
      [{ text: 'Got it', style: 'cancel' }]
    );
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

  const nameParts = member?.full_name?.trim().split(' ') || [];
  const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : (nameParts[0]?.toUpperCase() || 'UNKNOWN');
  const givenNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ').toUpperCase() : '';

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
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                  <Shield size={32} color="#006B3F" strokeWidth={2.5} />
                  <View style={styles.headerTextGroup}>
                    <Text style={styles.universityName} numberOfLines={1} adjustsFontSizeToFit>
                      {member?.university || 'UNIVERSITY'}
                    </Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1} adjustsFontSizeToFit>STUDENT IDENTIFICATION</Text>
                  </View>
                </View>
                <LiveTimestamp />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.bodyLeft}>
                  <View style={styles.photoFrame}>
                    <Image
                      source={{ uri: 'https://i.imgur.com/h286QnR.jpeg' }}
                      style={styles.photoImage}
                    />
                  </View>

                  <View style={styles.smartChip}>
                    <View style={styles.chipLineHorizontal} />
                    <View style={styles.chipLineVerticalLeft} />
                    <View style={styles.chipLineVerticalRight} />
                    <View style={styles.chipInnerRect} />
                  </View>
                </View>

                <View style={styles.bodyRight}>
                  <View style={styles.detailBlock}>
                    <Text style={styles.labelMicro} numberOfLines={1}>SURNAME</Text>
                    <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit>
                      {surname}
                    </Text>
                  </View>

                  {givenNames ? (
                    <View style={styles.detailBlock}>
                      <Text style={styles.labelMicro} numberOfLines={1}>GIVEN NAMES</Text>
                      <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit>
                        {givenNames}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.detailBlock}>
                    <Text style={styles.labelMicro} numberOfLines={1}>IDENTIFICATION NO.</Text>
                    <Text style={styles.idNumber} numberOfLines={1} adjustsFontSizeToFit>{member?.student_id}</Text>
                  </View>

                  <View style={styles.detailBlock}>
                    <Text style={styles.labelMicro} numberOfLines={1}>ACADEMIC LEVEL</Text>
                    <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit>LEVEL {member?.level || '100'}</Text>
                  </View>

                  <View style={styles.datesRow}>
                    <View style={styles.dateItem}>
                      <Text style={styles.labelMicro} numberOfLines={1}>ISSUED</Text>
                      <Text style={styles.dateValue} numberOfLines={1} adjustsFontSizeToFit>{formatDate(digitalID.issued_at)}</Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text style={styles.labelMicro} numberOfLines={1}>EXPIRES</Text>
                      <Text style={styles.dateValue} numberOfLines={1} adjustsFontSizeToFit>{formatDate(digitalID.expires_at)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.barcodeWrapper}>
                  {BARCODE_PATTERN.map((w, i) => (
                    <View key={i} style={[styles.barcodeLine, { width: w }]} />
                  ))}
                </View>

                <SecurityRing />
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
    marginBottom: SPACING.xl,
    lineHeight: 24,
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
    marginBottom: SPACING.md,
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
    padding: SPACING.lg,
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    marginTop: 12,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingRight: SPACING.sm,
  },
  headerTextGroup: {
    marginLeft: SPACING.sm,
    flexShrink: 1,
  },
  universityName: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 1,
    flexShrink: 1,
  },
  cardSubtitle: {
    fontSize: 9,
    fontFamily: FONT.medium,
    color: '#006B3F',
    letterSpacing: 1.2,
    marginTop: 2,
    flexShrink: 1,
  },
  cardBody: {
    flexDirection: 'row',
    flex: 1,
    marginTop: SPACING.sm,
    zIndex: 10,
  },
  bodyLeft: {
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
    width: 90,
  },
  photoFrame: {
    width: 90,
    height: 115,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    padding: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  photoImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 5,
    resizeMode: 'cover',
  },
  smartChip: {
    width: 42,
    height: 30,
    backgroundColor: '#FCD116',
    borderRadius: 6,
    marginTop: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#997A00',
  },
  chipLineHorizontal: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#B8860B' },
  chipLineVerticalLeft: { position: 'absolute', left: '30%', top: 0, bottom: 0, width: 1, backgroundColor: '#B8860B' },
  chipLineVerticalRight: { position: 'absolute', right: '30%', top: 0, bottom: 0, width: 1, backgroundColor: '#B8860B' },
  chipInnerRect: { position: 'absolute', top: '25%', left: '35%', width: '30%', height: '50%', borderWidth: 1, borderColor: '#B8860B', borderRadius: 2 },
  bodyRight: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  labelMicro: {
    fontSize: 8,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
    flexShrink: 1,
  },
  studentName: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: '#0F172A',
    lineHeight: 18,
    flexShrink: 1,
  },
  detailBlock: {
    flexShrink: 1,
  },
  idNumber: {
    fontSize: 15,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
    flexShrink: 1,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
    flexShrink: 1,
  },
  datesRow: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  dateItem: {
    marginRight: SPACING.md,
    flexShrink: 1,
    flex: 1,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    zIndex: 10,
  },
  barcodeWrapper: {
    flexDirection: 'row',
    height: 24,
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
  walletSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
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
  flipHint: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});