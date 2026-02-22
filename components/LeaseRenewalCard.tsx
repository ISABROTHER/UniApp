import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, ArrowRight } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { router } from 'expo-router';

interface Props {
  hostelId: string;
  hostelName: string;
  checkOutDate: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function LeaseRenewalCard({ hostelId, hostelName, checkOutDate }: Props) {
  const days = daysUntil(checkOutDate);
  const urgent = days <= 14;

  return (
    <View style={[styles.card, urgent && styles.cardUrgent]}>
      <View style={styles.iconWrap}>
        <Clock size={20} color={urgent ? COLORS.error : COLORS.warning} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Lease Ending Soon</Text>
        <Text style={styles.hostelName} numberOfLines={1}>{hostelName}</Text>
        <Text style={[styles.daysText, urgent && styles.daysTextUrgent]}>
          {days === 0 ? 'Ends today!' : `Ends in ${days} day${days !== 1 ? 's' : ''}`}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.cta, urgent && styles.ctaUrgent]}
        onPress={() => router.push(`/detail?id=${hostelId}`)}
      >
        <Text style={[styles.ctaText, urgent && styles.ctaTextUrgent]}>Rebook</Text>
        <ArrowRight size={14} color={urgent ? COLORS.white : COLORS.warning} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardUrgent: {
    backgroundColor: COLORS.errorLight,
    borderColor: '#FECACA',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  hostelName: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  daysText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: '#92400E',
  },
  daysTextUrgent: {
    color: COLORS.error,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  ctaUrgent: {
    backgroundColor: COLORS.error,
  },
  ctaText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  ctaTextUrgent: {
    color: COLORS.white,
  },
});
