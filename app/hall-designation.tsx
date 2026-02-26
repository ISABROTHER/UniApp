import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, Shield, Home, Users, CheckCircle, AlertCircle,
} from 'lucide-react-native';

interface Hall {
  id: string;
  name: string;
  short_name: string | null;
  hall_type: 'male' | 'female' | 'mixed';
  hall_category: 'traditional' | 'src' | 'graduate';
  capacity: number;
  is_graduate: boolean;
  total_members: number;
}

const STUDENT_LEVELS = ['100', '200', '300', '400', 'Postgraduate'];

function HallCard({ hall, selected, onPress }: { hall: Hall; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.hallCard, selected && styles.hallCardActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.hallHeader}>
        <Home size={20} color={selected ? COLORS.primary : COLORS.textSecondary} />
        {selected && <CheckCircle size={18} color={COLORS.primary} />}
      </View>
      <Text style={[styles.hallName, selected && styles.hallNameActive]} numberOfLines={2}>
        {hall.name}
      </Text>
      {hall.short_name && (
        <Text style={styles.hallShortName}>{hall.short_name}</Text>
      )}
      <View style={styles.hallMeta}>
        <Users size={12} color={COLORS.textTertiary} />
        <Text style={styles.hallMetaText}>{hall.total_members} members</Text>
      </View>
      <View style={styles.hallBadgeRow}>
        <View style={[
          styles.hallTypeBadge,
          hall.hall_type === 'male' && styles.hallTypeMale,
          hall.hall_type === 'female' && styles.hallTypeFemale,
          hall.hall_type === 'mixed' && styles.hallTypeMixed,
        ]}>
          <Text style={styles.hallTypeText}>
            {hall.hall_type === 'male' ? 'Male' : hall.hall_type === 'female' ? 'Female' : 'Mixed'}
          </Text>
        </View>
        {hall.is_graduate && (
          <View style={styles.hallGradBadge}>
            <Text style={styles.hallGradText}>Grad</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HallDesignationScreen() {
  const router = useRouter();
  const { session, member } = useAuth();
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentDesignation, setCurrentDesignation] = useState<any>(null);

  const [selectedHall, setSelectedHall] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isResident, setIsResident] = useState<boolean | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userId = session?.user?.id || member?.id;

      const hallsRes = await supabase
        .from('halls')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (hallsRes.data) {
        const hallsWithCount = await Promise.all(
          hallsRes.data.map(async (hall) => {
            const { count } = await supabase
              .from('hall_members')
              .select('id', { count: 'exact', head: true })
              .eq('hall_id', hall.id)
              .eq('academic_year', '2026/27');

            return {
              ...hall,
              total_members: count || 0,
            };
          })
        );
        setHalls(hallsWithCount);
      }

      if (userId) {
        const { data: designationData } = await supabase
          .from('hall_members')
          .select('*, halls(name)')
          .eq('user_id', userId)
          .eq('academic_year', '2026/27')
          .maybeSingle();

        if (designationData) {
          setCurrentDesignation(designationData);
          setSelectedHall(designationData.hall_id);
          setSelectedLevel(designationData.student_level);
          setIsResident(designationData.is_resident);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedHall || !selectedLevel || isResident === null) {
      Alert.alert('Incomplete', 'Please select hall, level, and residence status');
      return;
    }

    setSubmitting(true);
    try {
      const userId = session?.user?.id || member?.id;
      if (!userId) return;

      const hallMemberData = {
        hall_id: selectedHall,
        user_id: userId,
        student_id: member?.student_id || userId.slice(0, 8),
        student_level: selectedLevel,
        is_resident: isResident,
        affiliation_type: isResident ? 'resident' : 'diaspora',
        academic_year: '2026/27',
        verified_at: new Date().toISOString(),
      };

      if (currentDesignation) {
        await supabase
          .from('hall_members')
          .update(hallMemberData)
          .eq('id', currentDesignation.id);
      } else {
        await supabase.from('hall_members').insert(hallMemberData);
      }

      await supabase
        .from('members')
        .update({ hall_id: selectedHall })
        .eq('id', userId);

      // Navigate to hall page after successful registration
      router.replace('/hall');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update hall designation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading halls...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hall Designation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentDesignation && (
          <View style={styles.statusCard}>
            <CheckCircle size={20} color={COLORS.success} />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>Currently Registered</Text>
              <Text style={styles.statusSubtitle}>
                {currentDesignation.halls?.name} • {currentDesignation.student_level} Level • {currentDesignation.is_resident ? 'Resident' : 'Affiliate'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Shield size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Register to your hall to access official announcements, events, exercises, and elections.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select Your Hall</Text>

        {halls.length === 0 ? (
          <View style={styles.emptyHallsCard}>
            <Home size={48} color={COLORS.border} />
            <Text style={styles.emptyHallsTitle}>No Halls Available</Text>
            <Text style={styles.emptyHallsText}>
              The halls database needs to be set up. Please contact your administrator or run the hall migration script in Supabase.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.categoryLabel}>Traditional Halls</Text>
            <View style={styles.hallsGrid}>
              {halls.filter(h => h.hall_category === 'traditional').map((hall) => (
                <HallCard key={hall.id} hall={hall} selected={selectedHall === hall.id} onPress={() => setSelectedHall(hall.id)} />
              ))}
            </View>

            <Text style={styles.categoryLabel}>SRC / Graduate Halls</Text>
            <View style={styles.hallsGrid}>
              {halls.filter(h => h.hall_category !== 'traditional').map((hall) => (
                <HallCard key={hall.id} hall={hall} selected={selectedHall === hall.id} onPress={() => setSelectedHall(hall.id)} />
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Your Level</Text>
        <View style={styles.levelGrid}>
          {STUDENT_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelChip,
                selectedLevel === level && styles.levelChipActive,
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <Text style={[
                styles.levelChipText,
                selectedLevel === level && styles.levelChipTextActive,
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Residence Status</Text>
        <View style={styles.residenceRow}>
          <TouchableOpacity
            style={[
              styles.residenceCard,
              isResident === true && styles.residenceCardActive,
            ]}
            onPress={() => setIsResident(true)}
            activeOpacity={0.7}
          >
            <Home size={24} color={isResident === true ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[
              styles.residenceTitle,
              isResident === true && styles.residenceTitleActive,
            ]}>
              Resident
            </Text>
            <Text style={styles.residenceDesc}>
              I live in the hall
            </Text>
            {isResident === true && (
              <CheckCircle size={20} color={COLORS.primary} style={styles.residenceCheck} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.residenceCard,
              isResident === false && styles.residenceCardActive,
            ]}
            onPress={() => setIsResident(false)}
            activeOpacity={0.7}
          >
            <Users size={24} color={isResident === false ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[
              styles.residenceTitle,
              isResident === false && styles.residenceTitleActive,
            ]}>
              Affiliate
            </Text>
            <Text style={styles.residenceDesc}>
              I'm affiliated but live elsewhere
            </Text>
            {isResident === false && (
              <CheckCircle size={20} color={COLORS.primary} style={styles.residenceCheck} />
            )}
          </TouchableOpacity>
        </View>

        {!selectedHall || !selectedLevel || isResident === null ? (
          <View style={styles.warningCard}>
            <AlertCircle size={18} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Please complete all selections above
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selectedHall || !selectedLevel || isResident === null || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedHall || !selectedLevel || isResident === null || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>
              {currentDesignation ? 'Update Designation' : 'Register to Hall'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.success,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.success,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  hallsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  hallCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  hallCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFaded,
  },
  hallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  hallName: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hallNameActive: {
    color: COLORS.primary,
  },
  hallMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  hallMetaText: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  categoryLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  emptyHallsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyHallsTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyHallsText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  hallShortName: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
  },
  hallBadgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  hallTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  hallTypeMale: {
    backgroundColor: '#DBEAFE',
  },
  hallTypeFemale: {
    backgroundColor: '#FCE7F3',
  },
  hallTypeMixed: {
    backgroundColor: '#DCFCE7',
  },
  hallTypeText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  hallGradBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FEF9C3',
  },
  hallGradText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: '#92400E',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  levelChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  levelChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  levelChipText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  levelChipTextActive: {
    color: COLORS.white,
  },
  residenceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  residenceCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    position: 'relative',
  },
  residenceCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFaded,
  },
  residenceTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
    marginBottom: 4,
  },
  residenceTitleActive: {
    color: COLORS.primary,
  },
  residenceDesc: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  residenceCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  warningText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.warning,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.white,
  },
}); 