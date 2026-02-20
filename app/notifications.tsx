import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Notification } from '@/lib/types';
import { ArrowLeft, Bell, CheckCheck, Calendar, Wrench, FileText, Zap, AlertCircle, MessageSquare, Star, Trash2 } from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, []));

  useEffect(() => {
    if (!currentUserId) return;

    channelRef.current = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId]);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id).eq('read', true);
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const notifIcon = (type: string) => {
    if (type.includes('booking')) return <Calendar size={18} color={COLORS.primary} />;
    if (type.includes('maintenance')) return <Wrench size={18} color={COLORS.error} />;
    if (type.includes('tenancy') || type.includes('agreement')) return <FileText size={18} color={COLORS.accent} />;
    if (type.includes('utility') || type.includes('topup')) return <Zap size={18} color={COLORS.warning} />;
    if (type.includes('message')) return <MessageSquare size={18} color={COLORS.teal} />;
    if (type.includes('review')) return <Star size={18} color={COLORS.gold} />;
    return <Bell size={18} color={COLORS.textSecondary} />;
  };

  const notifIconBg = (type: string) => {
    if (type.includes('booking')) return COLORS.primaryFaded;
    if (type.includes('maintenance')) return COLORS.errorLight;
    if (type.includes('tenancy') || type.includes('agreement')) return COLORS.infoLight;
    if (type.includes('utility') || type.includes('topup')) return COLORS.warningLight;
    if (type.includes('message')) return 'rgba(12,192,176,0.1)';
    if (type.includes('review')) return 'rgba(245,158,11,0.1)';
    return COLORS.background;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return dateStr.slice(0, 10);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
              <CheckCheck size={16} color={COLORS.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {readCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAllRead}>
              <Trash2 size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Bell size={14} color={COLORS.primary} />
          <Text style={styles.unreadText}>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up! Notifications about bookings, payments, and messages will appear here.</Text>
          </View>
        ) : (
          notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, !n.read && styles.notifCardUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: notifIconBg(n.type) }]}>
                {notifIcon(n.type)}
              </View>
              <View style={styles.notifBody}>
                <View style={styles.notifTitleRow}>
                  <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>{n.title}</Text>
                  {!n.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifText} numberOfLines={2}>{n.message}</Text>
                <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
              </View>
              {n.read && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteNotification(n.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={14} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.primary },
  clearBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryFaded, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  unreadText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.primary },

  content: { padding: SPACING.md },
  loadingText: { textAlign: 'center', marginTop: 60, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  notifCardUnread: { borderColor: COLORS.primary, backgroundColor: 'rgba(220,20,60,0.02)' },
  iconBox: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  notifBody: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 3 },
  notifTitle: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textPrimary, flex: 1 },
  notifTitleUnread: { fontFamily: FONT.semiBold },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  notifText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 4 },
  notifTime: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  deleteBtn: { padding: 4 },
});
