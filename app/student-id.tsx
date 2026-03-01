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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Check, Calendar } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.xl * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.6;

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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const cardScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.9, 1],
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
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
          activeOpacity={0.9}
          onPress={flipCard}
          style={styles.cardContainer}
        >
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {!isFlipped ? (
              <View style={styles.cardFront}>
                <View style={styles.cardHeader}>
                  <Shield size={40} color={COLORS.gold} strokeWidth={2} />
                  <Text style={styles.universityName}>{member?.university}</Text>
                  <Text style={styles.cardSubtitle}>Student Identification Card</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.photoContainer}>
                    <View style={styles.photoCircle}>
                      <Text style={styles.initialsText}>{getInitials()}</Text>
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.studentName}>{member?.full_name}</Text>
                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Student ID</Text>
                      <Text style={styles.infoValue}>{member?.student_id}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Level</Text>
                      <Text style={styles.infoValue}>{member?.level}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.validitySection}>
                    <View style={styles.validityRow}>
                      <Calendar size={14} color={COLORS.gold} />
                      <Text style={styles.validityLabel}>Issued</Text>
                      <Text style={styles.validityValue}>{formatDate(digitalID.issued_at)}</Text>
                    </View>
                    <View style={styles.validityRow}>
                      <Calendar size={14} color={COLORS.gold} />
                      <Text style={styles.validityLabel}>Expires</Text>
                      <Text style={styles.validityValue}>{formatDate(digitalID.expires_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.statusBadge}>
                    <Check size={14} color={COLORS.white} strokeWidth={3} />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>

                <View style={styles.goldBar} />
              </View>
            ) : (
              <View style={styles.cardBack}>
                <Text style={styles.backTitle}>Verification Code</Text>

                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeGrid}>
                    {Array.from({ length: 100 }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.qrPixel,
                          Math.random() > 0.5 && styles.qrPixelFilled,
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.scanText}>Scan for Verification</Text>
                <Text style={styles.qrDescription}>
                  Present this QR code to verify your student identity at campus facilities and events.
                </Text>

                <View style={styles.backFooter}>
                  <Text style={styles.backFooterText}>ID: {member?.student_id}</Text>
                  <View style={styles.backStatusBadge}>
                    <Check size={12} color={COLORS.white} strokeWidth={3} />
                    <Text style={styles.backStatusText}>Verified</Text>
                  </View>
                </View>

                <View style={styles.goldBar} />
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.flipHint}>Tap card to flip</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Add to Wallet</Text>
          <Text style={styles.infoCardDescription}>
            Save your digital student ID to your mobile wallet for quick access.
            Compatible with Apple Wallet and Google Pay.
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>ID Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Student Number</Text>
            <Text style={styles.detailValue}>{digitalID.student_number}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>University</Text>
            <Text style={styles.detailValue}>{digitalID.university}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue Date</Text>
            <Text style={styles.detailValue}>{formatDate(digitalID.issued_at)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry Date</Text>
            <Text style={styles.detailValue}>{formatDate(digitalID.expires_at)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.activeStatusBadge}>
              <Check size={12} color={COLORS.success} strokeWidth={3} />
              <Text style={styles.activeStatusText}>Active</Text>
            </View>
          </View>
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
  cardContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardFront: {
    flex: 1,
    backgroundColor: COLORS.navy,
    padding: SPACING.lg,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  universityName: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.white,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.gold,
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  initialsText: {
    fontSize: 36,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  studentName: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.gold,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  cardFooter: {
    marginTop: SPACING.md,
  },
  validitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs / 2,
  },
  validityLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.white,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  validityValue: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.xs / 2,
  },
  goldBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.gold,
  },
  cardBack: {
    flex: 1,
    backgroundColor: COLORS.navy,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  qrCodeContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  qrCodeGrid: {
    width: 200,
    height: 200,
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
  scanText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.gold,
    marginBottom: SPACING.sm,
  },
  qrDescription: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
  backFooter: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backFooterText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.white,
    opacity: 0.7,
  },
  backStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.xs,
  },
  backStatusText: {
    fontSize: 10,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.xs / 2,
  },
  flipHint: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  infoCardTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  infoCardDescription: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.xs,
  },
  activeStatusText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.success,
    marginLeft: SPACING.xs / 2,
  },
});
