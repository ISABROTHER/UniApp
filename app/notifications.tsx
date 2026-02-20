// app/notifications.tsx (or your current Notifications screen file path)
// ✅ Redesigned to match iOS “Inbox” list (like your screenshot):
// - Clean list rows (no big cards, no shadows)
// - Left aligned: Heading + message preview
// - Right aligned: time + chevron
// - Unread is subtle + professional: bold title + tiny dot (NO red tint / no “unprofessional” highlight)
// - “Read more” is a small link at the top-right of the row to expand/collapse message

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  FlatList,
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
      { id: tempId(), user_id: userId, type: 'booking', title: 'Booking Confirmed! 🎉', message: 'Your room at Valco Hostel has been officially booked for the upcoming semester. Please check your receipt and move-in instructions inside the booking page.', read: false, created_at: now },
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
    const next = expandedId === n.id ? null : n.id;
    setExpandedId(next);
    if (!n.read) await markRead(n.id);
  };

  const renderRow = ({ item: n }: { item: Notification }) => {
    const isExpanded = expandedId === n.id;
    const message = n.message || '';
    const hasLongText = message.length > 90;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => markRead(n.id)}
        activeOpacity={0.75}
      >
        {/* Left */}
        <View style={styles.left}>
          <View style={styles.titleLine}>
            <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={1}>
              {n.title}
            </Text>
            {!n.read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.preview} numberOfLines={isExpanded ? 0 : 1}>
            {message}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.right}>
          <Text style={[styles.time, !n.read && styles.timeUnread]}>{timeAgo(n.created_at)}</Text>

          {hasLongText ? (
            <TouchableOpacity
              onPress={() => toggleReadMore(n)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.readMorePill}
            >
              <Text style={styles.readMoreText}>{isExpanded ? 'Less' : 'Read'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chevronWrap}>
              <Text style={styles.chevron}>›</Text>
            </View>
          )}
        </View>

        {/* Delete (only if read) */}
        {n.read && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteNotification(n.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Trash2 size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header like iOS */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Inbox</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.seedBtn} onPress={seedTestNotifications} activeOpacity={0.85}>
            <PlusCircle size={16} color={COLORS.primary} />
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={markAllRead} activeOpacity={0.85}>
              <CheckCheck size={18} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {readCount > 0 && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={clearAllRead} activeOpacity={0.85}>
              <Trash2 size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <View style={styles.emptyWrap}>
              <Bell size={28} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No messages</Text>
              <Text style={styles.emptySub}>You’re all caught up.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONT.heading,
    fontSize: 34,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,122,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: { paddingBottom: 18 },

  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.10)',
    marginLeft: SPACING.md,
  },

  row: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  left: { flex: 1, paddingRight: 10 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  titleUnread: { fontFamily: FONT.bold },

  preview: {
    marginTop: 4,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 8, minWidth: 62 },
  time: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  timeUnread: { color: COLORS.textSecondary },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  chevronWrap: { width: 18, alignItems: 'flex-end' },
  chevron: { fontSize: 22, color: 'rgba(60,60,67,0.35)', marginTop: -2 },

  readMorePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  readMoreText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textPrimary },

  deleteBtn: {
    marginLeft: 10,
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.035)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    textAlign: 'center',
    marginTop: 60,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary },
  emptySub: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
});