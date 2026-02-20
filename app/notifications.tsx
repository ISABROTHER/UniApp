import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING } from '@/lib/constants';
import { Notification } from '@/lib/types';
import { ArrowLeft, Bell, Calendar, Wrench, FileText, Zap, MessageSquare, Star, Trash2 } from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

// Enforce San Francisco on iOS, Roboto on Android, system-ui on Web
const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'Roboto', web: 'system-ui' });

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)))
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
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
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!id.startsWith('temp-')) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
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

  // Apple-style small top icons
  const getCategoryDetails = (type: string) => {
    if (type.includes('booking')) return { icon: <Calendar size={12} color={COLORS.white} />, bg: COLORS.primary, label: 'BOOKING' };
    if (type.includes('maintenance')) return { icon: <Wrench size={12} color={COLORS.white} />, bg: COLORS.error, label: 'MAINTENANCE' };
    if (type.includes('tenancy') || type.includes('agreement')) return { icon: <FileText size={12} color={COLORS.white} />, bg: COLORS.accent, label: 'TENANCY' };
    if (type.includes('utility') || type.includes('topup')) return { icon: <Zap size={12} color={COLORS.white} />, bg: COLORS.warning, label: 'UTILITY' };
    if (type.includes('message')) return { icon: <MessageSquare size={12} color={COLORS.white} />, bg: COLORS.teal, label: 'MESSAGE' };
    if (type.includes('review')) return { icon: <Star size={12} color={COLORS.white} />, bg: COLORS.gold, label: 'REVIEW' };
    return { icon: <Bell size={12} color={COLORS.white} />, bg: COLORS.textTertiary, label: 'SYSTEM' };
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return dateStr.slice(5, 10).replace('-', '/'); // e.g., 08/24
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* iOS Style Floating Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Center</Text>
        <TouchableOpacity onPress={unreadCount > 0 ? markAllRead : clearAllRead} activeOpacity={0.7} style={styles.actionBtn}>
          <Text style={styles.actionText}>{unreadCount > 0 ? 'Clear All' : 'Clean Up'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Older Notifications</Text>
          </View>
        ) : (
          notifications.map((n) => {
            const cat = getCategoryDetails(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.iosCard, !n.read && styles.iosCardUnread]}
                onPress={() => markRead(n.id)}
                activeOpacity={0.8}
              >
                {/* Unread Indicator Dot */}
                {!n.read && <View style={styles.unreadDot} />}

                {/* Top Row: Icon, Category, Time */}
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.tinyIcon, { backgroundColor: cat.bg }]}>
                    {cat.icon}
                  </View>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.timeLabel}>{timeAgo(n.created_at)}</Text>
                </View>

                {/* Title & Message */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.cardMessage} numberOfLines={3}>{n.message}</Text>
                </View>

                {/* Delete Swipe Area (Simulated) */}
                {n.read && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteNotification(n.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    // Apple uses very light grey wall paper backgrounds for notifications
    backgroundColor: '#F2F2F7', 
  },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 60, 
    paddingHorizontal: SPACING.md, 
    paddingBottom: SPACING.md, 
    backgroundColor: 'rgba(242,242,247,0.9)', // Matches background, slightly translucent
    zIndex: 10,
  },
  backBtn: { 
    width: 40, height: 40, 
    justifyContent: 'center', 
  },
  headerTitle: { 
    fontFamily: SYSTEM_FONT,
    fontWeight: '700',
    fontSize: 28, 
    color: '#000',
    letterSpacing: 0.35,
    position: 'absolute',
    left: SPACING.md,
    top: Platform.OS === 'web' ? 60 : 100, // Large iOS style heading drops below
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: SYSTEM_FONT,
    fontWeight: '400',
    fontSize: 16,
    color: '#007AFF', // Authentic iOS Blue
  },

  content: { 
    paddingHorizontal: SPACING.md,
    paddingTop: 50, // Space for the dropped header title
    paddingBottom: 100,
  },

  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    fontFamily: SYSTEM_FONT,
    fontWeight: '400',
    fontSize: 16,
    color: '#8E8E93', // Authentic iOS secondary text
  },

  // --------------------------------------------------
  // APPLE iOS NOTIFICATION CARD STYLE
  // --------------------------------------------------
  iosCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // Glassy white
    borderRadius: 24, // Heavy Apple radius
    padding: 16,
    marginBottom: 8, // Tighter stacking
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
  },
  iosCardUnread: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Brighter if unread
    shadowOpacity: 0.1,
  },
  
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tinyIcon: {
    width: 20, height: 20,
    borderRadius: 5, // iOS icon squircle shape
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  categoryLabel: {
    fontFamily: SYSTEM_FONT,
    fontWeight: '400',
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: 0.2,
    flex: 1,
  },
  timeLabel: {
    fontFamily: SYSTEM_FONT,
    fontWeight: '400',
    fontSize: 12,
    color: '#8E8E93',
  },

  cardBody: {
    paddingLeft: 28, // Indent text to align with text above, clearing the icon
    paddingRight: 20,
  },
  cardTitle: {
    fontFamily: SYSTEM_FONT,
    fontWeight: '600', // San Francisco SemiBold
    fontSize: 15,
    color: '#000',
    letterSpacing: -0.24,
    marginBottom: 2,
  },
  cardMessage: {
    fontFamily: SYSTEM_FONT,
    fontWeight: '400', // San Francisco Regular
    fontSize: 14,
    color: '#3A3A3C', // Deep dark grey for readability
    lineHeight: 20,
    letterSpacing: -0.08,
  },

  unreadDot: {
    position: 'absolute',
    top: 20,
    left: -12, // Floats outside the card on the left
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF', // iOS Blue
  },

  deleteBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 4,
  },
});