import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { UserActivityLog } from '@/lib/types';
import {
  Clock, Search, Heart, CalendarCheck, ShoppingBag,
  Printer, Zap, Wrench, MessageSquare, Home, ChevronRight, X
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

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [allActivities, setAllActivities] = useState<UserActivityLog[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1); // Only show 1 on the homepage
      setActivities((data as UserActivityLog[]) || []);
      setLoading(false);
    })();
  }, []);

  const openFullHistory = async () => {
    setModalVisible(true);
    setLoadingAll(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Fetch full history for the modal
      setAllActivities((data as UserActivityLog[]) || []);
    }
    setLoadingAll(false);
  };

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
        <TouchableOpacity 
          style={styles.seeAllBtn}
          onPress={openFullHistory}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <ChevronRight size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Homepage Preview */}
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

      {/* Sleek Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Drag Indicator */}
            <View style={styles.dragHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity History</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingAll ? (
              <View style={styles.loadingWrapModal}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={allActivities}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.row}>
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
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No recent activity found.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
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
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.primary,
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

  // New Sleek Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)', // Smooth dimming effect
    justifyContent: 'flex-end', // Pushes the sheet to the bottom
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    height: '85%', // Tall enough to see history, short enough to feel like an overlay
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
  },
  modalList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  loadingWrapModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  }
});