import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  Bell, Calendar, MessageCircle, AlertTriangle, Users,
  Shield, Award, ShoppingBag, TrendingUp, Activity,
  ChevronRight, Zap, CheckCircle2, Clock, MapPin,
} from 'lucide-react-native';

interface HallStats {
  totalMembers: number;
  residents: number;
  affiliates: number;
  unreadAnnouncements: number;
  upcomingEvents: number;
  pendingTasks: number;
  activeElections: number;
}

interface QuickStat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
  route?: string;
}

export default function MyHallScreen() {
  const router = useRouter();
  const { session, member } = useAuth();
  
  const [hallInfo, setHallInfo] = useState<any>(null);
  const [stats, setStats] = useState<HallStats>({
    totalMembers: 0,
    residents: 0,
    affiliates: 0,
    unreadAnnouncements: 0,
    upcomingEvents: 0,
    pendingTasks: 0,
    activeElections: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const pulseAnim = useState(new Animated.Value(1))[0];

  const userId = session?.user?.id || member?.id;

  // Pulse animation for live indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Main data fetching function
  const fetchHallData = async (uid: string) => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('hall_members')
        .select('hall_id, is_resident, halls(id, name)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }) // Get the most recent designation
        .limit(1)
        .maybeSingle();

      if (memberError) {
        throw memberError;
      }

      if (!memberData?.hall_id || !memberData.halls) {
        setHallInfo(null);
        return;
      }

      const hallData = Array.isArray(memberData.halls) ? memberData.halls[0] : memberData.halls;
      
      setHallInfo({
        id: hallData?.id || memberData.hall_id,
        name: hallData?.name || 'My Hall',
        isResident: memberData.is_resident,
      });

      // Fetch hall statistics
      const [membersRes, announcementsRes, eventsRes] = await Promise.all([
        supabase
          .from('hall_members')
          .select('is_resident', { count: 'exact' })
          .eq('hall_id', memberData.hall_id),
        supabase
          .from('hall_posts')
          .select('id, created_at, title, post_type, priority')
          .eq('hall_id', memberData.hall_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('hall_events')
          .select('id, title, event_date', { count: 'exact' })
          .eq('hall_id', memberData.hall_id)
          .gte('event_date', new Date().toISOString()),
      ]);

      const totalMembers = membersRes.count || membersRes.data?.length || 0;
      const residents = membersRes.data?.filter(m => m.is_resident).length || 0;

      setStats({
        totalMembers,
        residents,
        affiliates: totalMembers - residents,
        unreadAnnouncements: announcementsRes.data?.length || 0,
        upcomingEvents: eventsRes.count || eventsRes.data?.length || 0,
        pendingTasks: 0,
        activeElections: 0,
      });

      setRecentActivity(announcementsRes.data || []);
      
    } catch (error) {
      console.error('Error fetching hall data:', error);
    }
  };

  // Lifecycle Hook: Load Data
  useEffect(() => {
    let isMounted = true;

    if (userId) {
      setLoading(true);
      fetchHallData(userId).finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    } else {
      // If auth isn't ready instantly, give it a moment before showing "No Hall"
      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => { isMounted = false; };
  }, [userId]);

  // Lifecycle Hook: Setup Realtime Subscriptions properly
  useEffect(() => {
    if (!hallInfo?.id || !userId) return;

    const channelName = `hall_updates_${hallInfo.id}`;
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hall_posts', filter: `hall_id=eq.${hallInfo.id}` }, () => {
        fetchHallData(userId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hall_events', filter: `hall_id=eq.${hallInfo.id}` }, () => {
        fetchHallData(userId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hall_members', filter: `hall_id=eq.${hallInfo.id}` }, () => {
        fetchHallData(userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hallInfo?.id, userId]);

  const handleRefresh = () => {
    if (!userId) return;
    setRefreshing(true);
    fetchHallData(userId).finally(() => setRefreshing(false));
  };

  const quickStats: QuickStat[] = [
    {
      label: 'Announcements',
      value: stats.unreadAnnouncements,
      icon: Bell,
      color: COLORS.primary,
      bgColor: '#FEE2E2',
      route: '/hall/announcements',
    },
    {
      label: 'Events',
      value: stats.upcomingEvents,
      icon: Calendar,
      color: '#10B981',
      bgColor: '#D1FAE5',
      route: '/hall/events',
    },
    {
      label: 'Messages',
      value: '3',
      icon: MessageCircle,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      route: '/hall/messages',
    },
    {
      label: 'Services',
      value: '8',
      icon: ShoppingBag,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      route: '/hall/services',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading hall...</Text>
      </View>
    );
  }

  if (!hallInfo) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No Hall Assigned</Text>
        <Text style={styles.emptyText}>Register to your hall to access official announcements and events</Text>
        <TouchableOpacity 
          style={styles.registerBtn}
          onPress={() => router.push('/hall-designation' as any)}
          activeOpacity={0.8}
        >
          <Shield size={18} color={COLORS.white} />
          <Text style={styles.registerBtnText}>Register to Hall</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>My Hall</Text>
            <Text style={styles.headerHallName}>{hallInfo.name}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/hall-designation' as any)}>
            <Shield size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Live Stats Banner */}
        <View style={styles.liveStatsBanner}>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>Live Updates</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{stats.totalMembers}</Text>
              <Text style={styles.miniStatLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{stats.residents}</Text>
              <Text style={styles.miniStatLabel}>Residents</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{stats.affiliates}</Text>
              <Text style={styles.miniStatLabel}>Affiliates</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Quick Actions Grid */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActionsGrid}>
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionCard}
                  onPress={() => stat.route && router.push(stat.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: stat.bgColor }]}>
                    <Icon size={24} color={stat.color} />
                  </View>
                  <Text style={styles.quickActionValue}>{stat.value}</Text>
                  <Text style={styles.quickActionLabel}>{stat.label}</Text>
                  {typeof stat.value === 'number' && stat.value > 0 && (
                    <View style={[styles.badge, { backgroundColor: stat.color }]}>
                      <Text style={styles.badgeText}>{stat.value}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Main Navigation Cards */}
        <View style={styles.mainCardsSection}>
          <TouchableOpacity 
            style={[styles.mainCard, styles.mainCardPrimary]}
            onPress={() => router.push('/hall/jcrc-executives' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.mainCardHeader}>
              <View style={styles.mainCardIconWrap}>
                <Award size={28} color={COLORS.primary} />
              </View>
              <ChevronRight size={20} color={COLORS.white} />
            </View>
            <Text style={styles.mainCardTitle}>JCRC Executives</Text>
            <Text style={styles.mainCardSubtitle}>View hall leadership & send messages</Text>
            <View style={styles.mainCardFooter}>
              <Users size={14} color={COLORS.white} />
              <Text style={styles.mainCardFooterText}>12 Executive Members</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.mainCardsRow}>
            <TouchableOpacity 
              style={[styles.mainCardSmall, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/hall/events' as any)}
              activeOpacity={0.8}
            >
              <Calendar size={24} color={COLORS.white} />
              <Text style={styles.mainCardSmallTitle}>Events</Text>
              <Text style={styles.mainCardSmallValue}>{stats.upcomingEvents} Upcoming</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.mainCardSmall, { backgroundColor: '#3B82F6' }]}
              onPress={() => router.push('/hall/services' as any)}
              activeOpacity={0.8}
            >
              <ShoppingBag size={24} color={COLORS.white} />
              <Text style={styles.mainCardSmallTitle}>Services</Text>
              <Text style={styles.mainCardSmallValue}>Exercise Books & More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Feed */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/hall/announcements' as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Bell size={32} color={COLORS.border} />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          ) : (
            recentActivity.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => router.push(`/hall/post/${activity.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.activityIcon,
                  activity.post_type === 'announcement' && { backgroundColor: '#FEE2E2' },
                  activity.post_type === 'event' && { backgroundColor: '#D1FAE5' },
                ]}>
                  {activity.post_type === 'announcement' ? (
                    <Bell size={16} color={COLORS.primary} />
                  ) : (
                    <Calendar size={16} color="#10B981" />
                  )}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{formatTime(activity.created_at)}</Text>
                </View>
                {activity.priority === 'urgent' && (
                  <View style={styles.urgentBadge}>
                    <Zap size={12} color={COLORS.error} fill={COLORS.error} />
                  </View>
                )}
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Hall Infographic/Overview */}
        <View style={styles.infographicSection}>
          <Text style={styles.sectionTitle}>Hall Overview</Text>
          <View style={styles.infographicCard}>
            <View style={styles.infographicRow}>
              <View style={styles.infographicItem}>
                <TrendingUp size={20} color="#10B981" />
                <Text style={styles.infographicValue}>87%</Text>
                <Text style={styles.infographicLabel}>Occupancy</Text>
              </View>
              <View style={styles.infographicItem}>
                <Activity size={20} color="#3B82F6" />
                <Text style={styles.infographicValue}>45</Text>
                <Text style={styles.infographicLabel}>Events This Sem</Text>
              </View>
              <View style={styles.infographicItem}>
                <CheckCircle2 size={20} color="#F59E0B" />
                <Text style={styles.infographicValue}>92%</Text>
                <Text style={styles.infographicLabel}>Task Completion</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontFamily: FONT.heading,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerGreeting: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  headerHallName: {
    fontFamily: FONT.headingBold,
    fontSize: 26,
    color: COLORS.primary,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveStatsBanner: {
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  miniStatLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  quickActionsSection: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionValue: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  quickActionLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: COLORS.white,
  },
  mainCardsSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  mainCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  mainCardPrimary: {
    backgroundColor: COLORS.primary,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mainCardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCardTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 22,
    color: COLORS.white,
    marginBottom: 4,
  },
  mainCardSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: SPACING.md,
  },
  mainCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainCardFooterText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.white,
  },
  mainCardsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  mainCardSmall: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainCardSmallTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.white,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  mainCardSmallValue: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  activitySection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.primary,
  },
  emptyActivity: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  activityTime: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  urgentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infographicSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  infographicCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infographicRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infographicItem: {
    alignItems: 'center',
  },
  infographicValue: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  infographicLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});