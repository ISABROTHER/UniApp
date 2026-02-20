import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, RADIUS } from '@/lib/constants';
import { Bell } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function NotificationBell({ size = 22, color = COLORS.textPrimary }: Props) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, []);

  useFocusEffect(useCallback(() => {
    fetchUnread();
  }, [fetchUnread]));

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => router.push('/notifications' as any)}
      activeOpacity={0.7}
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
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
