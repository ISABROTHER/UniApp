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
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Check, Calendar, CreditCard, Link2, Wifi, Smartphone, Wallet } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.xl * 2;
// Standard physical ID card ratio is slightly wider, adjusted for realistic proportions
const CARD_HEIGHT = CARD_WIDTH * 1.58; 

// Fixed sequence for a stable, realistic looking barcode pattern
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

  const getInitials = () => {
    if (!member?.full_name) return 'ST';
    const names = member.full_name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleAddToWallet = (type: 'apple' | 'google') => {
    Alert.alert(
      `${type === 'apple' ? 'Apple Wallet' : 'Google Pay'} Integration`,
      `Generating a secure .pkpass file for ${type === 'apple' ? 'Apple Wallet' : 'Google Pay'} requires a backend cryptographic signature. This feature will be active once the backend service is deployed!`,
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
            {/* FRONT OF CARD */}
            <Animated.View style={[styles.cardSide, styles.cardFront, { opacity: frontOpacity }]}>
              {/* Holographic watermark background */}
              <View style={styles.watermarkContainer}>
                <Shield size={280} color="rgba(255, 255, 255, 0.03)" strokeWidth={1} />
              </View>

              {/* Realistic Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Shield size={28} color={COLORS.gold} strokeWidth={2.5} />
                  <View style={styles.headerTextGroup}>
                    <Text style={styles.universityName} numberOfLines={1} adjustsFontSizeToFit>
                      {member?.university || 'UNIVERSITY'}
                    </Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1} adjustsFontSizeToFit>STUDENT IDENTIFICATION</Text>
                  </View>
                </View>
                <Wifi size={20} color={COLORS.white} opacity={0.5} style={{ transform: [{ rotate: '90deg' }], flexShrink: 0, marginLeft: 8 }} />
              </View>

              <View style={styles.cardBody}>
                {/* Left Column: Photo & Chip */}
                <View style={styles.bodyLeft}>
                  <View style={styles.photoFrame}>
                    <View style={styles.photoInner}>
                      <Text style={styles.initialsText} adjustsFontSizeToFit numberOfLines={1}>
                        {getInitials()}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Simulated Smart Card EMV Chip */}
                  <View style={styles.smartChip}>
                    <View style={styles.chipLineHorizontal} />
                    <View style={styles.chipLineVerticalLeft} />
                    <View style={styles.chipLineVerticalRight} />
                    <View style={styles.chipInnerRect} />
                  </View>
                </View>

                {/* Right Column: Details */}
                <View style={styles.bodyRight}>
                  <Text style={styles.labelMicro} numberOfLines={1}>SURNAME, GIVEN NAMES</Text>
                  <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit>
                    {member?.full_name?.toUpperCase()}
                  </Text>
                  
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
                {/* Simulated physical Barcode */}
                <View style={styles.barcodeWrapper}>
                  {BARCODE_PATTERN.map((w, i) => (
                    <View key={i} style={[styles.barcodeLine, { width: w }]} />
                  ))}
                </View>
                
                <View style={styles.activePill}>
                  <View style={styles.activeIndicator} />
                  <Text style={styles.activePillText} numberOfLines={1}>VALID</Text>
                </View>
              </View>

              {/* Edge highlight to simulate physical card thickness */}
              <View style={styles.cardEdgeHighlight} />
            </Animated.View>

            {/* BACK OF CARD */}
            <Animated.View
              style={[
                styles.cardSide,
                styles.cardBack,
                { opacity: backOpacity, transform: [{ rotateY: backTransform }] },
              ]}
            >
              {/* Magnetic Stripe */}
              <View style={styles.magStripe} />

              <View style={styles.backContent}>
                <Text style={styles.backDisclaimer} adjustsFontSizeToFit>
                  This card is the property of {member?.university}. It must be returned upon graduation, withdrawal, or upon request by university officials.
                </Text>

                {/* Signature Box */}
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

        {/* Digital Wallet Integration Buttons */}
        <View style={styles.walletSection}>
          <TouchableOpacity 
            style={[styles.walletButton, styles.appleWalletButton]} 
            onPress={() => handleAddToWallet('apple')}
          >
            <Wallet size={20} color="#FFFFFF" style={styles.walletIcon} />
            <Text style={styles.walletButtonText}>Add to Apple Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.walletButton, styles.googleWalletButton]} 
            onPress={() => handleAddToWallet('google')}
          >
            <Smartphone size={20} color="#FFFFFF" style={styles.walletIcon} />
            <Text style={styles.walletButtonText}>Add to Google Pay</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>ID Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Student Number</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{digitalID.student_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>University</Text>
            <Text style={styles.detailValue} numberOfLines={2}>{digitalID.university}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue Date</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{formatDate(digitalID.issued_at)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry Date</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{formatDate(digitalID.expires_at)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.activeStatusBadgeWrapper}>
              <Check size={12} color={COLORS.success} strokeWidth={3} />
              <Text style={styles.activeStatusTextWrapper}>Active</Text>
            </View>
          </View>
        </View>

        <View style={styles.ghanaCardSection}>
          <View style={styles.ghanaCardHeader}>
            <CreditCard size={20} color={COLORS.navy} style={styles.ghanaCardIcon} />
            <Text style={styles.ghanaCardTitle} numberOfLines={1}>Ghana Card Linking</Text>
          </View>
          <Text style={styles.ghanaCardDesc}>
            Link your Ghana Card number for national ID verification. This enables future integrations with government services.
          </Text>
          {member?.ghana_card_number ? (
            <View style={styles.ghanaCardLinked}>
              <Link2 size={16} color={COLORS.success} style={styles.ghanaCardIcon} />
              <Text style={styles.ghanaCardLinkedText} numberOfLines={1}>
                Ghana Card linked: {member.ghana_card_number.slice(0, 6)}****
              </Text>
            </View>
          ) : (
            <View style={styles.ghanaCardInput}>
              <TextInput
                style={styles.ghanaCardTextInput}
                placeholder="GHA-XXXXXXXXX-X"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TouchableOpacity style={styles.ghanaCardLinkBtn}>
                <Text style={styles.ghanaCardLinkBtnText}>Link</Text>
              </TouchableOpacity>
            </View>
          )}
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
  
  /* --- PREMIUM FRONT DESIGN --- */
  cardFront: {
    backgroundColor: '#0B1120', // Deep Onyx
    padding: SPACING.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -60,
    bottom: -40,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
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
    fontSize: 14,
    fontFamily: FONT.bold,
    color: COLORS.white,
    letterSpacing: 1,
    flexShrink: 1,
  },
  cardSubtitle: {
    fontSize: 9,
    fontFamily: FONT.medium,
    color: COLORS.gold,
    letterSpacing: 1.2,
    marginTop: 2,
    flexShrink: 1,
  },
  cardBody: {
    flexDirection: 'row',
    flex: 1,
    marginTop: SPACING.xs,
  },
  bodyLeft: {
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
    width: 80, // strict constraint to prevent push
  },
  photoFrame: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)', // Gold tint
  },
  photoInner: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 28,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  smartChip: {
    width: 38,
    height: 28,
    backgroundColor: '#D4AF37', // Pure Gold
    borderRadius: 6,
    marginTop: SPACING.md,
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
    justifyContent: 'flex-start',
  },
  labelMicro: {
    fontSize: 8,
    fontFamily: FONT.semiBold,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginBottom: 2,
    flexShrink: 1,
  },
  studentName: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.white,
    marginBottom: SPACING.sm,
    lineHeight: 20,
    flexShrink: 1,
  },
  detailBlock: {
    marginBottom: SPACING.sm,
    flexShrink: 1,
  },
  idNumber: {
    fontSize: 15,
    fontFamily: 'Courier', // Monospace feel for ID
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 2,
    flexShrink: 1,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
    flexShrink: 1,
  },
  datesRow: {
    flexDirection: 'row',
    marginTop: 2,
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
    color: COLORS.white,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
  },
  barcodeWrapper: {
    flexDirection: 'row',
    height: 20,
    alignItems: 'center',
    opacity: 0.6,
    flexShrink: 1,
    overflow: 'hidden',
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: COLORS.white,
    marginRight: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexShrink: 0,
    marginLeft: SPACING.sm,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },
  activePillText: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: COLORS.success,
    letterSpacing: 1,
  },

  /* --- PREMIUM BACK DESIGN --- */
  cardBack: {
    backgroundColor: '#F8FAFC', // Crisp white/silver
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  magStripe: {
    width: '100%',
    height: 40,
    backgroundColor: '#0F172A',
    marginTop: SPACING.lg,
  },
  backContent: {
    padding: SPACING.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  backDisclaimer: {
    fontSize: 8,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 12,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    flexShrink: 1,
  },
  signatureBox: {
    backgroundColor: COLORS.white,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
  },
  signatureLabel: {
    position: 'absolute',
    top: -12,
    left: 0,
    fontSize: 7,
    fontFamily: FONT.semiBold,
    color: COLORS.textTertiary,
  },
  signatureCursive: {
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
    fontSize: 18,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexShrink: 1,
  },
  qrCodeContainer: {
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  qrCodeGrid: {
    width: 60,
    height: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrPixel: {
    width: '10%',
    height: '10%',
    backgroundColor: 'transparent',
  },
  qrPixelFilled: {
    backgroundColor: COLORS.navy,
  },
  qrDetails: {
    flex: 1,
    justifyContent: 'center',
    flexShrink: 1,
  },
  qrTitle: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  qrSub: {
    fontSize: 8,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginVertical: 2,
    flexShrink: 1,
  },
  backStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginTop: 2,
  },
  backStatusText: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: COLORS.white,
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  microPrint: {
    fontSize: 6,
    fontFamily: 'Courier',
    color: COLORS.textTertiary,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: SPACING.xs,
    flexShrink: 1,
  },

  /* --- WALLET BUTTONS --- */
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
    borderRadius: RADIUS.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appleWalletButton: {
    backgroundColor: '#000000',
    marginRight: SPACING.sm,
  },
  googleWalletButton: {
    backgroundColor: '#202124',
    marginLeft: SPACING.sm,
  },
  walletIcon: {
    marginRight: 6,
  },
  walletButtonText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  /* --- OTHER UI ELEMENTS --- */
  flipHint: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: SPACING.sm,
  },
  activeStatusBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.xs,
    flexShrink: 0,
  },
  activeStatusTextWrapper: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.success,
    marginLeft: 4,
  },
  ghanaCardSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghanaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ghanaCardIcon: {
    marginRight: 8,
  },
  ghanaCardTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  ghanaCardDesc: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: SPACING.md,
    flexShrink: 1,
  },
  ghanaCardLinked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  ghanaCardLinkedText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.success,
    flexShrink: 1,
  },
  ghanaCardInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ghanaCardTextInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  ghanaCardLinkBtn: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  ghanaCardLinkBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
});