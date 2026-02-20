import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Booking } from '@/lib/types';
import { CalendarCheck, MapPin, QrCode, ChevronRight, Clock } from 'lucide-react-native';

function StatusBadge({ status }: { status: string }) {
  const color = BOOKING_STATUS_COLORS[status] || COLORS.textSecondary;
  const label = status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

const TABS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('bookings')
        .select('*, hostels(name, address, campus_proximity, hostel_images(url))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setBookings((data || []) as Booking[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchBookings(); }, []));

  const filtered = bookings.filter((b) => {
    if (activeTab === 'All') return true;
    return b.status === activeTab.toLowerCase();
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

  const nightCount = (b: Booking) => {
    const diff = new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <View style={styles.container}>
      {/* 1. Unified Glassmorphic Header with Tabs */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>My Bookings</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsScroll} 
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((t) => (
            <TouchableOpacity 
              key={t} 
              style={[styles.tab, activeTab === t && styles.tabActive]} 
              onPress={() => setActiveTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchBookings(); }} 
            tintColor={COLORS.primary} 
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Premium Empty State */}
        {filtered.length === 0 && !loading && (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconBg}>
              <CalendarCheck size={36} color={COLORS.textTertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Browse hostels and book your ideal room for the upcoming semester.</Text>
            <TouchableOpacity 
              style={styles.browseBtn} 
              onPress={() => router.push('/(tabs)/index' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.browseBtnText}>Browse Hostels</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Premium Glassmorphic Booking Cards */}
        {filtered.map((booking) => {
          const hostel = booking.hostel as any;
          return (
            <View key={booking.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.hostelName} numberOfLines={1}>{hostel?.name || 'Hostel'}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={COLORS.textSecondary} />
                    <Text style={styles.locationText} numberOfLines={1}>{hostel?.campus_proximity || hostel?.address}</Text>
                  </View>
                </View>
                <StatusBadge status={booking.status} />
              </View>

              <View style={styles.datesRow}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>Check-in</Text>
                  <Text style={styles.dateValue}>{formatDate(booking.check_in_date)}</Text>
                </View>
                <View style={styles.dateDivider}>
                  <Clock size={14} color={COLORS.textTertiary} />
                  <Text style={styles.nightsText}>{nightCount(booking)} nights</Text>
                </View>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>Check-out</Text>
                  <Text style={styles.dateValue}>{formatDate(booking.check_out_date)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>GH₵{booking.total_price.toLocaleString()}</Text>
                </View>
                <View style={styles.footerActions}>
                  {booking.qr_code && (
                    <TouchableOpacity style={styles.qrBtn} activeOpacity={0.7}>
                      <QrCode size={16} color={COLORS.primary} />
                      <Text style={styles.qrBtnText}>QR Code</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.detailBtn} 
                    onPress={() => router.push(`/detail?id=${booking.hostel_id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailBtnText}>View</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F7F9' 
  },

  // Premium Unified Header with Tabs
  headerContainer: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  header: { 
    paddingHorizontal: SPACING.md, 
    paddingBottom: SPACING.sm 
  },
  pageTitle: { 
    fontFamily: FONT.headingBold, 
    fontSize: 28, 
    color: COLORS.textPrimary 
  },
  
  tabsScroll: { 
    maxHeight: 52,
    marginBottom: SPACING.sm,
  },
  tabsContainer: { 
    paddingHorizontal: SPACING.md, 
    gap: 8, 
    alignItems: 'center', 
  },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: RADIUS.full, 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    borderWidth: 1, 
    borderColor: 'transparent' 
  },
  tabActive: { 
    backgroundColor: COLORS.navy, 
    borderColor: COLORS.navy,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { 
    fontFamily: FONT.medium, 
    fontSize: 13, 
    color: COLORS.textSecondary 
  },
  tabTextActive: { 
    color: COLORS.white,
    fontFamily: FONT.semiBold,
  },

  scrollContent: { 
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Glassmorphic Booking Cards
  card: { 
    backgroundColor: 'rgba(255,255,255,0.92)', 
    borderRadius: RADIUS.xl, 
    padding: SPACING.lg, 
    marginBottom: SPACING.md, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 12, 
    elevation: 3 
  },
  cardHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md 
  },
  cardHeaderLeft: { 
    flex: 1, marginRight: SPACING.sm 
  },
  hostelName: { 
    fontFamily: FONT.semiBold, fontSize: 17, color: COLORS.textPrimary, marginBottom: 4 
  },
  locationRow: { 
    flexDirection: 'row', alignItems: 'center', gap: 4 
  },
  locationText: { 
    fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1 
  },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full 
  },
  statusDot: { 
    width: 6, height: 6, borderRadius: 3 
  },
  statusText: { 
    fontFamily: FONT.semiBold, fontSize: 11 
  },

  // Refined Inset Dates Row
  datesRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.02)', // Super subtle inset effect
    borderRadius: RADIUS.lg, 
    padding: SPACING.md, 
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dateBlock: { 
    flex: 1, alignItems: 'center' 
  },
  dateLabel: { 
    fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginBottom: 4 
  },
  dateValue: { 
    fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary 
  },
  dateDivider: { 
    alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm 
  },
  nightsText: { 
    fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary 
  },

  cardFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  totalLabel: { 
    fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 
  },
  totalAmount: { 
    fontFamily: FONT.bold, fontSize: 18, color: COLORS.primary 
  },
  footerActions: { 
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' 
  },
  qrBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(220,20,60,0.06)' 
  },
  qrBtnText: { 
    fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary 
  },
  detailBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 
  },
  detailBtnText: { 
    fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary 
  },

  // Premium Empty State
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
  emptyText: { 
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl 
  },
  browseBtn: { 
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.full,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  browseBtnText: { 
    fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white 
  },
});