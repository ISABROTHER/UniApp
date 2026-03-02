import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { UserStats } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import RecentActivity from '@/components/RecentActivity';
import { useActivityLogger, ensureUserStats } from '@/hooks/useRetention';
import {
  Users,
  ShoppingBag,
  Printer,
  ChevronRight,
  Shield,
  Wallet,
  Bot,
  ShieldAlert,
  UtensilsCrossed,
  GraduationCap,
  Megaphone,
  Search as SearchIcon,
  Vote,
} from 'lucide-react-native';
import LeaseRenewalCard from '@/components/LeaseRenewalCard';
import SOSButton from '@/components/SOSButton';

const { width: SW } = Dimensions.get('window');
const BANNER_WIDTH = SW - SPACING.md * 2;

const SERVICE_BANNERS = [
  {
    id: 'laundry',
    title: 'Smart Wash',
    subtitle: 'On-demand laundry pickup & delivery',
    cta: 'Book Now',
    route: '/(tabs)/laundry',
    bg: ['#1A2332', '#2A3544'],
    accent: '#4A90E2',
    icon: ShoppingBag,
  },
  {
    id: 'print',
    title: 'Safe Print',
    subtitle: 'Upload. Print. Pickup or Deliver.',
    cta: 'Print Now',
    route: '/print',
    bg: ['#DC143C', '#B00F2F'],
    accent: '#FFB3C1',
    icon: Printer,
  },
  {
    id: 'roommates',
    title: 'Find Flatmates',
    subtitle: 'Match with students who fit your lifestyle',
    cta: 'Browse',
    route: '/roommates',
    bg: ['#16A34A', '#14532D'],
    accent: '#BBF7D0',
    icon: Users,
  },
  {
    id: 'wallet',
    title: 'Campus Wallet',
    subtitle: 'One wallet for rent, food, laundry & more',
    cta: 'Open Wallet',
    route: '/wallet',
    bg: ['#0284C7', '#075985'],
    accent: '#7DD3FC',
    icon: Wallet,
  },
  {
    id: 'food',
    title: 'Campus Eats',
    subtitle: 'Order from your favourite campus vendors',
    cta: 'Order Now',
    route: '/food',
    bg: ['#F59E0B', '#B45309'],
    accent: '#FDE68A',
    icon: UtensilsCrossed,
  },
  {
    id: 'ai',
    title: 'AI Assistant',
    subtitle: 'Ask anything about hostels & campus life',
    cta: 'Chat Now',
    route: '/ai-assistant',
    bg: ['#7C3AED', '#5B21B6'],
    accent: '#C4B5FD',
    icon: Bot,
  },
];

interface LiveStats {
  availableBeds: number;
  unreadMessages: number;
  unreadAlerts: number;
}

function AnimatedStatNum({ value }: { value: number }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();
    const listener = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeListener(listener);
  }, [value]);

  return <Text style={styles.statNum}>{display}</Text>;
}

