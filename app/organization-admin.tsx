import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, DollarSign, TrendingUp, Calendar, Bell, FileText, Settings, CheckCircle, XCircle } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'manage' | 'announce' | 'finance' | 'settings';

interface Organization {
  id: string;
  name: string;
  description: string;
  open_membership: boolean;
  contact_email: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  title: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
}

export default function OrganizationAdminScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('manage');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    totalMembers: 0,
    activeDues: 0,
    totalIncome: 0,
    upcomingEvents: 0,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    body: '',
    priority: 'normal',
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'income',
    amount: '',
    category: '',
    description: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    open_membership: false,
    contact_email: '',
  });

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    if (!id || !user) return;

    try {
      const { data: membership } = await supabase
        .from('org_memberships')
        .select('role')
        .eq('org_id', id)
        .eq('user_id', user.id)
        .single();

      if (!membership || (membership.role !== 'admin' && membership.role !== 'exec')) {
        Alert.alert('Access Denied', 'You do not have permission to access this page');
        router.back();
        return;
      }

      setUserRole(membership.role);

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (org) {
        setOrganization(org);
        setSettingsForm({
          name: org.name,
          description: org.description || '',
          open_membership: org.open_membership || false,
          contact_email: org.contact_email || '',
        });
      }

      await Promise.all([
        loadMembers(),
        loadAnnouncements(),
        loadTransactions(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('org_memberships')
      .select('*, profiles(full_name, email)')
      .eq('org_id', id);

    if (data) {
      setMembers(data.filter((m: Member) => m.status === 'active'));
      setPendingMembers(data.filter((m: Member) => m.status === 'pending'));
    }
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from('org_announcements')
      .select('*, profiles(full_name)')
      .eq('org_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setAnnouncements(data);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('org_finance')
      .select('*')
      .eq('org_id', id)
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (data) setTransactions(data);
  };

  const loadStats = async () => {
    const { data: memberCount } = await supabase
      .from('org_memberships')
      .select('id', { count: 'exact' })
      .eq('org_id', id)
      .eq('status', 'active');

    const { data: financeData } = await supabase
      .from('org_finance')
      .select('type, amount')
      .eq('org_id', id);

    const income = financeData?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;

    setStats({
      totalMembers: memberCount?.length || 0,
      activeDues: memberCount?.length || 0,
      totalIncome: income,
      upcomingEvents: 0,
    });
  };

  const handleApproveMember = async (membershipId: string) => {
    const { error } = await supabase
      .from('org_memberships')
      .update({ status: 'active' })
      .eq('id', membershipId);

    if (!error) {
      loadMembers();
      loadStats();
    }
  };

  const handleRejectMember = async (membershipId: string) => {
    const { error } = await supabase
      .from('org_memberships')
      .delete()
      .eq('id', membershipId);

    if (!error) {
      loadMembers();
    }
  };

  const handleChangeRole = async (membershipId: string, newRole: string) => {
    const { error } = await supabase
      .from('org_memberships')
      .update({ role: newRole })
      .eq('id', membershipId);

    if (!error) {
      loadMembers();
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.body) {
      Alert.alert('Error', 'Title and body are required');
      return;
    }

    const { error } = await supabase
      .from('org_announcements')
      .insert({
        org_id: id,
        author_id: user?.id,
        title: announcementForm.title,
        body: announcementForm.body,
        priority: announcementForm.priority,
      });

    if (!error) {
      setAnnouncementForm({ title: '', body: '', priority: 'normal' });
      loadAnnouncements();
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    const { error } = await supabase
      .from('org_announcements')
      .delete()
      .eq('id', announcementId);

    if (!error) {
      loadAnnouncements();
    }
  };

  const handleRecordTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.category) {
      Alert.alert('Error', 'Amount and category are required');
      return;
    }

    const { error } = await supabase
      .from('org_finance')
      .insert({
        org_id: id,
        type: transactionForm.type,
        amount: parseFloat(transactionForm.amount),
        category: transactionForm.category,
        description: transactionForm.description,
        transaction_date: new Date().toISOString(),
      });

    if (!error) {
      setTransactionForm({ type: 'income', amount: '', category: '', description: '' });
      loadTransactions();
      loadStats();
    }
  };

  const handleUpdateSettings = async () => {
    const { error } = await supabase
      .from('organizations')
      .update({
        name: settingsForm.name,
        description: settingsForm.description,
        open_membership: settingsForm.open_membership,
        contact_email: settingsForm.contact_email,
      })
      .eq('id', id);

    if (!error) {
      Alert.alert('Success', 'Settings updated');
      loadData();
    }
  };

  const filteredMembers = members.filter(m =>
    m.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.container}>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>{organization?.name}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Users size={24} color={COLORS.primary} />
          <Text style={styles.statNumber}>{stats.totalMembers}</Text>
          <Text style={styles.statLabel}>Total Members</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={24} color={COLORS.success} />
          <Text style={styles.statNumber}>{stats.activeDues}</Text>
          <Text style={styles.statLabel}>Active Dues</Text>
        </View>
        <View style={styles.statCard}>
          <DollarSign size={24} color={COLORS.success} />
          <Text style={styles.statNumber}>${stats.totalIncome.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Income</Text>
        </View>
        <View style={styles.statCard}>
          <Calendar size={24} color={COLORS.primary} />
          <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
          <Text style={styles.statLabel}>Upcoming Events</Text>
        </View>
      </ScrollView>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>Manage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'announce' && styles.activeTab]}
          onPress={() => setActiveTab('announce')}
        >
          <Text style={[styles.tabText, activeTab === 'announce' && styles.activeTabText]}>Announce</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'finance' && styles.activeTab]}
          onPress={() => setActiveTab('finance')}
        >
          <Text style={[styles.tabText, activeTab === 'finance' && styles.activeTabText]}>Finance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'manage' && (
          <View>
            {pendingMembers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Members</Text>
                {pendingMembers.map(member => (
                  <View key={member.id} style={styles.pendingMemberCard}>
                    <View>
                      <Text style={styles.memberName}>{member.profiles?.full_name}</Text>
                      <Text style={styles.memberEmail}>{member.profiles?.email}</Text>
                    </View>
                    <View style={styles.pendingActions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApproveMember(member.id)}
                      >
                        <CheckCircle size={20} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectMember(member.id)}
                      >
                        <XCircle size={20} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Member List</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search members..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {filteredMembers.map(member => (
                <View key={member.id} style={styles.memberCard}>
                  <View>
                    <Text style={styles.memberName}>{member.profiles?.full_name}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{member.role}</Text>
                    </View>
                  </View>
                  <View style={styles.roleActions}>
                    <TouchableOpacity
                      style={styles.roleButton}
                      onPress={() => handleChangeRole(member.id, member.role === 'member' ? 'exec' : member.role === 'exec' ? 'admin' : 'member')}
                    >
                      <Text style={styles.roleButtonText}>Change Role</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'announce' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Create Announcement</Text>
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor={COLORS.textSecondary}
                value={announcementForm.title}
                onChangeText={text => setAnnouncementForm({ ...announcementForm, title: text })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Body"
                placeholderTextColor={COLORS.textSecondary}
                value={announcementForm.body}
                onChangeText={text => setAnnouncementForm({ ...announcementForm, body: text })}
                multiline
                numberOfLines={4}
              />
              <View style={styles.priorityContainer}>
                {['normal', 'urgent', 'pinned'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      announcementForm.priority === priority && styles.priorityButtonActive,
                    ]}
                    onPress={() => setAnnouncementForm({ ...announcementForm, priority })}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        announcementForm.priority === priority && styles.priorityButtonTextActive,
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.postButton} onPress={handlePostAnnouncement}>
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Announcements</Text>
              {announcements.map(announcement => (
                <View key={announcement.id} style={styles.announcementCard}>
                  <View style={styles.announcementHeader}>
                    <Text style={styles.announcementTitle}>{announcement.title}</Text>
                    <TouchableOpacity onPress={() => handleDeleteAnnouncement(announcement.id)}>
                      <XCircle size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.announcementBody}>{announcement.body}</Text>
                  <View style={styles.announcementFooter}>
                    <Text style={styles.announcementAuthor}>{announcement.profiles?.full_name}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: announcement.priority === 'urgent' ? COLORS.error : announcement.priority === 'pinned' ? COLORS.warning : COLORS.border }]}>
                      <Text style={styles.priorityBadgeText}>{announcement.priority}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'finance' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Summary</Text>
              <View style={styles.financeSummary}>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Total Income</Text>
                  <Text style={[styles.financeValue, { color: COLORS.success }]}>
                    ${transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Total Expenses</Text>
                  <Text style={[styles.financeValue, { color: COLORS.error }]}>
                    ${transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Balance</Text>
                  <Text style={styles.financeValue}>
                    ${(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
                      transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Transaction</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, transactionForm.type === 'income' && styles.typeButtonActive]}
                  onPress={() => setTransactionForm({ ...transactionForm, type: 'income' })}
                >
                  <Text style={[styles.typeButtonText, transactionForm.type === 'income' && styles.typeButtonTextActive]}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, transactionForm.type === 'expense' && styles.typeButtonActive]}
                  onPress={() => setTransactionForm({ ...transactionForm, type: 'expense' })}
                >
                  <Text style={[styles.typeButtonText, transactionForm.type === 'expense' && styles.typeButtonTextActive]}>Expense</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Amount"
                placeholderTextColor={COLORS.textSecondary}
                value={transactionForm.amount}
                onChangeText={text => setTransactionForm({ ...transactionForm, amount: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Category"
                placeholderTextColor={COLORS.textSecondary}
                value={transactionForm.category}
                onChangeText={text => setTransactionForm({ ...transactionForm, category: text })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={COLORS.textSecondary}
                value={transactionForm.description}
                onChangeText={text => setTransactionForm({ ...transactionForm, description: text })}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity style={styles.postButton} onPress={handleRecordTransaction}>
                <Text style={styles.postButtonText}>Record</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              {transactions.map(transaction => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View>
                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? COLORS.success : COLORS.error },
                    ]}
                  >
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'settings' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organization Settings</Text>
              <Text style={styles.inputLabel}>Organization Name</Text>
              <TextInput
                style={styles.input}
                value={settingsForm.name}
                onChangeText={text => setSettingsForm({ ...settingsForm, name: text })}
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={settingsForm.description}
                onChangeText={text => setSettingsForm({ ...settingsForm, description: text })}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.inputLabel}>Contact Email</Text>
              <TextInput
                style={styles.input}
                value={settingsForm.contact_email}
                onChangeText={text => setSettingsForm({ ...settingsForm, contact_email: text })}
                keyboardType="email-address"
              />
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Open Membership</Text>
                <TouchableOpacity
                  style={[styles.toggle, settingsForm.open_membership && styles.toggleActive]}
                  onPress={() => setSettingsForm({ ...settingsForm, open_membership: !settingsForm.open_membership })}
                >
                  <View style={[styles.toggleThumb, settingsForm.open_membership && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.postButton} onPress={handleUpdateSettings}>
                <Text style={styles.postButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.section, styles.dangerZone]}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <Text style={styles.dangerText}>Destructive actions for this organization</Text>
              <TouchableOpacity style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Delete Organization</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    maxHeight: 120,
  },
  statCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontFamily: FONT.semiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
  },
  pendingMemberCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  memberEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONT.semiBold,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  approveButton: {
    backgroundColor: COLORS.success,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  roleActions: {
    flexDirection: 'row',
  },
  roleButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  roleButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: FONT.semiBold,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priorityButtonText: {
    color: COLORS.textPrimary,
  },
  priorityButtonTextActive: {
    color: COLORS.white,
    fontFamily: FONT.semiBold,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  postButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONT.bold,
  },
  announcementCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  announcementTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  announcementBody: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementAuthor: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  priorityBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONT.semiBold,
  },
  financeSummary: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  financeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  financeLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  financeValue: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    color: COLORS.textPrimary,
  },
  typeButtonTextActive: {
    color: COLORS.white,
    fontFamily: FONT.semiBold,
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionCategory: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  transactionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontFamily: FONT.bold,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  toggleLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  dangerTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  dangerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONT.semiBold,
  },
});
