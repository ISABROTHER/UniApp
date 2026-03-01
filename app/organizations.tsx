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
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Users, CheckCircle2, Shield } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type OrgType = 'student_gov' | 'hall' | 'dept' | 'church' | 'club' | 'non_student_religious' | 'service_provider';

interface Organization {
  id: string;
  name: string;
  type: OrgType;
  description: string | null;
  logo_url: string | null;
  verified: boolean;
  member_count: number;
  is_open: boolean;
  created_at: string;
  is_member?: boolean;
  membership_status?: string;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  all: 'All',
  student_gov: 'Student Gov',
  hall: 'Halls',
  dept: 'Departments',
  church: 'Church/Ministry',
  club: 'Clubs',
  non_student_religious: 'Non-Student',
  service_provider: 'Service',
};

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  student_gov: COLORS.primary,
  hall: COLORS.accent,
  dept: COLORS.success,
  church: COLORS.gold,
  club: '#14B8A6',
  non_student_religious: COLORS.textSecondary,
  service_provider: COLORS.info,
};

export default function OrganizationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [myOrgs, setMyOrgs] = useState<Organization[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningOrgId, setJoiningOrgId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadOrganizations(), loadMyOrganizations()]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('verified', { ascending: false })
      .order('member_count', { ascending: false });

    if (error) throw error;

    if (user) {
      const { data: memberships } = await supabase
        .from('org_memberships')
        .select('org_id, status')
        .eq('user_id', user.id);

      const membershipMap = new Map(
        memberships?.map(m => [m.org_id, m.status]) || []
      );

      const orgsWithMembership = data?.map(org => ({
        ...org,
        is_member: membershipMap.has(org.id),
        membership_status: membershipMap.get(org.id),
      })) || [];

      setOrganizations(orgsWithMembership);
    } else {
      setOrganizations(data || []);
    }
  };

  const loadMyOrganizations = async () => {
    if (!user) {
      setMyOrgs([]);
      return;
    }

    const { data: memberships, error } = await supabase
      .from('org_memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const orgs = memberships?.map(m => m.organizations).filter(Boolean) as Organization[];
    setMyOrgs(orgs || []);
  };

  const handleJoinOrg = async (org: Organization) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to join organizations');
      return;
    }

    setJoiningOrgId(org.id);

    try {
      const status = org.is_open ? 'active' : 'pending';

      const { error } = await supabase
        .from('org_memberships')
        .insert({
          user_id: user.id,
          org_id: org.id,
          role: 'member',
          status,
        });

      if (error) throw error;

      if (org.is_open) {
        Alert.alert('Success', `You've joined ${org.name}!`);
      } else {
        Alert.alert('Request Sent', `Your request to join ${org.name} is pending approval`);
      }

      await loadData();
    } catch (error: any) {
      console.error('Error joining org:', error);
      Alert.alert('Error', error.message || 'Failed to join organization');
    } finally {
      setJoiningOrgId(null);
    }
  };

  const getFilteredOrganizations = () => {
    let filtered = organizations;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(org => org.type === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(query) ||
        org.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getOrgInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getOrgColor = (name: string) => {
    const colors = [
      COLORS.primary,
      COLORS.accent,
      COLORS.success,
      COLORS.gold,
      '#14B8A6',
      '#8B5CF6',
      '#EC4899',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organizations</Text>
        <TouchableOpacity
          onPress={() => router.push('/organization-create')}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMyOrganizations = () => {
    if (!user) return null;

    return (
      <View style={styles.myOrgsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Organizations</Text>
          {myOrgs.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/my-orgs')}>
              <Text style={styles.seeAllLink}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {myOrgs.length === 0 ? (
          <View style={styles.emptyMyOrgs}>
            <Text style={styles.emptyMyOrgsText}>Join your first organization</Text>
            <Text style={styles.emptyMyOrgsSubtext}>
              Browse and join organizations below
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myOrgsList}
          >
            {myOrgs.map(org => (
              <TouchableOpacity
                key={org.id}
                style={styles.myOrgItem}
                onPress={() => router.push(`/organization-profile?id=${org.id}`)}
              >
                <View
                  style={[
                    styles.myOrgAvatar,
                    { backgroundColor: getOrgColor(org.name) },
                  ]}
                >
                  <Text style={styles.myOrgInitials}>{getOrgInitials(org.name)}</Text>
                </View>
                <Text style={styles.myOrgName} numberOfLines={1}>
                  {org.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryTabs}
    >
      {Object.entries(ORG_TYPE_LABELS).map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.categoryTab,
            selectedCategory === key && styles.categoryTabActive,
          ]}
          onPress={() => setSelectedCategory(key)}
        >
          <Text
            style={[
              styles.categoryTabText,
              selectedCategory === key && styles.categoryTabTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search organizations..."
        placeholderTextColor={COLORS.textTertiary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );

  const renderOrgCard = (org: Organization) => {
    const isJoining = joiningOrgId === org.id;
    const isMember = org.is_member;
    const isPending = org.membership_status === 'pending';

    return (
      <TouchableOpacity
        key={org.id}
        style={styles.orgCard}
        onPress={() => router.push(`/organization-profile?id=${org.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.orgCardHeader}>
          <View
            style={[
              styles.orgLogo,
              { backgroundColor: getOrgColor(org.name) },
            ]}
          >
            <Text style={styles.orgLogoText}>{org.name[0].toUpperCase()}</Text>
          </View>

          <View style={styles.orgCardInfo}>
            <View style={styles.orgNameRow}>
              <Text style={styles.orgName} numberOfLines={1}>
                {org.name}
              </Text>
              {org.verified && (
                <Shield size={16} color={COLORS.accent} fill={COLORS.accent} />
              )}
            </View>

            <View style={styles.orgMetaRow}>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: `${ORG_TYPE_COLORS[org.type]}15` },
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: ORG_TYPE_COLORS[org.type] },
                  ]}
                >
                  {ORG_TYPE_LABELS[org.type] || org.type}
                </Text>
              </View>

              <View style={styles.memberCount}>
                <Users size={14} color={COLORS.textSecondary} />
                <Text style={styles.memberCountText}>{org.member_count}</Text>
              </View>
            </View>
          </View>
        </View>

        {org.description && (
          <Text style={styles.orgDescription} numberOfLines={2}>
            {org.description}
          </Text>
        )}

        <View style={styles.orgCardFooter}>
          {isMember ? (
            <View
              style={[
                styles.joinedBadge,
                isPending && styles.pendingBadge,
              ]}
            >
              <CheckCircle2
                size={16}
                color={isPending ? COLORS.warning : COLORS.success}
              />
              <Text
                style={[
                  styles.joinedBadgeText,
                  isPending && styles.pendingBadgeText,
                ]}
              >
                {isPending ? 'Pending' : 'Joined'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={(e) => {
                e.stopPropagation();
                handleJoinOrg(org);
              }}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.joinButtonText}>Join</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    const filteredOrgs = getFilteredOrganizations();

    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (filteredOrgs.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Organizations Found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? 'Try adjusting your search'
              : 'No organizations in this category yet'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.orgsList}>
        {filteredOrgs.map(renderOrgCard)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderMyOrganizations()}
        {renderCategoryTabs()}
        {renderSearchBar()}
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  myOrgsSection: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  seeAllLink: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  emptyMyOrgs: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyMyOrgsText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptyMyOrgsSubtext: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  myOrgsList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  myOrgItem: {
    alignItems: 'center',
    width: 80,
  },
  myOrgAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  myOrgInitials: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  myOrgName: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  categoryTabs: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  categoryTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  categoryTabTextActive: {
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
  },
  orgsList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  orgCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orgCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  orgLogo: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  orgLogoText: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  orgCardInfo: {
    flex: 1,
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  orgName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  orgMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: FONT.medium,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  memberCountText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  orgDescription: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  orgCardFooter: {
    alignItems: 'flex-end',
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  pendingBadge: {
    backgroundColor: `${COLORS.warning}15`,
  },
  joinedBadgeText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.success,
  },
  pendingBadgeText: {
    color: COLORS.warning,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