function ServiceBannerCard({ banner, onPress }: { banner: typeof SERVICE_BANNERS[number]; onPress: () => void }) {
  const Icon = banner.icon;
  return (
    <TouchableOpacity style={[styles.banner, { backgroundColor: banner.bg[0] }]} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.bannerContent}>
        <View style={[styles.bannerIconWrap, { backgroundColor: `${banner.accent}30` }]}>
          <Icon size={26} color={banner.accent} />
        </View>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
        <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
        <View style={[styles.bannerCta, { backgroundColor: banner.accent }]}>
          <Text style={[styles.bannerCtaText, { color: banner.bg[0] }]}>{banner.cta}</Text>
          <ChevronRight size={14} color={banner.bg[0]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { member } = useAuth();
  useActivityLogger();
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    availableBeds: 0,
    unreadMessages: 0,
    unreadAlerts: 0,
  });
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBooking, setActiveBooking] = useState<{
    hostelId: string;
    hostelName: string;
    checkOutDate: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (bannerIndex + 1) % SERVICE_BANNERS.length;
      setBannerIndex(next);
      bannerScrollRef.current?.scrollTo({ x: next * (BANNER_WIDTH + SPACING.sm), animated: true });
    }, 4000);
    return () => clearInterval(interval);
  }, [bannerIndex]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const sixtyDaysOut = new Date();
      sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);

      const [bedsResult, statsResult, bookingResult, msgResult, alertResult] = await Promise.all([
        supabase
          .from('hostels')
          .select('available_rooms')
          .eq('status', 'active'),
        user
          ? ensureUserStats(user.id).then(() =>
              supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle()
            )
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from('bookings')
              .select('check_out_date, hostel_id, hostels(name)')
              .eq('user_id', user.id)
              .in('status', ['confirmed', 'checked_in'])
              .lte('check_out_date', sixtyDaysOut.toISOString().slice(0, 10))
              .order('check_out_date', { ascending: true })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from('conversations')
              .select('unread_count_a, unread_count_b, participant_a, participant_b')
              .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from('notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('read', false)
          : Promise.resolve({ data: null, count: 0 }),
      ]);

      if (user && bookingResult.data) {
        const h = (bookingResult.data as any).hostels;
        setActiveBooking({
          hostelId: bookingResult.data.hostel_id,
          hostelName: h?.name ?? 'Your Hostel',
          checkOutDate: bookingResult.data.checkOutDate,
        });
      } else {
        setActiveBooking(null);
      }

      const totalBeds = (bedsResult.data || []).reduce(
        (sum: number, h: { available_rooms: number }) => sum + (h.available_rooms || 0),
        0
      );

      let unreadMsgs = 0;
      if (user && msgResult.data) {
        (msgResult.data as any[]).forEach((c) => {
          if (c.participant_a === user.id) unreadMsgs += c.unread_count_a || 0;
          else unreadMsgs += c.unread_count_b || 0;
        });
      }

      setLiveStats({
        availableBeds: totalBeds,
        unreadMessages: unreadMsgs,
        unreadAlerts: (alertResult as any).count || 0,
      });

      if (statsResult.data) setUserStats(statsResult.data as UserStats);
    } catch (err) {
      console.error('Home fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const firstName = member?.full_name?.split(' ')[0] || 'Student';

  return (
    <>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.headerTitle}>{firstName} 👋</Text>
        </View>
        <NotificationBell />
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Text style={styles.avatarText}>{firstName[0]}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <AnimatedStatNum value={liveStats.availableBeds} />
          <Text style={styles.statLabel}>Beds Free</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AnimatedStatNum value={liveStats.unreadMessages} />
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AnimatedStatNum value={liveStats.unreadAlerts} />
          <Text style={[styles.statLabel, liveStats.unreadAlerts > 0 && styles.statLabelAlert]}>Alerts</Text>
        </View>
      </View>

      <LeaseRenewalCard
        hostelId={activeBooking?.hostelId}
        hostelName={activeBooking?.hostelName}
        checkOutDate={activeBooking?.checkOutDate}
      />

      <View style={styles.quickActionsSection}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/hall' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
              <Shield size={28} color={COLORS.warning} />
            </View>
            <Text style={styles.qaLabel}>My Hall</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/bulletin' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#E0F2FE' }]}>
              <Megaphone size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.qaLabel}>Bulletin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderB]} onPress={() => router.push('/safety' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
              <ShieldAlert size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.qaLabel}>Safety</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR]} onPress={() => router.push('/lost-found' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#F3E8FF' }]}>
              <SearchIcon size={28} color='#9333EA' />
            </View>
            <Text style={styles.qaLabel}>Lost & Found</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR]} onPress={() => router.push('/organizations' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DBEAFE' }]}>
              <Users size={28} color={COLORS.info} />
            </View>
            <Text style={styles.qaLabel}>Orgs Hub</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR]} onPress={() => router.push('/alumni' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DCFCE7' }]}>
              <GraduationCap size={28} color={COLORS.success} />
            </View>
            <Text style={styles.qaLabel}>Alumni</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.qa} onPress={() => router.push('/elections' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
              <Vote size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.qaLabel}>Elections</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bannersSection}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Campus Services</Text>
          <View style={styles.bannerDots}>
            {SERVICE_BANNERS.map((_, i) => (
              <View key={i} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
            ))}
          </View>
        </View>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bannersScroll}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + SPACING.sm));
            setBannerIndex(Math.min(idx, SERVICE_BANNERS.length - 1));
          }}
          snapToInterval={BANNER_WIDTH + SPACING.sm}
          decelerationRate="fast"
        >
          {SERVICE_BANNERS.map((b) => (
            <ServiceBannerCard
              key={b.id}
              banner={b}
              onPress={() => router.push(b.route as any)}
            />
          ))}
        </ScrollView>
      </View>

      <RecentActivity />

      <View style={{ height: 32 }} />
    </ScrollView>
    <SOSButton />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  headerLeft: { flex: 1 },
  greetingText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.textPrimary },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 2 },
  statLabel: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.textPrimary },
  statLabelAlert: { color: COLORS.primary },
  statDivider: { width: 1, backgroundColor: COLORS.borderLight, marginVertical: 2 },

  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },

  quickActionsSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    marginTop: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qa: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: 4,
  },
  borderR: {
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
  },
  borderB: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  qaIcon: {
    width: 60, height: 60, borderRadius: RADIUS.xl,
    justifyContent: 'center', alignItems: 'center',
  },
  qaLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  bannersSection: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    marginTop: 1,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  bannerDots: { flexDirection: 'row', gap: 5 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  bannerDotActive: { width: 18, backgroundColor: COLORS.primary },
  bannersScroll: {
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  banner: {
    width: BANNER_WIDTH,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  bannerContent: {},
  bannerIconWrap: {
    width: 52, height: 52, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bannerTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.white, marginBottom: 4 },
  bannerSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: SPACING.md },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  bannerCtaText: { fontFamily: FONT.semiBold, fontSize: 13 },

  sectionTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },
});