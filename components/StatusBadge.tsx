import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT } from '@/lib/constants';

const STATUS_MAP: Record<string, { bg: string; fg: string }> = {
  active: { bg: COLORS.successLight, fg: COLORS.success },
  inactive: { bg: '#EBEDF0', fg: COLORS.textSecondary },
  suspended: { bg: COLORS.errorLight, fg: COLORS.error },
  pending: { bg: COLORS.warningLight, fg: '#92400E' },
  completed: { bg: COLORS.successLight, fg: COLORS.success },
  failed: { bg: COLORS.errorLight, fg: COLORS.error },
  refunded: { bg: COLORS.infoLight, fg: COLORS.info },
  published: { bg: COLORS.successLight, fg: COLORS.success },
  draft: { bg: '#EBEDF0', fg: COLORS.textSecondary },
  upcoming: { bg: COLORS.infoLight, fg: COLORS.info },
  ongoing: { bg: COLORS.successLight, fg: COLORS.success },
  cancelled: { bg: COLORS.errorLight, fg: COLORS.error },
  new: { bg: COLORS.primaryFaded, fg: COLORS.primary },
  read: { bg: COLORS.infoLight, fg: COLORS.info },
  responded: { bg: COLORS.successLight, fg: COLORS.success },
  closed: { bg: '#EBEDF0', fg: COLORS.textSecondary },
};

export default function StatusBadge({ status }: { status: string }) {
  const c = STATUS_MAP[status] ?? STATUS_MAP.inactive;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.label, { color: c.fg }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
