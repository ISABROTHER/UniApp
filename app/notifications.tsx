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
      {/* 1. Glassmorphism on the Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        
        {/* 6. Polished Action Buttons */}
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
              <CheckCheck size={16} color={COLORS.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {readCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAllRead} activeOpacity={0.7}>
              <Trash2 size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 5. Premium Unread Banner */}
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
          
          /* 7. Enhanced Empty State */
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconBg}>
              <Bell size={36} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up! Notifications about bookings, payments, and messages will appear here.</Text>
          </View>
          
        ) : (
          notifications.map((n) => (
            
            /* 2 & 3 & 4. Glassmorphism, Airy Layout, Stronger Unread on Cards */
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
    backgroundColor: '#F7F7F9' // Slightly cooler off-white background to make glass pop
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
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm 
  },
  markAllBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(220,20,60,0.06)', // Very subtle primary background
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  markAllText: { 
    fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary 
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
    backgroundColor: 'rgba(220,20,60,0.02)', // Very soft warm tint
    borderLeftWidth: 4, // Left accent bar
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
    fontFamily: FONT.bold, color: COLORS.textPrimary // Fully bold for unread
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