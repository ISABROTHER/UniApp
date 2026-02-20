import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { LoyaltyBalance } from '@/lib/types';
import { Star, Award, ChevronRight, Zap } from 'lucide-react-native';

const TIER_CONFIG = {
  bronze: { color: '#CD7F32', bg: '#FDF3E7', label: 'Bronze', next: 500, nextLabel: 'Silver' },
  silver: { color: '#A8A9AD', bg: '#F5F5F5', label: 'Silver', next: 2000, nextLabel: 'Gold' },
  gold: { color: '#F59E0B', bg: '#FEF3C7', label: 'Gold', next: 5000, nextLabel: 'Platinum' },
  platinum: { color: '#6366F1', bg: '#EEF2FF', label: 'Platinum', next: 5000, nextLabel: 'Max' },
};

const POINT_ACTIONS = [
  { label: 'Book a hostel', points: 100 },
  { label: 'Use Smart Wash', points: 20 },
  { label: 'Leave a review', points: 50 },
];

interface Props {
  onPress?: () => void;
}

export default function LoyaltyCard({ onPress }: Props) {
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('loyalty_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setBalance(data as LoyaltyBalance | null);
      setLoading(false);
    })();
  }, []);

  if (loading || !balance) return null;

  const tier = TIER_CONFIG[balance.tier] || TIER_CONFIG.bronze;
  const progressToNext = balance.tier === 'platinum'
    ? 100
    : Math.min(100, Math.round((balance.lifetime_earned / tier.next) * 100));

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: tier.bg }]} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.topRow}>
        <View style={styles.tierBadge}>
          <Award size={14} color={tier.color} />
          <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label} Member</Text>
        </View>
        <ChevronRight size={16} color={tier.color} />
      </View>

      <View style={styles.pointsRow}>
        <Star size={20} color={tier.color} fill={tier.color} />
        <Text style={[styles.pointsNum, { color: tier.color }]}>
          {balance.total_points.toLocaleString()}
        </Text>
        <Text style={[styles.pointsLabel, { color: tier.color }]}>pts</Text>
      </View>

      {balance.tier !== 'platinum' && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressToNext}%` as any, backgroundColor: tier.color }]} />
          </View>
          <Text style={[styles.progressLabel, { color: tier.color }]}>
            {balance.lifetime_earned.toLocaleString()} / {tier.next.toLocaleString()} pts to {tier.nextLabel}
          </Text>
        </View>
      )}

      <View style={styles.earnsRow}>
        {POINT_ACTIONS.map((a, i) => (
          <View key={i} style={styles.earnItem}>
            <Zap size={10} color={tier.color} />
            <Text style={[styles.earnText, { color: tier.color }]}>+{a.points} {a.label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tierLabel: { fontFamily: FONT.semiBold, fontSize: 13 },
  pointsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.sm,
  },
  pointsNum: { fontFamily: FONT.headingBold, fontSize: 32 },
  pointsLabel: { fontFamily: FONT.medium, fontSize: 15, marginTop: 4 },
  progressSection: { marginBottom: SPACING.sm },
  progressBar: {
    height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontFamily: FONT.regular, fontSize: 11 },
  earnsRow: { gap: 3 },
  earnItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earnText: { fontFamily: FONT.regular, fontSize: 11 },
});
