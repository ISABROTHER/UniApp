import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  Bell, Calendar, CheckCircle, AlertTriangle, FileText,
  Users, Shield, Clock, ChevronRight, Archive, Vote,
} from 'lucide-react-native';

interface HallPost {
  id: string;
  title: string;
  content: string;
  post_type: 'announcement' | 'event' | 'exercise' | 'election' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_audience: string[];
  poster_role: string;
  created_at: string;
  expires_at: string | null;
  is_read: boolean;
  attachments?: any[];
  event_date?: string;
  deadline?: string;
  submission_status?: 'pending' | 'submitted' | 'late' | 'missing';
}

interface HallInfo {
  id: string;
  name: string;
  total_members: number;
  residents: number;
  affiliates: number;
  unread_count: number;
  next_event: string | null;
  urgent_alerts: number;
}

const POST_TYPE_CONFIG = {
  announcement: { icon: Bell, color: COLORS.info, label: 'Announcement' },
  event: { icon: Calendar, color: COLORS.success, label: 'Event' },
  exercise: { icon: FileText, color: COLORS.warning, label: 'Exercise' },
  election: { icon: Vote, color: COLORS.purple, label: 'Election' },
  emergency: { icon: AlertTriangle, color: COLORS.error, label: 'Emergency' },
};

const PRIORITY_CONFIG = {
  low: { color: COLORS.textTertiary, label: 'Low' },
  medium: { color: COLORS.info, label: 'Medium' },
  high: { color: COLORS.warning, label: 'High' },
  urgent: { color: COLORS.error, label: 'Urgent' },
};

