import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Animated,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Home,
  ShoppingBag,
  Printer,
  Coffee,
  Car,
  Calendar,
  Target,
  Users,
  CreditCard,
  Search,
  X,
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  category: string;
  balance_after: number;
};

type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  weekly_deduction: number;
  deadline: string;
  status: string;
};

type RentInstallment = {
  id: string;
  total_amount: number;
  installments_count: number;
  installment_amount: number;
  paid_count: number;
  next_due_date: string;
  status: string;
};

type Member = {
  id: string;
  full_name: string;
  phone: string;
};

export default function WalletScreen() {
  const router = useRouter();
  const { session, member } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'transfer' | 'savings'>('overview');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [rentPlans, setRentPlans] = useState<RentInstallment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topupModal, setTopupModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [savingsModal, setSavingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [transferAmount, setTransferAmount] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Member | null>(null);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', weekly: '', deadline: '' });
  const balanceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (session?.user?.id) {
      initializeWallet();
    }
  }, [session]);

  const initializeWallet = async () => {
    try {
      const { data: wallet, error } = await supabase
        .from('campus_wallet')
        .select('*')
        .eq('user_id', session!.user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        await supabase
          .from('campus_wallet')
          .insert({ user_id: session!.user.id, balance: 0, lifetime_funded: 0, lifetime_spent: 0 });
        setBalance(0);
      } else if (wallet) {
        setBalance(wallet.balance);
        animateBalance(wallet.balance);
      }

      await fetchAllData();
    } catch (error) {
      console.error('Error initializing wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchTransactions(),
      fetchSavingsGoals(),
      fetchRentPlans(),
    ]);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setTransactions(data);
  };

  const fetchSavingsGoals = async () => {
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('status', 'active');

    if (data) setSavingsGoals(data);
  };

  const fetchRentPlans = async () => {
    const { data } = await supabase
      .from('rent_installments')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('status', 'active');

    if (data) setRentPlans(data);
  };

  const animateBalance = (newBalance: number) => {
    Animated.timing(balanceAnim, {
      toValue: newBalance,
      duration: 800,
      useNativeDriver: false,
    }).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeWallet();
    setRefreshing(false);
  };

  const handleTopup = async (amount: number) => {
    try {
      const newBalance = balance + amount;

      await supabase.from('campus_wallet').update({
        balance: newBalance,
        lifetime_funded: balance + amount,
      }).eq('user_id', session!.user.id);

      await supabase.from('wallet_transactions').insert({
        user_id: session!.user.id,
        type: 'topup',
        amount,
        description: `Wallet top-up`,
        category: 'topup',
        balance_after: newBalance,
      });

      setBalance(newBalance);
      animateBalance(newBalance);
      setTopupModal(false);
      await fetchTransactions();
      Alert.alert('Success', `GHS ${amount} added to your wallet`);
    } catch (error) {
      Alert.alert('Error', 'Failed to top up wallet');
    }
  };

  const searchMembers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('members')
      .select('id, full_name, phone')
      .neq('id', session!.user.id)
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5);

    if (data) setSearchResults(data);
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);

    if (!selectedRecipient || !amount || amount <= 0) {
      Alert.alert('Error', 'Please select recipient and enter valid amount');
      return;
    }

    if (amount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      const newBalance = balance - amount;

      await supabase.from('campus_wallet').update({
        balance: newBalance,
        lifetime_spent: balance + amount,
      }).eq('user_id', session!.user.id);

      await supabase.from('wallet_transactions').insert({
        user_id: session!.user.id,
        type: 'transfer_out',
        amount: -amount,
        description: `Transfer to ${selectedRecipient.full_name}`,
        category: 'transfer',
        balance_after: newBalance,
        related_user_id: selectedRecipient.id,
      });

      const { data: recipientWallet } = await supabase
        .from('campus_wallet')
        .select('balance')
        .eq('user_id', selectedRecipient.id)
        .single();

      if (recipientWallet) {
        await supabase.from('campus_wallet').update({
          balance: recipientWallet.balance + amount,
        }).eq('user_id', selectedRecipient.id);

        await supabase.from('wallet_transactions').insert({
          user_id: selectedRecipient.id,
          type: 'transfer_in',
          amount,
          description: `Transfer from ${member?.full_name}`,
          category: 'transfer',
          balance_after: recipientWallet.balance + amount,
          related_user_id: session!.user.id,
        });
      }

      setBalance(newBalance);
      animateBalance(newBalance);
      setTransferModal(false);
      setSelectedRecipient(null);
      setTransferAmount('');
      await fetchTransactions();
      Alert.alert('Success', `GHS ${amount} sent to ${selectedRecipient.full_name}`);
    } catch (error) {
      Alert.alert('Error', 'Transfer failed');
    }
  };

  const handleCreateGoal = async () => {
    const target = parseFloat(newGoal.target);
    const weekly = parseFloat(newGoal.weekly);

    if (!newGoal.title || !target || !weekly) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await supabase.from('savings_goals').insert({
        user_id: session!.user.id,
        title: newGoal.title,
        target_amount: target,
        current_amount: 0,
        weekly_deduction: weekly,
        deadline: newGoal.deadline || null,
        status: 'active',
      });

      setSavingsModal(false);
      setNewGoal({ title: '', target: '', weekly: '', deadline: '' });
      await fetchSavingsGoals();
      Alert.alert('Success', 'Savings goal created');
    } catch (error) {
      Alert.alert('Error', 'Failed to create goal');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rent': return Home;
      case 'marketplace': return ShoppingBag;
      case 'printing': return Printer;
      case 'food': return Coffee;
      case 'transport': return Car;
      case 'topup': return Plus;
      default: return CreditCard;
    }
  };

  const groupTransactionsByDate = (txns: Transaction[]) => {
    const grouped: { [key: string]: Transaction[] } = {};

    txns.forEach(txn => {
      const date = new Date(txn.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(txn);
    });

    return grouped;
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>GHS {balance.toFixed(2)}</Text>
        <TouchableOpacity style={styles.topupButton} onPress={() => setTopupModal(true)}>
          <Plus size={20} color={COLORS.white} />
          <Text style={styles.topupButtonText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('transfer')}>
          <ArrowUpRight size={24} color={COLORS.primary} />
          <Text style={styles.actionLabel}>Send Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('savings')}>
          <Target size={24} color={COLORS.accent} />
          <Text style={styles.actionLabel}>Savings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Calendar size={24} color={COLORS.success} />
          <Text style={styles.actionLabel}>Rent Plans</Text>
        </TouchableOpacity>
      </View>

      {savingsGoals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          {savingsGoals.slice(0, 2).map(goal => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalAmount}>GHS {goal.current_amount.toFixed(2)} / {goal.target_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(goal.current_amount / goal.target_amount) * 100}%` }]} />
              </View>
              <Text style={styles.goalWeekly}>Weekly: GHS {goal.weekly_deduction.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {rentPlans.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Rent Plans</Text>
          {rentPlans.map(plan => (
            <View key={plan.id} style={styles.rentCard}>
              <View style={styles.rentRow}>
                <Text style={styles.rentLabel}>Total Amount</Text>
                <Text style={styles.rentValue}>GHS {plan.total_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.rentRow}>
                <Text style={styles.rentLabel}>Progress</Text>
                <Text style={styles.rentValue}>{plan.paid_count} / {plan.installments_count}</Text>
              </View>
              <View style={styles.rentRow}>
                <Text style={styles.rentLabel}>Next Payment</Text>
                <Text style={styles.rentDue}>{new Date(plan.next_due_date).toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity style={styles.payButton}>
                <Text style={styles.payButtonText}>Pay GHS {plan.installment_amount.toFixed(2)}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.slice(0, 5).map(txn => (
          <View key={txn.id} style={styles.transactionItem}>
            <View style={styles.transactionIcon}>
              {React.createElement(getCategoryIcon(txn.category), { size: 20, color: COLORS.textPrimary })}
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDesc}>{txn.description}</Text>
              <Text style={styles.transactionDate}>{new Date(txn.created_at).toLocaleTimeString()}</Text>
            </View>
            <Text style={[styles.transactionAmount, { color: txn.amount > 0 ? COLORS.success : COLORS.error }]}>
              {txn.amount > 0 ? '+' : ''}GHS {Math.abs(txn.amount).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTransactions = () => {
    const grouped = groupTransactionsByDate(transactions);

    return (
      <View style={styles.tabContent}>
        {Object.keys(grouped).map(date => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{date}</Text>
            {grouped[date].map(txn => (
              <View key={txn.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  {React.createElement(getCategoryIcon(txn.category), { size: 20, color: COLORS.textPrimary })}
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDesc}>{txn.description}</Text>
                  <Text style={styles.transactionDate}>{new Date(txn.created_at).toLocaleTimeString()}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: txn.amount > 0 ? COLORS.success : COLORS.error }]}>
                  {txn.amount > 0 ? '+' : ''}GHS {Math.abs(txn.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderTransfer = () => (
    <View style={styles.tabContent}>
      <View style={styles.transferCard}>
        <Text style={styles.cardTitle}>Send Money</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchMembers(text);
            }}
          />
        </View>

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map(member => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberItem}
                onPress={() => {
                  setSelectedRecipient(member);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <View style={styles.memberAvatar}>
                  <Users size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.memberName}>{member.full_name}</Text>
                  <Text style={styles.memberPhone}>{member.phone}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedRecipient && (
          <View style={styles.selectedRecipient}>
            <Text style={styles.recipientLabel}>Sending to:</Text>
            <View style={styles.recipientCard}>
              <Text style={styles.recipientName}>{selectedRecipient.full_name}</Text>
              <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount (GHS)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />

            <TouchableOpacity style={styles.sendButton} onPress={() => setTransferModal(true)}>
              <Text style={styles.sendButtonText}>Send Money</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderSavings = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.createGoalButton} onPress={() => setSavingsModal(true)}>
        <Plus size={20} color={COLORS.white} />
        <Text style={styles.createGoalText}>Create New Goal</Text>
      </TouchableOpacity>

      {savingsGoals.map(goal => (
        <View key={goal.id} style={styles.savingsCard}>
          <Text style={styles.savingsTitle}>{goal.title}</Text>
          <View style={styles.savingsAmounts}>
            <Text style={styles.savingsCurrent}>GHS {goal.current_amount.toFixed(2)}</Text>
            <Text style={styles.savingsTarget}> / GHS {goal.target_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.progressBarLarge}>
            <View style={[styles.progressFillLarge, { width: `${(goal.current_amount / goal.target_amount) * 100}%` }]} />
          </View>
          <View style={styles.savingsFooter}>
            <Text style={styles.savingsWeekly}>Weekly: GHS {goal.weekly_deduction.toFixed(2)}</Text>
            {goal.deadline && (
              <Text style={styles.savingsDeadline}>Due: {new Date(goal.deadline).toLocaleDateString()}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

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
        <Text style={styles.headerTitle}>Campus Wallet</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transfer' && styles.tabActive]}
          onPress={() => setActiveTab('transfer')}
        >
          <Text style={[styles.tabText, activeTab === 'transfer' && styles.tabTextActive]}>Transfer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'savings' && styles.tabActive]}
          onPress={() => setActiveTab('savings')}
        >
          <Text style={[styles.tabText, activeTab === 'savings' && styles.tabTextActive]}>Savings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'transfer' && renderTransfer()}
        {activeTab === 'savings' && renderSavings()}
      </ScrollView>

      <Modal visible={topupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Top Up Wallet</Text>
            <Text style={styles.modalSubtitle}>Select amount</Text>
            <View style={styles.topupGrid}>
              {[10, 20, 50, 100, 200].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.topupOption}
                  onPress={() => handleTopup(amount)}
                >
                  <Text style={styles.topupAmount}>GHS {amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setTopupModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={transferModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            <View style={styles.confirmDetails}>
              <Text style={styles.confirmLabel}>Recipient</Text>
              <Text style={styles.confirmValue}>{selectedRecipient?.full_name}</Text>
              <Text style={styles.confirmLabel}>Amount</Text>
              <Text style={styles.confirmAmount}>GHS {transferAmount}</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.confirmButton} onPress={handleTransfer}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setTransferModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={savingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Savings Goal</Text>
            <TextInput
              style={styles.input}
              placeholder="Goal title"
              value={newGoal.title}
              onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Target amount (GHS)"
              keyboardType="numeric"
              value={newGoal.target}
              onChangeText={(text) => setNewGoal({ ...newGoal, target: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Weekly deduction (GHS)"
              keyboardType="numeric"
              value={newGoal.weekly}
              onChangeText={(text) => setNewGoal({ ...newGoal, weekly: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Deadline (optional)"
              value={newGoal.deadline}
              onChangeText={(text) => setNewGoal({ ...newGoal, deadline: text })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.confirmButton} onPress={handleCreateGoal}>
                <Text style={styles.confirmButtonText}>Create Goal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setSavingsModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: SPACING.md,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: FONT.bold,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  topupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  topupButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  goalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  goalTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  goalAmount: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.xs,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  goalWeekly: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  rentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  rentLabel: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  rentValue: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  rentDue: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.warning,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
  },
  dateGroup: {
    marginBottom: SPACING.lg,
  },
  dateHeader: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  transferCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  searchResults: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  memberName: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  memberPhone: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  selectedRecipient: {
    marginTop: SPACING.md,
  },
  recipientLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  recipientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  recipientName: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  amountInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 24,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  createGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  createGoalText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  savingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  savingsTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  savingsAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  savingsCurrent: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  savingsTarget: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFillLarge: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  savingsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savingsWeekly: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  savingsDeadline: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.warning,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  topupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  topupOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  topupAmount: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  confirmDetails: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  confirmLabel: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  confirmValue: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  confirmAmount: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  modalActions: {
    gap: SPACING.sm,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
});