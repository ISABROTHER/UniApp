import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, RADIUS } from '@/lib/constants';
import { Bell } from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Props {
  size?: number;
  color?: string;
}

export default function NotificationBell({ size = 22, color = COLORS.textPrimary }: Props) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(0);

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.45, duration: 160, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const fetchUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    const newCount = count || 0;
    if (newCount > prevCount.current) pulse();
    prevCount.current = newCount;
    setUnreadCount(newCount);
  }, []);

  useFocusEffect(useCallback(() => {
    fetchUnread();
  }, [fetchUnread]));

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (!userId) return;

    channelRef.current = supabase
      .channel(`bell_notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        setUnreadCount((prev) => {
          const next = prev + 1;
          pulse();
          prevCount.current = next;
          return next;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => router.push('/notifications' as any)}
      activeOpacity={0.7}
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 6, position: 'relative' },
  badge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.white,
  },
  badgeText: { fontFamily: FONT.bold, fontSize: 9, color: COLORS.white },
});