function PostCard({ post, onPress }: { post: HallPost; onPress: () => void }) {
  const config = POST_TYPE_CONFIG[post.post_type];
  const Icon = config.icon;
  const priorityColor = PRIORITY_CONFIG[post.priority].color;
  const isExpired = post.expires_at && new Date(post.expires_at) < new Date();

  return (
    <TouchableOpacity
      style={[
        styles.postCard,
        !post.is_read && styles.postCardUnread,
        post.priority === 'urgent' && styles.postCardUrgent,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.postHeader}>
        <View style={[styles.postTypeIcon, { backgroundColor: config.color + '15' }]}>
          <Icon size={18} color={config.color} />
        </View>
        <View style={styles.postHeaderText}>
          <View style={styles.postTitleRow}>
            <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
            {!post.is_read && <View style={styles.unreadDot} />}
          </View>
          <View style={styles.postMeta}>
            <Text style={styles.postRole}>{post.poster_role}</Text>
            <Text style={styles.postMetaDot}>•</Text>
            <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>
            {post.priority !== 'low' && (
              <>
                <Text style={styles.postMetaDot}>•</Text>
                <Text style={[styles.postPriority, { color: priorityColor }]}>
                  {PRIORITY_CONFIG[post.priority].label}
                </Text>
              </>
            )}
          </View>
        </View>
        <ChevronRight size={20} color={COLORS.textTertiary} />
      </View>

      <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>

      {post.event_date && (
        <View style={styles.postFooter}>
          <Calendar size={14} color={COLORS.success} />
          <Text style={styles.postFooterText}>{formatDate(post.event_date)}</Text>
        </View>
      )}

      {post.deadline && (
        <View style={styles.postFooter}>
          <Clock size={14} color={COLORS.warning} />
          <Text style={styles.postFooterText}>Due: {formatDate(post.deadline)}</Text>
          {post.submission_status && (
            <View style={[
              styles.statusBadge,
              post.submission_status === 'submitted' && styles.statusSubmitted,
              post.submission_status === 'late' && styles.statusLate,
            ]}>
              <Text style={styles.statusText}>
                {post.submission_status === 'submitted' ? 'Submitted' : 
                 post.submission_status === 'late' ? 'Late' : 'Pending'}
              </Text>
            </View>
          )}
        </View>
      )}

      {isExpired && (
        <Text style={styles.expiredLabel}>Expired</Text>
      )}
    </TouchableOpacity>
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyHallScreen() {
  const router = useRouter();
  const [hallInfo, setHallInfo] = useState<HallInfo | null>(null);
  const [posts, setPosts] = useState<HallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'announcement' | 'event' | 'exercise' | 'election' | 'emergency'>('all');

  useEffect(() => {
    fetchHallData();
  }, []);

  const fetchHallData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('members')
        .select('hall_id, student_level, is_resident')
        .eq('id', user.id)
        .single();

      if (!memberData?.hall_id) {
        setLoading(false);
        return;
      }

      const [hallRes, postsRes, statsRes] = await Promise.all([
        supabase
          .from('halls')
          .select('id, name')
          .eq('id', memberData.hall_id)
          .single(),
        supabase
          .from('hall_posts')
          .select('*, hall_post_reads!left(is_read)')
          .eq('hall_id', memberData.hall_id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('hall_members')
          .select('id, is_resident', { count: 'exact' })
          .eq('hall_id', memberData.hall_id),
      ]);

      if (hallRes.data) {
        const totalMembers = statsRes.count || 0;
        const residents = statsRes.data?.filter(m => m.is_resident).length || 0;
        
        setHallInfo({
          id: hallRes.data.id,
          name: hallRes.data.name,
          total_members: totalMembers,
          residents: residents,
          affiliates: totalMembers - residents,
          unread_count: postsRes.data?.filter(p => !p.hall_post_reads?.[0]?.is_read).length || 0,
          next_event: null,
          urgent_alerts: postsRes.data?.filter(p => p.priority === 'urgent').length || 0,
        });
      }

      if (postsRes.data) {
        setPosts(postsRes.data.map(p => ({
          ...p,
          is_read: p.hall_post_reads?.[0]?.is_read || false,
        })));
      }
    } catch (error) {
      console.error('Error fetching hall data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'all') return posts;
    return posts.filter(p => p.post_type === activeFilter);
  }, [posts, activeFilter]);

  const stats = useMemo(() => {
    return {
      announcements: posts.filter(p => p.post_type === 'announcement').length,
      events: posts.filter(p => p.post_type === 'event').length,
      exercises: posts.filter(p => p.post_type === 'exercise' && p.submission_status !== 'submitted').length,
      elections: posts.filter(p => p.post_type === 'election').length,
    };
  }, [posts]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading hall...</Text>
      </View>
    );
  }

  if (!hallInfo) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No Hall Assigned</Text>
        <Text style={styles.emptyText}>You are not currently assigned to a hall</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>My Hall</Text>
            <Text style={styles.headerHallName}>{hallInfo.name}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <Shield size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{hallInfo.total_members}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{hallInfo.residents}</Text>
            <Text style={styles.statLabel}>Residents</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{hallInfo.affiliates}</Text>
            <Text style={styles.statLabel}>Affiliates</Text>
          </View>
          {hallInfo.unread_count > 0 && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>{hallInfo.unread_count}</Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: COLORS.successLight }]}>
            <Calendar size={20} color={COLORS.success} />
          </View>
          <Text style={styles.actionLabel}>Events</Text>
          {stats.events > 0 && <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{stats.events}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: COLORS.warningLight }]}>
            <FileText size={20} color={COLORS.warning} />
          </View>
          <Text style={styles.actionLabel}>Exercises</Text>
          {stats.exercises > 0 && <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{stats.exercises}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#EDE9FE' }]}>
            <Vote size={20} color={COLORS.purple} />
          </View>
          <Text style={styles.actionLabel}>Elections</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: COLORS.borderLight }]}>
            <Archive size={20} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.actionLabel}>Archive</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'announcement', 'event', 'exercise', 'election'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                {filter === 'all' ? 'All Posts' : POST_TYPE_CONFIG[filter].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHallData(); }} tintColor={COLORS.primary} />
        }
      >
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Bell size={48} color={COLORS.border} />
            <Text style={styles.emptyFeedTitle}>No posts yet</Text>
            <Text style={styles.emptyFeedText}>Official hall updates will appear here</Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPress={() => {}}
            />
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F3F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F3F8',
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
    backgroundColor: '#F2F3F8',
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
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerGreeting: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  headerHallName: {
    fontFamily: FONT.headingBold,
    fontSize: 24,
    color: COLORS.primary,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    position: 'relative',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 10,
    color: COLORS.white,
  },
  filterRow: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  feedContainer: {
    flex: 1,
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  postCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  postCardUrgent: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  postTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postHeaderText: {
    flex: 1,
  },
  postTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  postTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postRole: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  postMetaDot: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  postTime: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  postPriority: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
  },
  postContent: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  postFooterText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.warningLight,
  },
  statusSubmitted: {
    backgroundColor: COLORS.successLight,
  },
  statusLate: {
    backgroundColor: COLORS.errorLight,
  },
  statusText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.warning,
  },
  expiredLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyFeedTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyFeedText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});