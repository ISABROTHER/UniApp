import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, CreditCard, Download, FileText,
  Home, ShoppingBag, Zap
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type TransactionType = 'rent' | 'laundry' | 'utility' | 'booking';

interface UnifiedTransaction {
  id: string;
  date: string;
  amount: number;
  title: string;
  subtitle: string;
  type: TransactionType;
  status: string;
  reference?: string;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { session, member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUnifiedTransactions(session.user.id);
    }
  }, [session?.user?.id]);

  const fetchUnifiedTransactions = async (userId: string) => {
    setLoading(true);
    try {
      const combined: UnifiedTransaction[] = [];

      // 1. Fetch Bookings (acting as payments)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, hostel:hostels(name)')
        .eq('user_id', userId)
        .in('payment_status', ['paid', 'held', 'refunded']);

      if (bookings) {
        bookings.forEach((b: any) => combined.push({
          id: b.id,
          date: b.created_at,
          amount: b.total_price,
          title: 'Hostel Booking',
          subtitle: b.hostel?.name || 'Accommodation Payment',
          type: 'booking',
          status: b.payment_status === 'paid' ? 'completed' : b.payment_status,
          reference: b.payment_reference || `BKG-${b.id.substring(0, 5).toUpperCase()}`
        }));
      }

      // 2. Fetch Laundry Transactions
      const { data: laundry } = await supabase
        .from('laundry_transactions')
        .select('*')
        .eq('user_id', userId);

      if (laundry) {
        laundry.forEach((l: any) => combined.push({
          id: l.id,
          date: l.created_at,
          amount: l.amount,
          title: 'Smart Wash',
          subtitle: l.description,
          type: 'laundry',
          status: 'completed',
          reference: l.reference || `LND-${l.id.substring(0, 5).toUpperCase()}`
        }));
      }

      // 3. Fetch Utility Topups
      const { data: utilities } = await supabase
        .from('utility_topups')
        .select('*, meter:utility_meters(meter_type)')
        .eq('user_id', userId);

      if (utilities) {
        utilities.forEach((u: any) => combined.push({
          id: u.id,
          date: u.created_at,
          amount: u.amount,
          title: `Utility Top-up (${u.meter?.meter_type?.toUpperCase() || 'POWER'})`,
          subtitle: 'Prepaid Token Purchase',
          type: 'utility',
          status: u.status,
          reference: u.payment_reference || `UTL-${u.id.substring(0, 5).toUpperCase()}`
        }));
      }

      // 4. Fetch Rent Payments
      const { data: rent } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', userId);

      if (rent) {
        rent.forEach((r: any) => combined.push({
          id: r.id,
          date: r.created_at,
          amount: r.amount,
          title: 'Rent Installment',
          subtitle: r.payment_method || 'Digital Payment',
          type: 'rent',
          status: r.status,
          reference: r.payment_reference || `RNT-${r.id.substring(0, 5).toUpperCase()}`
        }));
      }

      // Sort chronological descending
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(combined);

    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: TransactionType) => {
    switch (type) {
      case 'rent': return <FileText size={20} color={COLORS.info} />;
      case 'laundry': return <ShoppingBag size={20} color='#7C3AED' />;
      case 'utility': return <Zap size={20} color={COLORS.warning} />;
      case 'booking': return <Home size={20} color={COLORS.accent} />;
      default: return <CreditCard size={20} color={COLORS.primary} />;
    }
  };

  const getIconBgForType = (type: TransactionType) => {
    switch (type) {
      case 'rent': return '#E0F2FE';
      case 'laundry': return '#EDE9FE';
      case 'utility': return '#FEF3C7';
      case 'booking': return '#E0F2FE';
      default: return '#E0F2FE';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownloadReceipt = async (t: UnifiedTransaction) => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 40px; }
              .logo { font-size: 28px; font-weight: bold; color: #4A90E2; }
              .title { font-size: 20px; font-weight: bold; margin-top: 10px; color: #111827; }
              .details { margin-bottom: 30px; border-top: 2px solid #eee; padding-top: 20px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px; }
              .label { color: #6b7280; }
              .value { font-weight: bold; color: #111827; text-align: right; }
              .amount-box { text-align: center; background: #f3f4f6; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
              .amount-label { color: #6b7280; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
              .amount-value { font-size: 42px; font-weight: bold; color: #111827; }
              .footer { text-align: center; margin-top: 50px; color: #9ca3af; font-size: 13px; line-height: 1.5; border-top: 1px solid #eee; padding-top: 20px;}
              .status { color: #10b981; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">UCC Housing</div>
              <div class="title">Official Receipt</div>
            </div>
            
            <div class="amount-box">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">GH₵${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div class="details">
              <div class="row">
                <span class="label">Transaction Reference</span>
                <span class="value">${t.reference}</span>
              </div>
              <div class="row">
                <span class="label">Date</span>
                <span class="value">${formatDate(t.date)}</span>
              </div>
              <div class="row">
                <span class="label">Payment Type</span>
                <span class="value">${t.title}</span>
              </div>
              <div class="row">
                <span class="label">Description</span>
                <span class="value">${t.subtitle}</span>
              </div>
              <div class="row">
                <span class="label">Status</span>
                <span class="value status">${t.status}</span>
              </div>
            </div>

            <div class="footer">
              Thank you for using UCC Housing Campus Super App.<br>
              This is a computer-generated receipt and does not require a signature.<br>
              Support: support@studentnest.app
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const canShare = await Sharing.isAvailableAsync();
        
        if (canShare) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
          Alert.alert('Success', 'Receipt generated, but sharing is not available on this device.');
        }
      }
    } catch (error) {
      console.error("Error generating receipt:", error);
      Alert.alert("Error", "Could not generate receipt at this time.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Platform Spend</Text>
          <Text style={styles.summaryAmount}>
            GH₵{transactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
          </Text>
          <Text style={styles.summarySub}>Across all bookings, rent, and services</Text>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Transaction History</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching financial records...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={48} color={COLORS.borderDark} />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySub}>When you make payments for rent, laundry, or utilities, they will appear here.</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((t) => (
              <View key={t.id} style={styles.transactionCard}>
                <View style={styles.transactionTop}>
                  <View style={[styles.iconBox, { backgroundColor: getIconBgForType(t.type) }]}>
                    {getIconForType(t.type)}
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{t.title}</Text>
                    <Text style={styles.transactionSubtitle}>{t.subtitle}</Text>
                  </View>
                  <View style={styles.transactionAmountBox}>
                    <Text style={styles.transactionAmount}>GH₵{t.amount.toLocaleString()}</Text>
                    <Text style={[
                      styles.transactionStatus,
                      t.status === 'completed' ? styles.statusSuccess :
                      t.status === 'pending' ? styles.statusWarning : styles.statusError
                    ]}>
                      {t.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionBottom}>
                  <View style={styles.transactionMeta}>
                    <Text style={styles.metaText}>{formatDate(t.date)}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>Ref: {t.reference}</Text>
                  </View>
                  
                  {t.status === 'completed' && (
                    <TouchableOpacity 
                      style={styles.receiptButton}
                      onPress={() => handleDownloadReceipt(t)}
                    >
                      <Download size={12} color={COLORS.primary} />
                      <Text style={styles.receiptButtonText}>Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 60, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },
  
  content: { flex: 1 },
  
  summaryCard: {
    backgroundColor: COLORS.navy, margin: SPACING.md, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  summaryLabel: { fontFamily: FONT.semiBold, fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontFamily: FONT.headingBold, fontSize: 36, color: COLORS.white, marginVertical: 8 },
  summarySub: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  listHeader: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  listTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },

  transactionsList: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  transactionCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  transactionTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  iconBox: { width: 40, height: 40, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  transactionSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  transactionAmountBox: { alignItems: 'flex-end' },
  transactionAmount: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  transactionStatus: { fontFamily: FONT.semiBold, fontSize: 10, marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  statusSuccess: { backgroundColor: `${COLORS.success}15`, color: COLORS.success },
  statusWarning: { backgroundColor: `${COLORS.warning}15`, color: COLORS.warning },
  statusError: { backgroundColor: `${COLORS.error}15`, color: COLORS.error },

  transactionBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  transactionMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  metaDot: { fontSize: 10, color: COLORS.textTertiary },
  
  receiptButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  receiptButtonText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.primary },

  loadingState: { padding: 40, alignItems: 'center' },
  loadingText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.md },
  
  emptyState: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: 4 },
  emptySub: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});