import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Notification } from '@/lib/types';
import { ArrowLeft, Bell, CheckCheck, Calendar, Wrench, FileText, Zap, AlertCircle, MessageSquare, Star, Trash2, PlusCircle } from 'lucide-react-native';
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
    // If it's a fake local notification (has no real DB id), just update local state
    if (id.startsWith('temp-')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      return;
    }
    
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (currentUserId) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUserId).eq('read', false);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!id.startsWith('temp-')) {
      await supabase.from('notifications').delete().eq('id', id);
    }
  };

  const clearAllRead = async () => {
    setNotifications(prev => prev.filter(n => !n.read));
    if (currentUserId) {
      await supabase.from('notifications').delete().eq('user_id', currentUserId).eq('read', true);
    }
  };

  // --- TEMPORARY DEV SEED FUNCTION (Bypasses DB, purely local UI test) --- //
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

    setNotifications(prev => [...fakeData, ...prev]);
  };
  // ---------------------------------------------------------------------- //

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
    if (type.includes('message')) return 'rgba(12,192,176,0.1)';
    if (type.includes('review')) return 'rgba(245,158,11,0.1)';
    return 'rgba(142,142,147,0.1)';
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        
        <View style={styles.headerActions}>
          {/* TEMPORARY SEED BUTTON */}
          <TouchableOpacity style={styles.seedBtn} onPress={seedTestNotifications} activeOpacity={0.7}>
            <PlusCircle size={16} color={COLORS.white} />
            <Text style={styles.seedBtnText}>Seed UI</Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
              <CheckCheck size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {readCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAllRead} activeOpacity={0.7}>
              <Trash2 size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Bell size={16} color={COLORS.primary} />
          <Text style={styles.unreadText}>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : notifications.length === 0 ? (
          
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconBg}>
              <Bell size={36} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up! Notifications about bookings, payments, and messages will appear here.</Text>
          </View>
          
        ) : (
          notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, !n.read && styles.notifCardUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: notifIconBg(n.type) }]}>
                {notifIcon(n.type)}
              </View>
              
              <View style={styles.notifBody}>
                <View style={styles.notifTitleRow}>
                  <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifText} numberOfLines={2}>{n.message}</Text>
                <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
              </View>
              
              {n.read && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteNotification(n.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                >
                  <Trash2 size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F7F9' 
  },
  
  header: { 
    backgroundColor: 'rgba(255,255,255,0.92)', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'web' ? 20 : 56, 
    paddingHorizontal: SPACING.md, 
    paddingBottom: SPACING.md, 
    gap: SPACING.sm, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  backBtn: { 
    width: 40, height: 40, 
    borderRadius: RADIUS.full, 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  headerTitle: { 
    fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, flex: 1 
  },
  headerActions: { 
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs 
  },
  seedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.teal,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full,
    marginRight: 4,
  },
  seedBtnText: {
    fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white
  },
  markAllBtn: { 
    width: 36, height: 36, 
    borderRadius: RADIUS.full, 
    backgroundColor: 'rgba(220,20,60,0.06)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  clearBtn: { 
    width: 36, height: 36, 
    borderRadius: RADIUS.full, 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    justifyContent: 'center', alignItems: 'center' 
  },

  unreadBanner: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, 
    backgroundColor: 'rgba(255,255,255,0.85)', 
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(220,20,60,0.1)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 5,
  },
  unreadText: { 
    fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary 
  },

  content: { 
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  loadingText: { 
    textAlign: 'center', marginTop: 60, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary 
  },

  emptyStateCard: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  emptyIconBg: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { 
    fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 
  },
  emptySubtitle: { 
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 
  },

  notifCard: { 
    flexDirection: 'row', alignItems: 'flex-start', 
    backgroundColor: 'rgba(255,255,255,0.92)', 
    borderRadius: RADIUS.xl, 
    padding: SPACING.lg, 
    marginBottom: SPACING.md, 
    gap: SPACING.md, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  notifCardUnread: { 
    borderColor: 'rgba(220,20,60,0.15)', 
    backgroundColor: 'rgba(220,20,60,0.02)',
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  iconBox: { 
    width: 48, height: 48, 
    borderRadius: RADIUS.md, 
    justifyContent: 'center', alignItems: 'center' 
  },
  notifBody: { flex: 1 },
  notifTitleRow: { 
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 
  },
  notifTitle: { 
    fontFamily: FONT.medium, fontSize: 15, color: COLORS.textPrimary, flex: 1 
  },
  notifTitleUnread: { 
    fontFamily: FONT.bold, color: COLORS.textPrimary
  },
  unreadDot: { 
    width: 10, height: 10, 
    borderRadius: 5, 
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  notifText: { 
    fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 6 
  },
  notifTime: { 
    fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary 
  },
  deleteBtn: { 
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: RADIUS.full,
  },
});