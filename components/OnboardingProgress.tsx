import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { OnboardingSteps } from '@/lib/types';
import { CheckCircle2, Circle, ChevronRight, Sparkles } from 'lucide-react-native';

const STEPS = [
  { key: 'profile_complete', label: 'Complete your profile', route: '/(tabs)/profile', points: 50 },
  { key: 'first_search', label: 'Search for a hostel', route: '/(tabs)/search', points: 10 },
  { key: 'first_favourite', label: 'Save a favourite', route: '/(tabs)/search', points: 20 },
  { key: 'first_booking', label: 'Make your first booking', route: '/(tabs)/search', points: 100 },
  { key: 'first_service_use', label: 'Use a campus service', route: '/(tabs)/laundry', points: 20 },
] as const;

interface Props {
  compact?: boolean;
}

export default function OnboardingProgress({ compact = false }: Props) {
  const router = useRouter();
  const [steps, setSteps] = useState<OnboardingSteps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setSteps(data as OnboardingSteps | null);
      setLoading(false);
    })();
  }, []);

  if (loading || !steps) return null;

  const completed = STEPS.filter(s => steps[s.key]).length;
  const total = STEPS.length;
  const percent = Math.round((completed / total) * 100);

  if (percent === 100) return null;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactLeft}>
          <Sparkles size={14} color={COLORS.warning} />
          <Text style={styles.compactLabel}>Profile {percent}% complete</Text>
        </View>
        <View style={styles.compactBarWrap}>
          <View style={[styles.compactFill, { width: `${percent}%` as any }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color={COLORS.warning} />
          <Text style={styles.title}>Get Started</Text>
        </View>
        <Text style={styles.progress}>{completed}/{total} done</Text>
      </View>

      <View style={styles.progressBarWrap}>
        <View style={[styles.progressFill, { width: `${percent}%` as any }]} />
      </View>

      <Text style={styles.subtitle}>Complete steps to earn bonus points and unlock features</Text>

      {STEPS.map((step) => {
        const done = steps[step.key];
        return (
          <TouchableOpacity
            key={step.key}
            style={[styles.stepRow, done && styles.stepRowDone]}
            onPress={() => !done && router.push(step.route as any)}
            activeOpacity={done ? 1 : 0.7}
          >
            {done
              ? <CheckCircle2 size={20} color={COLORS.success} />
              : <Circle size={20} color={COLORS.textTertiary} />
            }
            <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+{step.points}pts</Text>
            </View>
            {!done && <ChevronRight size={14} color={COLORS.textTertiary} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warningLight,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  progress: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.warning },
  progressBarWrap: {
    height: 6, backgroundColor: COLORS.warningLight, borderRadius: 3, overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.warning, borderRadius: 3 },
  subtitle: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  stepRowDone: { opacity: 0.6 },
  stepLabel: { flex: 1, fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },
  stepLabelDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  pointsBadge: {
    backgroundColor: COLORS.warningLight, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pointsText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.warning },

  compactContainer: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  compactLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compactLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.warning },
  compactBarWrap: {
    flex: 1, height: 4, backgroundColor: 'rgba(245,158,11,0.25)', borderRadius: 2, overflow: 'hidden',
  },
  compactFill: { height: '100%', backgroundColor: COLORS.warning, borderRadius: 2 },
});
