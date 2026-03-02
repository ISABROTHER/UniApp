import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Wallet, Calendar, Receipt } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type PaymentType = 'dues' | 'tithe' | 'offering' | 'fundraising';

interface Organization {
  id: string;
  name: string;
  type: string;
  standard_dues?: number;
}

interface Payment {
  id: string;
  amount: number;
  type: PaymentType;
  period: string;
  paid_at: string;
  receipt_ref: string;
}

export default function OrganizationDuesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedType, setSelectedType] = useState<PaymentType>('dues');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('Semester 1 2025/2026');
  const [walletBalance, setWalletBalance] = useState(0);

  const isChurch = organization?.type === 'church';
  const paymentTypes: PaymentType[] = isChurch
    ? ['dues', 'tithe', 'offering', 'fundraising']
    : ['dues'];

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadOrganization(), loadPayments(), loadWalletBalance()]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, type, standard_dues')
      .eq('id', id)
      .single();

    if (error) throw error;
    setOrganization(data);
    if (data.standard_dues) {
      setAmount(data.standard_dues.toString());
    }
  };

  const loadPayments = async () => {
    const { data, error } = await supabase
      .from('org_dues')
      .select('*')
      .eq('org_id', id)
      .eq('member_id', user?.id)
      .order('paid_at', { ascending: false });

    if (error) throw error;
    setPayments(data || []);
  };

  const loadWalletBalance = async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error loading wallet:', error);
      return;
    }
    setWalletBalance(data?.balance || 0);
  };

  const generateReceiptRef = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `ORG-${dateStr}-${random}`;
  };

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (paymentAmount > walletBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough funds in your wallet');
      return;
    }

    try {
      setProcessing(true);

      const receiptRef = generateReceiptRef();

      const { error: duesError } = await supabase.from('org_dues').insert({
        org_id: id,
        member_id: user?.id,
        amount: paymentAmount,
        type: selectedType,
        period,
        receipt_ref: receiptRef,
        paid_at: new Date().toISOString(),
      });

      if (duesError) throw duesError;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: walletBalance - paymentAmount })
        .eq('user_id', user?.id);

      if (walletError) throw walletError;

      Alert.alert('Success', `Payment of GH₵${paymentAmount.toFixed(2)} successful!\nReceipt: ${receiptRef}`);
      setAmount(organization?.standard_dues?.toString() || '');
      await loadData();
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const calculatePeriodSummary = () => {
    const periodPayments = payments.filter(p => p.period === period && p.type === 'dues');
    const totalPaid = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const expectedDues = organization?.standard_dues || 0;
    const remaining = Math.max(0, expectedDues - totalPaid);
    const progress = expectedDues > 0 ? (totalPaid / expectedDues) * 100 : 0;

    return { totalPaid, remaining, progress: Math.min(100, progress) };
  };

  const summary = calculatePeriodSummary();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getTypeColor = (type: PaymentType) => {
    switch (type) {
      case 'tithe':
        return '#10B981';
      case 'offering':
        return '#F59E0B';
      case 'fundraising':
        return '#8B5CF6';
      default:
        return COLORS.primary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Dues & Giving</Text>
          <Text style={styles.headerSubtitle}>{organization?.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryPeriod}>{period}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={styles.summaryValue}>GH₵{summary.totalPaid.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={styles.summaryValueRemaining}>GH₵{summary.remaining.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${summary.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{summary.progress.toFixed(0)}% paid</Text>
          </View>
        </View>

        {isChurch && (
          <View style={styles.typeSelector}>
            {paymentTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeTab, selectedType === type && styles.typeTabActive]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.typeTabText, selectedType === type && styles.typeTabTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.paySection}>
          <Text style={styles.sectionTitle}>Make Payment</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>GH₵</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Period</Text>
            <View style={styles.periodSelector}>
              <Calendar size={20} color={COLORS.textSecondary} />
              <Text style={styles.periodText}>{period}</Text>
            </View>
          </View>

          <View style={styles.walletInfo}>
            <Wallet size={20} color={COLORS.primary} />
            <Text style={styles.walletText}>Wallet Balance: GH₵{walletBalance.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.payButton, processing && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.payButtonText}>Pay via Campus Wallet</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Payment History</Text>

          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Receipt size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No payments yet</Text>
            </View>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentLeft}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(payment.type) + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: getTypeColor(payment.type) }]}>
                      {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentAmount}>GH₵{payment.amount.toFixed(2)}</Text>
                    <Text style={styles.paymentDate}>{formatDate(payment.paid_at)}</Text>
                    <Text style={styles.paymentReceipt}>{payment.receipt_ref}</Text>
                  </View>
                </View>
              </View>
            ))
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  summaryPeriod: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.success,
  },
  summaryValueRemaining: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.warning,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    minWidth: 60,
    textAlign: 'right',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.md,
  },
  typeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  typeTabActive: {
    backgroundColor: COLORS.primary,
  },
  typeTabText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  typeTabTextActive: {
    color: COLORS.background,
  },
  paySection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  periodText: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  walletText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: COLORS.background,
  },
  historySection: {
    marginBottom: SPACING.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  paymentDate: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paymentReceipt: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
