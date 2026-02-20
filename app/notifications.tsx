// app/notifications.tsx (or your current Notifications screen file path)
// ✅ UI redesign only (same logic), no new deps, won’t break build

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
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Calendar,
  Wrench,
  FileText,
  Zap,
  MessageSquare,
  Star,
  Trash2,
  PlusCircle,
} from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
    if (!id.startsWith('temp-')) {
      await supabase.from('notifications').delete().eq('id', id);
    }
  };

  const clearAllRead = async () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    if (currentUserId) {
      await supabase.from('notifications').delete().eq('user_id', currentUserId).eq('read', true);
    }
  };

  // TEMP DEV SEED
  const seedTestNotifications = () => {
    const now = new Date().toISOString();
    const tempId = () => `temp-${Math.random().toString(36).substring(2, 9)}`;
    const userId = currentUserId || 'test-user';

    const fakeData: Notification[] = [
      { id: tempId(), user_id: userId, type: 'booking', title: 'Booking Confirmed! 🎉', message: 'Your room at Valco Hostel has been officially booked for the upcoming semester.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'maintenance', title: 'Plumbing Fixed 🔧', message: 'The maintenance team has resolved the issue with your shower. Have a great day!', read: true, created_at: now },
      { id: tempId(), user_id: userId, type: 'tenancy', title: 'Action Required: Agreement 📝', message: 'Please review and digitally sign your updated tenancy agreement by Friday.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'utility', title: 'Low Power Warning ⚡', message: 'Your prepaid electricity token is running low (below 15 kWh). Top up soon to avoid power cuts.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'message', title: 'New Message from Owner 💬', message: '"Hello! Just reminding you that the main gate locks at 11 PM today. See you later!"', read: true, created_at: now },
      { id: tempId(), user_id: userId, type: 'review', title: 'Rate your stay ⭐', message: 'How was your experience this week? Leave a quick review to help other students.', read: false, created_at: now },
      { id: tempId(), user_id: userId, type: 'system', title: 'Welcome to UniApp! 🚀', message: 'Everything is set up perfectly. Check out the new features on your dashboard.', read: true, created_at: now },
    ];

    setNotifications((prev) => [...fakeData, ...prev]);
  };

  const notifIcon = (type: string) => {
    if (type.includes('booking')) return <Calendar size={20} color={COLORS.primary} />;
    if (type.includes('maintenance')) return <Wrench size={20} color={COLORS.error} />;
    if (type.includes('tenancy') || type.includes('agreement')) return <FileText size={20} color={COLORS.accent} />;
    if (type.includes('utility') || type.includes('topup')) return <Zap size={20} color={COLORS.warning} />;
    if (type.includes('message')) return <MessageSquare size={20} color={COLORS.teal} />;
    if (type.includes('review')) return <Star size={20} color={COLORS.gold} />;
    return <Bell size={20} color={COLORS.textSecondary} />;
  };

  const notifIconBg = (type: string) => {
    if (type.includes('booking')) return COLORS.primaryFaded;
    if (type.includes('maintenance')) return COLORS.errorLight;
    if (type.includes('tenancy') || type.includes('agreement')) return COLORS.infoLight;
    if (type.includes('utility') || type.includes('topup')) return COLORS.warningLight;
    if (type.includes('message')) return 'rgba(12,192,176,0.12)';
    if (type.includes('review')) return 'rgba(245,158,11,0.12)';
    return 'rgba(142,142,147,0.12)';
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

  // segmented groups (simple + fast)
  const pinned = useMemo(() => notifications.slice(0, 3), [notifications]);
  const rest = useMemo(() => notifications.slice(3), [notifications]);

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

      {/* Sub-header / chips */}
      <View style={styles.subHeader}>
        <View style={styles.chipRow}>
          <View style={[styles.chip, unreadCount > 0 ? styles.chipHot : styles.chipSoft]}>
            <Bell size={14} color={unreadCount > 0 ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.chipText, unreadCount > 0 ? styles.chipTextHot : styles.chipTextSoft]}>
              {unreadCount > 0 ? `${unreadCount} Unread` : 'No Unread'}
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity style={styles.chipAction} onPress={markAllRead} activeOpacity={0.8}>
              <CheckCheck size={14} color={COLORS.textPrimary} />
              <Text style={styles.chipActionText}>Mark all read</Text>
            </TouchableOpacity>
          )}
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
          <>
            {/* Pinned/Recent strip */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest</Text>
              <Text style={styles.sectionHint}>Tap a card to mark as read</Text>
            </View>

            {pinned.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                onPress={() => markRead(n.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: notifIconBg(n.type) }]}>{notifIcon(n.type)}</View>

                <View style={styles.notifBody}>
                  <View style={styles.notifTitleRow}>
                    <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                      {!n.read && <View style={styles.unreadDot} />}
                    </View>
                  </View>
                  <Text style={styles.notifText} numberOfLines={2}>
                    {n.message}
                  </Text>
                </View>

                {n.read && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteNotification(n.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {/* Rest */}
            {rest.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
                  <Text style={styles.sectionTitle}>Earlier</Text>
                </View>

                {rest.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                    onPress={() => markRead(n.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.iconBox, { backgroundColor: notifIconBg(n.type) }]}>{notifIcon(n.type)}</View>

                    <View style={styles.notifBody}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                          {!n.read && <View style={styles.unreadDot} />}
                        </View>
                      </View>
                      <Text style={styles.notifText} numberOfLines={2}>
                        {n.message}
                      </Text>
                    </View>

                    {n.read && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteNotification(n.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color={COLORS.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 30 }} />
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
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  chipHot: { backgroundColor: 'rgba(220,20,60,0.08)' },
  chipSoft: { backgroundColor: 'rgba(0,0,0,0.04)' },
  chipText: { fontFamily: FONT.semiBold, fontSize: 13 },
  chipTextHot: { color: COLORS.primary },
  chipTextSoft: { color: COLORS.textSecondary },

  chipAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  chipActionText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },

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

  sectionHeader: {
    marginBottom: SPACING.sm,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textSecondary },
  sectionHint: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  notifCardUnread: {
    borderColor: 'rgba(220,20,60,0.16)',
    backgroundColor: 'rgba(220,20,60,0.03)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  notifBody: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  notifTitle: { fontFamily: FONT.medium, fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  notifTitleUnread: { fontFamily: FONT.bold, color: COLORS.textPrimary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  notifTime: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary },

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

  deleteBtn: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.035)',
    borderRadius: RADIUS.full,
  },
});