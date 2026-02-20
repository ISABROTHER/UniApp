import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Hostel, Booking, MaintenanceRequest } from '@/lib/types';
import {
  ArrowLeft, Building2, BarChart3, CalendarCheck, Wrench, TrendingUp,
  Users, Star, CheckCircle, Clock, AlertTriangle, ChevronRight,
} from 'lucide-react-native';

type TabType = 'analytics' | 'hostels' | 'bookings' | 'maintenance';

interface Analytics {
  totalHostels: number;
  totalBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  avgRating: number;
  occupancyRate: number;
  openIssues: number;
}

export default function OwnerScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('analytics');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [issues, setIssues] = useState<MaintenanceRequest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalHostels: 0, totalBookings: 0, pendingBookings: 0,
    totalRevenue: 0, avgRating: 0, occupancyRate: 0, openIssues: 0,
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: hs }, { data: bs }, { data: ms }] = await Promise.all([
      supabase.from('hostels').select('*, hostel_images(url, order_index)').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, hostels(name, campus_proximity)').in('hostel_id',
        (await supabase.from('hostels').select('id').eq('owner_id', user.id)).data?.map((h: any) => h.id) || []
      ).order('created_at', { ascending: false }),
      supabase.from('maintenance_requests').select('*, hostels(name)').in('hostel_id',
        (await supabase.from('hostels').select('id').eq('owner_id', user.id)).data?.map((h: any) => h.id) || []
      ).order('created_at', { ascending: false }),
    ]);

    const hostelList = (hs as Hostel[]) || [];
    const bookingList = (bs as Booking[]) || [];
    const issueList = (ms as MaintenanceRequest[]) || [];

    setHostels(hostelList);
    setBookings(bookingList);
    setIssues(issueList);

    const totalRevenue = bookingList.filter(b => b.status === 'completed').reduce((s, b) => s + b.total_price, 0);
    const avgRating = hostelList.length > 0 ? hostelList.reduce((s, h) => s + h.rating, 0) / hostelList.length : 0;
    const totalRooms = hostelList.reduce((s, h) => s + h.total_rooms, 0);
    const availRooms = hostelList.reduce((s, h) => s + h.available_rooms, 0);
    const occupancy = totalRooms > 0 ? ((totalRooms - availRooms) / totalRooms) * 100 : 0;

    setAnalytics({
      totalHostels: hostelList.length,
      totalBookings: bookingList.length,
      pendingBookings: bookingList.filter(b => b.status === 'pending').length,
      totalRevenue,
      avgRating: parseFloat(avgRating.toFixed(1)),
      occupancyRate: parseFloat(occupancy.toFixed(0)),
      openIssues: issueList.filter(m => m.status === 'open').length,
    });
    setLoading(false);
  };

  const handleApproveBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
    fetchData();
  };

  const handleRejectBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    fetchData();
  };

  const tabs: [TabType, string, React.ReactNode][] = [
    ['analytics', 'Analytics', <BarChart3 size={16} color={tab === 'analytics' ? COLORS.primary : COLORS.textSecondary} />],
    ['hostels', 'Hostels', <Building2 size={16} color={tab === 'hostels' ? COLORS.primary : COLORS.textSecondary} />],
    ['bookings', 'Bookings', <CalendarCheck size={16} color={tab === 'bookings' ? COLORS.primary : COLORS.textSecondary} />],
    ['maintenance', 'Issues', <Wrench size={16} color={tab === 'maintenance' ? COLORS.primary : COLORS.textSecondary} />],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Dashboard</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {tabs.map(([t, label, icon]) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            {icon}
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : tab === 'analytics' ? (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
                <Building2 size={20} color={COLORS.primary} />
                <Text style={styles.statNum}>{analytics.totalHostels}</Text>
                <Text style={styles.statLabel}>My Hostels</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
                <TrendingUp size={20} color={COLORS.success} />
                <Text style={styles.statNum}>GH₵{analytics.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
                <Clock size={20} color={COLORS.warning} />
                <Text style={styles.statNum}>{analytics.pendingBookings}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.gold }]}>
                <Star size={20} color={COLORS.gold} />
                <Text style={styles.statNum}>{analytics.avgRating}</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.teal }]}>
                <Users size={20} color={COLORS.teal} />
                <Text style={styles.statNum}>{analytics.occupancyRate}%</Text>
                <Text style={styles.statLabel}>Occupancy</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.error }]}>
                <AlertTriangle size={20} color={COLORS.error} />
                <Text style={styles.statNum}>{analytics.openIssues}</Text>
                <Text style={styles.statLabel}>Open Issues</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {bookings.slice(0, 3).map((b) => (
              <View key={b.id} style={styles.miniCard}>
                <View>
                  <Text style={styles.miniCardTitle}>{(b as any).hostels?.name || 'Hostel'}</Text>
                  <Text style={styles.miniCardSub}>{b.check_in_date} → {b.check_out_date}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${BOOKING_STATUS_COLORS[b.status]}20` }]}>
                  <Text style={[styles.statusPillText, { color: BOOKING_STATUS_COLORS[b.status] }]}>{b.status}</Text>
                </View>
              </View>
            ))}
            {bookings.length > 3 && (
              <TouchableOpacity onPress={() => setTab('bookings')} style={styles.viewAllBtn}>
                <Text style={styles.viewAllText}>View all {bookings.length} bookings</Text>
                <ChevronRight size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </>
        ) : tab === 'hostels' ? (
          hostels.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Hostels Yet</Text>
              <Text style={styles.emptySubtitle}>Your listed hostels will appear here. Contact support to list your first hostel.</Text>
            </View>
          ) : (
            hostels.map((h) => (
              <View key={h.id} style={styles.hostelCard}>
                <View style={styles.hostelCardTop}>
                  <View style={styles.hostelInfo}>
                    <Text style={styles.hostelName}>{h.name}</Text>
                    <Text style={styles.hostelAddr}>{h.campus_proximity}</Text>
                    <View style={styles.hostelTags}>
                      <View style={[styles.statusPill, { backgroundColor: h.verified ? COLORS.successLight : COLORS.warningLight }]}>
                        <Text style={[styles.statusPillText, { color: h.verified ? COLORS.success : COLORS.warning }]}>
                          {h.verified ? 'Verified' : 'Unverified'}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: h.status === 'active' ? COLORS.successLight : COLORS.errorLight }]}>
                        <Text style={[styles.statusPillText, { color: h.status === 'active' ? COLORS.success : COLORS.error }]}>{h.status}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.hostelMetrics}>
                    <Text style={styles.hostelPrice}>GH₵{h.price_range_min.toLocaleString()}</Text>
                    <Text style={styles.hostelPriceSub}>from/month</Text>
                    <View style={styles.ratingRow}>
                      <Star size={12} color={COLORS.gold} fill={COLORS.gold} />
                      <Text style={styles.ratingText}>{h.rating}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.hostelStats}>
                  <Text style={styles.hostelStatItem}>{h.total_rooms} rooms</Text>
                  <Text style={styles.hostelStatDot}>·</Text>
                  <Text style={styles.hostelStatItem}>{h.available_rooms} available</Text>
                  <Text style={styles.hostelStatDot}>·</Text>
                  <Text style={styles.hostelStatItem}>{h.review_count} reviews</Text>
                </View>
              </View>
            ))
          )
        ) : tab === 'bookings' ? (
          bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarCheck size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Bookings</Text>
              <Text style={styles.emptySubtitle}>Bookings for your hostels will appear here.</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <View key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingHostel}>{(b as any).hostels?.name || 'Hostel'}</Text>
                    <Text style={styles.bookingDates}>{b.check_in_date} → {b.check_out_date} · {b.nights} nights</Text>
                  </View>
                  <View style={styles.bookingPrice}>
                    <Text style={styles.bookingPriceText}>GH₵{b.total_price.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.bookingActions}>
                  <View style={[styles.statusPill, { backgroundColor: `${BOOKING_STATUS_COLORS[b.status]}20` }]}>
                    <Text style={[styles.statusPillText, { color: BOOKING_STATUS_COLORS[b.status] }]}>{b.status}</Text>
                  </View>
                  {b.status === 'pending' && (
                    <View style={styles.actionBtns}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectBooking(b.id)}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveBooking(b.id)}>
                        <CheckCircle size={14} color={COLORS.white} />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )
        ) : (
          issues.length === 0 ? (
            <View style={styles.emptyState}>
              <Wrench size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Issues</Text>
              <Text style={styles.emptySubtitle}>Maintenance requests from tenants will appear here.</Text>
            </View>
          ) : (
            issues.map((m) => (
              <View key={m.id} style={styles.issueCard}>
                <View style={styles.issueTop}>
                  <View style={[styles.issuePriorityDotBase, { backgroundColor: m.priority === 'urgent' ? '#7C3AED' : m.priority === 'high' ? COLORS.error : m.priority === 'medium' ? COLORS.warning : COLORS.info }]} />
                  <View style={styles.issueInfo}>
                    <Text style={styles.issueTitle}>{m.title}</Text>
                    <Text style={styles.issueHostel}>{(m as any).hostels?.name || 'Hostel'} · {m.created_at.slice(0, 10)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: m.status === 'open' ? COLORS.warningLight : m.status === 'resolved' ? COLORS.successLight : COLORS.infoLight }]}>
                    <Text style={[styles.statusPillText, { color: m.status === 'open' ? COLORS.warning : m.status === 'resolved' ? COLORS.success : COLORS.info }]}>{m.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.issueDesc} numberOfLines={2}>{m.description}</Text>
                {m.status === 'open' && (
                  <TouchableOpacity style={styles.acknowledgeBtn} onPress={async () => {
                    await supabase.from('maintenance_requests').update({ status: 'in_progress' }).eq('id', m.id);
                    fetchData();
                  }}>
                    <Text style={styles.acknowledgeBtnText}>Mark In Progress</Text>
                  </TouchableOpacity>
                )}
                {m.status === 'in_progress' && (
                  <TouchableOpacity style={[styles.acknowledgeBtn, { backgroundColor: COLORS.successLight }]} onPress={async () => {
                    await supabase.from('maintenance_requests').update({ status: 'resolved' }).eq('id', m.id);
                    fetchData();
                  }}>
                    <Text style={[styles.acknowledgeBtnText, { color: COLORS.success }]}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },

  tabScroll: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabRow: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: COLORS.background },
  tabBtnActive: { backgroundColor: COLORS.primaryFaded },
  tabLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  content: { padding: SPACING.md },
  loadingText: { textAlign: 'center', marginTop: 60, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { width: '47%', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, gap: 6, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  statNum: { fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.textPrimary },
  statLabel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },

  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  miniCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  miniCardTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  miniCardSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, gap: 4 },
  viewAllText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.primary },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },
  statusPillText: { fontFamily: FONT.semiBold, fontSize: 11, textTransform: 'capitalize' },

  hostelCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  hostelCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  hostelInfo: { flex: 1 },
  hostelName: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 2 },
  hostelAddr: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  hostelTags: { flexDirection: 'row', gap: 6 },
  hostelMetrics: { alignItems: 'flex-end' },
  hostelPrice: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.primary },
  hostelPriceSub: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textTertiary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  ratingText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textPrimary },
  hostelStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostelStatItem: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  hostelStatDot: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },

  bookingCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  bookingInfo: { flex: 1 },
  bookingHostel: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  bookingDates: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  bookingPrice: { alignItems: 'flex-end' },
  bookingPriceText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.primary },
  bookingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBtns: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.error },
  rejectBtnText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.sm, backgroundColor: COLORS.success },
  approveBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  issueCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  issueTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  issuePriorityDotBase: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  issueInfo: { flex: 1 },
  issueTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  issueHostel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  issueDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  acknowledgeBtn: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  acknowledgeBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.warning },
});
