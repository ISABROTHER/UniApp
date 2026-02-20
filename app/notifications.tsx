// app/notifications.tsx (or your current Notifications screen file path)
// ✅ Changes per your request:
// - Removed logos/icons from each notification card (no iconBox)
// - Clean layout: Heading + info only (less scattered)
// - Message box is smaller (short preview)
// - Tap “Read more” at the top of a card to expand full message (and “Show less”)

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Notification } from '@/lib/types';
import { ArrowLeft, Bell, CheckCheck, Trash2, PlusCircle } from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  useEffect(() => {
    if (!currentUserId) return;

    channelRef.current = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          setExpandedId((cur) => (cur === deleted.id ? null : cur));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentUserId]);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markRead = async (id: string) => {
    if (id.startsWith('temp-')) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return;
    }
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (currentUserId) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUserId).eq('read', false);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
    if (!id.startsWith('temp-')) {
      await supabase.from('notifications').delete().eq('id', id);
    }
  };

  const clearAllRead = async () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    if (currentUserId) {
      await supabase.from('notifications').delete().eq('user_id', currentUserId).eq('read', true);
    }
    setExpandedId(null);
  };

  // TEMP DEV SEED
  const seedTestNotifications = () => {
    const now = new Date().toISOString();
    const tempId = () => `temp-${Math.random().toString(36).substring(2, 9)}`;
    const userId = currentUserId || 'test-user';

    const fakeData: Notification[] = [
      { id: tempId(), user_id: userId, type: 'booking', title: 'Booking Confirmed! 🎉', message: 'Your room at Valco Hostel has been officially booked for the upcoming semester. Please check your receipt and the move-in instructions inside the booking page.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'maintenance', title: 'Plumbing Fixed 🔧', message: 'The maintenance team has resolved the issue with your shower. If the problem returns, raise a new ticket from the Maintenance tab.', read: true, created_at: now },
      { id: tempId(), user_id: userId, type: 'tenancy', title: 'Action Required: Agreement 📝', message: 'Please review and digitally sign your updated tenancy agreement by Friday. If you have questions, send a message to your hostel manager.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'utility', title: 'Low Power Warning ⚡', message: 'Your prepaid electricity token is running low (below 15 kWh). Top up soon to avoid power cuts. You can top up from the Wallet tab.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'message', title: 'New Message from Owner 💬', message: '"Hello! Just reminding you that the main gate locks at 11 PM today. Please arrive early or call security if you’ll be late."', read: true, created_at: now },
      { id: tempId(), user_id: userId, type: 'review', title: 'Rate your stay ⭐', message: 'How was your experience this week? Leave a quick review to help other students. Your feedback improves services.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'system', title: 'Welcome to UniApp! 🚀', message: 'Everything is set up perfectly. Check out the new features on your dashboard. You can also enable notifications in Settings.', read: true, created_at: now },
    ];

    setNotifications((prev) => [...fakeData, ...prev]);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return dateStr.slice(0, 10);
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.read).length, [notifications]);

  const toggleReadMore = async (n: Notification) => {
    // Expand/collapse only; also mark read (nice UX) when opening details
    const next = expandedId === n.id ? null : n.id;
    setExpandedId(next);

    if (!n.read) {
      await markRead(n.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerMeta}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            {notifications.length > 0 ? ` · ${notifications.length} total` : ''}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.seedBtn} onPress={seedTestNotifications} activeOpacity={0.8}>
            <PlusCircle size={16} color={COLORS.white} />
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity style={styles.iconBtnPrimary} onPress={markAllRead} activeOpacity={0.8}>
              <CheckCheck size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {readCount > 0 && (
            <TouchableOpacity style={styles.iconBtn} onPress={clearAllRead} activeOpacity={0.8}>
              <Trash2 size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sub header */}
      <View style={styles.subHeader}>
        <View style={[styles.pill, unreadCount > 0 ? styles.pillHot : styles.pillSoft]}>
          <Bell size={14} color={unreadCount > 0 ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.pillText, unreadCount > 0 ? styles.pillTextHot : styles.pillTextSoft]}>
            {unreadCount > 0 ? `${unreadCount} Unread` : 'No Unread'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconBg}>
              <Bell size={34} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              Bookings, maintenance updates, payment reminders, and messages will show here.
            </Text>
            <TouchableOpacity style={styles.primaryCta} onPress={seedTestNotifications} activeOpacity={0.85}>
              <PlusCircle size={16} color={COLORS.white} />
              <Text style={styles.primaryCtaText}>Seed demo notifications</Text>
            </TouchableOpacity>
          </View>
        ) : (
          notifications.map((n) => {
            const isExpanded = expandedId === n.id;
            const hasLongText = (n.message || '').length > 90;

            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => markRead(n.id)}
                activeOpacity={0.78}
              >
                {/* Top row: heading + time + read-more toggle */}
                <View style={styles.topRow}>
                  <View style={styles.titleWrap}>
                    <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>

                  <View style={styles.rightMeta}>
                    <Text style={styles.time}>{timeAgo(n.created_at)}</Text>

                    {hasLongText && (
                      <TouchableOpacity
                        onPress={() => toggleReadMore(n)}
                        activeOpacity={0.75}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.readMoreBtn}
                      >
                        <Text style={styles.readMoreText}>{isExpanded ? 'Show less' : 'Read more'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Message preview / expanded */}
                <Text
                  style={styles.message}
                  numberOfLines={isExpanded ? 0 : 2}
                >
                  {n.message}
                </Text>

                {/* Footer actions (keep clean) */}
                {n.read && (
                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => deleteNotification(n.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={COLORS.textTertiary} />
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 26 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' },

  header: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  headerMeta: { marginTop: 2, fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  seedBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  iconBtnPrimary: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(220,20,60,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  subHeader: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  pillHot: { backgroundColor: 'rgba(220,20,60,0.08)' },
  pillSoft: { backgroundColor: 'rgba(0,0,0,0.04)' },
  pillText: { fontFamily: FONT.semiBold, fontSize: 13 },
  pillTextHot: { color: COLORS.primary },
  pillTextSoft: { color: COLORS.textSecondary },

  content: { padding: SPACING.md, paddingTop: SPACING.lg },
  loadingText: {
    textAlign: 'center',
    marginTop: 60,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  emptyStateCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  emptyIconBg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.teal,
  },
  primaryCtaText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },

  // Card redesign (no logo, compact)
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  cardUnread: {
    borderColor: 'rgba(220,20,60,0.16)',
    backgroundColor: 'rgba(220,20,60,0.03)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: FONT.medium, fontSize: 15, color: COLORS.textPrimary },
  titleUnread: { fontFamily: FONT.bold },

  rightMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },

  readMoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  readMoreText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },

  message: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  footer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  deleteText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary },
});