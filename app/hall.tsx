import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  Bell, Calendar, Users,
  Shield, Award, ShoppingBag, TrendingUp, Activity,
  ChevronRight, Zap, CheckCircle2,
} from 'lucide-react-native';

interface HallStats {
  totalMembers: number;
  unreadAnnouncements: number;
  upcomingEvents: number;
}

export default function MyHallScreen() {
  const router = useRouter();
  const { session, member } = useAuth();
  const [hallInfo, setHallInfo] = useState<any>(null);
  const [stats, setStats] = useState<HallStats>({
    totalMembers: 0,
    unreadAnnouncements: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Pulse animation for live indicator
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

    // Set up realtime subscriptions for live updates based strictly on Profile
    const setupRealtimeSubscriptions = async () => {
      const userId = session?.user?.id || member?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from('members')
        .select('hall_id')
        .eq('id', userId)
        .maybeSingle();
      
      const realHallId = profile?.hall_id;
      if (!realHallId) return;

      // Subscribe to hall_posts changes
      const postsChannel = supabase
        .channel('hall_posts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hall_posts',
            filter: `hall_id=eq.${realHallId}`,
          },
          () => {
            fetchHallData();
          }
        )
        .subscribe();

      // Subscribe to hall_events changes
      const eventsChannel = supabase
        .channel('hall_events_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hall_events',
            filter: `hall_id=eq.${realHallId}`,
          },
          () => {
            fetchHallData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(postsChannel);
        supabase.removeChannel(eventsChannel);
      };
    };

    setupRealtimeSubscriptions();
  }, [session?.user?.id, member?.id]);

  // Force fetch data every time the screen is focused to ensure instant updates 
  // if they just edited their profile.
  useFocusEffect(
    useCallback(() => {
      fetchHallData();
    }, [session?.user?.id, member?.id])
  );

  const fetchHallData = async () => {
    try {
      const userId = session?.user?.id || member?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      // 1. Strictly look at the User's Profile (members table)
      const { data: profileData } = await supabase
        .from('members')
        .select('hall_id, traditional_hall, university')
        .eq('id', userId)
        .maybeSingle();

      // If neither ID nor Name exists in the profile, they have no hall.
      if (!profileData?.hall_id && !profileData?.traditional_hall) {
        setHallInfo(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const finalHallId = profileData.hall_id;
      let finalHallName = profileData.traditional_hall;

      // If we have an ID but no string name in the profile, fetch the exact name from the halls table
      if (finalHallId && !finalHallName) {
        const { data: hallData } = await supabase
          .from('halls')
          .select('name')
          .eq('id', finalHallId)
          .maybeSingle();
        if (hallData?.name) finalHallName = hallData.name;
      }

      setHallInfo({
        id: finalHallId,
        name: finalHallName || 'My Hall',
        university: profileData.university,
      });

      // Fetch dashboard stats using the finalHallId
      if (finalHallId) {
        const [membersRes, announcementsRes, eventsRes] = await Promise.all([
          supabase
            .from('members') // Count total members directly from profiles
            .select('id', { count: 'exact' })
            .eq('hall_id', finalHallId),
          supabase
            .from('hall_posts')
            .select('id, created_at, title, post_type, priority', { count: 'exact' })
            .eq('hall_id', finalHallId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('hall_events')
            .select('id, title, event_date', { count: 'exact' })
            .eq('hall_id', finalHallId)
            .gte('event_date', new Date().toISOString()),
        ]);

        setStats({
          totalMembers: membersRes.count || 0,
          unreadAnnouncements: announcementsRes.count || 0,
          upcomingEvents: eventsRes.count || 0,
        });

        if (announcementsRes.data) {
          setRecentActivity(announcementsRes.data.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Error fetching hall data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
        <Text style={styles.emptyText}>Please update your Profile to select your University and Hall to access this dashboard.</Text>
        <TouchableOpacity 
          style={styles.registerBtn}
          onPress={() => router.push('/(tabs)/more' as any)}
          activeOpacity={0.8}
        >
          <Shield size={18} color={COLORS.white} />
          <Text style={styles.registerBtnText}>Go to Profile Settings</Text>
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
            {hallInfo.university && (
              <Text style={styles.headerUniversity}>{hallInfo.university}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/(tabs)/more' as any)}>
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
              <Text style={styles.miniStatLabel}>Total Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{stats.upcomingEvents}</Text>
              <Text style={styles.miniStatLabel}>Upcoming Events</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHallData(); }} tintColor={COLORS.primary} />
        }
      >
        <View style={{ height: SPACING.md }} />

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
              <Text style={styles.mainCardFooterText}>Executive Members</Text>
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
            recentActivity.map((activity, index) => (
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
                <Text style={styles.infographicValue}>Active</Text>
                <Text style={styles.infographicLabel}>Status</Text>
              </View>
              <View style={styles.infographicItem}>
                <Activity size={20} color="#3B82F6" />
                <Text style={styles.infographicValue}>{stats.upcomingEvents}</Text>
                <Text style={styles.infographicLabel}>Events This Sem</Text>
              </View>
              <View style={styles.infographicItem}>
                <CheckCircle2 size={20} color="#F59E0B" />
                <Text style={styles.infographicValue}>Verified</Text>
                <Text style={styles.infographicLabel}>Member</Text>
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
    lineHeight: 20,
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
  headerUniversity: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
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