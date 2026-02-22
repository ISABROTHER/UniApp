import { View, Text, StyleSheet } from 'react-native';
import { Info, TriangleAlert } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS, GHANA_RENT_ACT, PAYSTACK_FEES } from '@/lib/constants';

interface Props {
  totalPrice: number;
  nights: number;
  exceeds6Months?: boolean;
}

function calcFees(amount: number) {
  const platformFee = Math.round(amount * PAYSTACK_FEES.PLATFORM_FEE_PERCENT * 100) / 100;
  const momoFee = Math.min(
    Math.round(amount * PAYSTACK_FEES.MOMO_PERCENT * 100) / 100,
    PAYSTACK_FEES.MOMO_CAP_GHS
  );
  return { platformFee, momoFee, total: amount + platformFee + momoFee };
}

export default function RentActDisclosure({ totalPrice, nights, exceeds6Months = false }: Props) {
  const { platformFee, momoFee, total } = calcFees(totalPrice);

  return (
    <View style={styles.container}>
      {exceeds6Months && (
        <View style={styles.warningRow}>
          <TriangleAlert size={16} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Booking exceeds {GHANA_RENT_ACT.MAX_ADVANCE_MONTHS} months. Under the{' '}
            <Text style={styles.warningBold}>{GHANA_RENT_ACT.ACT_REFERENCE}</Text>, landlords
            cannot demand more than 6 months advance rent.
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Info size={14} color={COLORS.info} />
        <Text style={styles.headerText}>Full Cost Disclosure</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Room Rate ({nights} night{nights !== 1 ? 's' : ''})</Text>
        <Text style={styles.value}>GH₵{totalPrice.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Platform Fee (2%)</Text>
        <Text style={styles.value}>GH₵{platformFee.toFixed(2)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>MoMo Processing (1.5%)</Text>
        <Text style={styles.value}>GH₵{momoFee.toFixed(2)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total Charged</Text>
        <Text style={styles.totalValue}>GH₵{total.toFixed(2)}</Text>
      </View>

      <Text style={styles.footer}>
        Payment held safely for 48h after check-in, then released to the owner.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  warningBold: {
    fontFamily: FONT.semiBold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  headerText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.info,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  value: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#BAE6FD',
    marginVertical: 4,
  },
  totalLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  footer: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.info,
    marginTop: 4,
    lineHeight: 16,
  },
});
