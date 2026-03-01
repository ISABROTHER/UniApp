import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Filter, Users, ChevronRight } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type OrgType = 'student_government' | 'hall_council' | 'greek_life' | 'sports' | 'academic' | 'cultural' | 'service' | 'professional' | 'religious' | 'special_interest' | 'honors';

type MemberRole = 'admin' | 'executive' | 'member';

type MemberStatus = 'active' | 'pending' | 'rejected';

interface OrgMembership {
  id: string;
  org_id: string;
  role: MemberRole;
  title?: string;
  status: MemberStatus;
  joined_at: string;
  organization: {
    id: string;
    name: string;
    type: OrgType;
    description?: string;
    verified: boolean;
    member_count: number;
  };
}

type FilterType = 'all' | 'admin' | 'executive' | 'member' | 'pending';

const TYPE_COLORS: Record<OrgType, string> = {
  student_government: '#EF4444',
  hall_council: '#3B82F6',
  greek_life: '#8B5CF6',
  sports: '#10B981',
  academic: '#F59E0B',
  cultural: '#EC4899',
  service: '#06B6D4',
  professional: '#6366F1',
  religious: '#8B5CF6',
  special_interest: '#14B8A6',
  honors: '#F59E0B',
};

const TYPE_LABELS: Record<OrgType, string> = {
  student_government: 'Student Gov',
  hall_council: 'Hall Council',
  greek_life: 'Greek Life',
  sports: 'Sports',
  academic: 'Academic',
  cultural: 'Cultural',
  service: 'Service',
  professional: 'Professional',
  religious: 'Religious',
  special_interest: 'Special Interest',
  honors: 'Honors',
};

export default function MyOrgsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadMemberships();
  }, [user]);

  const loadMemberships = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('org_memberships')
        .select(`
          id,
          org_id,
          role,
          title,
          status,
          joined_at,
          organization:organizations (
            id,
            name,
            type,
            description,
            verified,
            member_count
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setMemberships(data as any || []);
    } catch (error) {
      console.error('Error loading memberships:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMemberships();
  };

  const filteredMemberships = memberships.filter((membership) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return membership.status === 'pending';
    return membership.role === filter && membership.status === 'active';
  });

  const groupedMemberships = filteredMemberships.reduce((acc, membership) => {
    let group = '';
    if (membership.status === 'pending') {
      group = 'Pending';
    } else {
      switch (membership.role) {
        case 'admin':
          group = 'Admin';
          break;
        case 'executive':
          group = 'Executive';
          break;
        case 'member':
          group = 'Member';
          break;
      }
    }

    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(membership);
    return acc;
  }, {} as Record<string, OrgMembership[]>);

  const stats = {
    total: memberships.filter(m => m.status === 'active').length,
    admin: memberships.filter(m => m.role === 'admin' && m.status === 'active').length,
    pending: memberships.filter(m => m.status === 'pending').length,
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admin' },
    { key: 'executive', label: 'Executive' },
    { key: 'member', label: 'Member' },
    { key: 'pending', label: 'Pending' },
  ];

  const getRoleBadgeColor = (role: MemberRole) => {
    switch (role) {
      case 'admin':
        return COLORS.primary;
      case 'executive':
        return '#F59E0B';
      case 'member':
        return COLORS.textSecondary;
    }
  };

  const getRoleLabel = (role: MemberRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'executive':
        return 'Executive';
      case 'member':
        return 'Member';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const navigateToOrg = (orgId: string) => {
    router.push(`/organization-profile?id=${orgId}`);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>You haven't joined any organizations yet</Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/organizations')}
      >
        <Text style={styles.browseButtonText}>Browse Organizations</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrgCard = (membership: OrgMembership) => {
    const org = membership.organization;
    const typeColor = TYPE_COLORS[org.type];
    const initial = org.name.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        key={membership.id}
        style={styles.orgCard}
        onPress={() => navigateToOrg(org.id)}
      >
        <View style={styles.orgCardContent}>
          <View style={[styles.orgLogo, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.orgLogoText, { color: typeColor }]}>{initial}</Text>
          </View>

          <View style={styles.orgInfo}>
            <View style={styles.orgHeader}>
              <Text style={styles.orgName} numberOfLines={1}>
                {org.name}
              </Text>
              {org.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>

            <View style={styles.badges}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {TYPE_LABELS[org.type]}
                </Text>
              </View>

              {membership.status === 'active' && (
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleBadgeColor(membership.role) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: getRoleBadgeColor(membership.role) },
                    ]}
                  >
                    {getRoleLabel(membership.role)}
                  </Text>
                </View>
              )}

              {membership.status === 'pending' && (
                <View style={[styles.roleBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Text style={[styles.roleBadgeText, { color: '#F59E0B' }]}>
                    Pending
                  </Text>
                </View>
              )}
            </View>

            {membership.title && (
              <Text style={styles.customTitle}>{membership.title}</Text>
            )}

            <View style={styles.orgMeta}>
              <Text style={styles.orgMetaText}>
                {org.member_count} {org.member_count === 1 ? 'member' : 'members'}
              </Text>
              <Text style={styles.orgMetaText}>•</Text>
              <Text style={styles.orgMetaText}>
                Joined {formatDate(membership.joined_at)}
              </Text>
            </View>

            {org.description && (
              <Text style={styles.orgDescription} numberOfLines={2}>
                {org.description}
              </Text>
            )}
          </View>

          <ChevronRight size={20} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Organizations</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Organizations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.admin}</Text>
            <Text style={styles.statLabel}>Admin in</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[
                styles.filterPill,
                filter === filterItem.key && styles.filterPillActive,
              ]}
              onPress={() => setFilter(filterItem.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === filterItem.key && styles.filterPillTextActive,
                ]}
              >
                {filterItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredMemberships.length === 0 ? (
          renderEmpty()
        ) : (
          <View style={styles.orgsList}>
            {Object.entries(groupedMemberships).map(([group, items]) => (
              <View key={group} style={styles.orgGroup}>
                <Text style={styles.groupTitle}>{group}</Text>
                {items.map(renderOrgCard)}
              </View>
            ))}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT.sizes.xl,
    fontWeight: FONT.weights.bold as any,
    color: COLORS.text,
  },
  filterButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  statValue: {
    fontSize: FONT.sizes.xxl,
    fontWeight: FONT.weights.bold as any,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
  },
  filtersScroll: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  filtersContent: {
    gap: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: FONT.sizes.sm,
    fontWeight: FONT.weights.medium as any,
    color: COLORS.text,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  orgsList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  orgGroup: {
    gap: SPACING.sm,
  },
  groupTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: FONT.weights.bold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  orgCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orgCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  orgLogo: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgLogoText: {
    fontSize: FONT.sizes.xl,
    fontWeight: FONT.weights.bold as any,
  },
  orgInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  orgName: {
    fontSize: FONT.sizes.md,
    fontWeight: FONT.weights.bold as any,
    color: COLORS.text,
    flex: 1,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  badges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: FONT.sizes.xs,
    fontWeight: FONT.weights.medium as any,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  roleBadgeText: {
    fontSize: FONT.sizes.xs,
    fontWeight: FONT.weights.medium as any,
  },
  customTitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: FONT.weights.medium as any,
    color: COLORS.primary,
  },
  orgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  orgMetaText: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
  },
  orgDescription: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: FONT.weights.medium as any,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  browseButtonText: {
    fontSize: FONT.sizes.md,
    fontWeight: FONT.weights.semibold as any,
    color: '#FFFFFF',
  },
});
