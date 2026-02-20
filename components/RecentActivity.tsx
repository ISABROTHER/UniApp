import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { UserActivityLog } from '@/lib/types';
import {
  Clock, Search, Heart, CalendarCheck, ShoppingBag,
  Printer, Zap, Wrench, MessageSquare, Home, ChevronRight,
} from 'lucide-react-native';
function getIcon(iconName: string | null, actionType: string) {
  const name = iconName || actionType;
  if (name.includes('search')) return <Search size={16} color={COLORS.accent} />;
  if (name.includes('favourite') || name.includes('wishlist')) return <Heart size={16} color={COLORS.primary} />;
  if (name.includes('booking')) return <CalendarCheck size={16} color={COLORS.success} />;
  if (name.includes('laundry')) return <ShoppingBag size={16} color="#7C3AED" />;
  if (name.includes('print')) return <Printer size={16} color={COLORS.success} />;
  if (name.includes('utility') || name.includes('topup')) return <Zap size={16} color={COLORS.warning} />;
  if (name.includes('maintenance')) return <Wrench size={16} color={COLORS.error} />;
  if (name.includes('message')) return <MessageSquare size={16} color={COLORS.teal} />;
  if (name.includes('hostel') || name.includes('view')) return <Home size={16} color={COLORS.navy} />;
  return <Clock size={16} color={COLORS.textSecondary} />;
}
function getIconBg(actionType: string) {
  if (actionType.includes('search')) return COLORS.infoLight;
  if (actionType.includes('favourite')) return COLORS.primaryFaded;
  if (actionType.includes('booking')) return COLORS.successLight;
  if (actionType.includes('laundry')) return '#EDE9FE';
  if (actionType.includes('print')) return COLORS.successLight;
  if (actionType.includes('utility')) return COLORS.warningLight;
  if (actionType.includes('maintenance')) return COLORS.errorLight;
  if (actionType.includes('message')) return 'rgba(12,192,176,0.12)';
  return COLORS.background;
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return dateStr.slice(0, 10);
}
export default function RecentActivity() {
  const router = useRouter();
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setActivities((data as UserActivityLog[]) || []);
      setLoading(false);
    })();
  }, []);
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }
  if (activities.length === 0) return null;
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Clock size={16} color={COLORS.textSecondary} />
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
      </View>
      {activities.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: getIconBg(item.action_type) }]}>
            {getIcon(item.icon_name, item.action_type)}
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
            )}
            <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingWrap: { padding: SPACING.md, alignItems: 'center' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 2 },
  rowSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  rowTime: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
});