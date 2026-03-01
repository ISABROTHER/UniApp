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
import OnboardingProgress from '@/components/OnboardingProgress';
import { useActivityLogger, ensureUserStats } from '@/hooks/useRetention';
import {
  Users,
  ShoppingBag,
  Printer,
  ChevronRight,
  Home,
  Shield,
  Heart,
  Calendar,
  Wallet,
  Bot,
  ShieldAlert,
  UtensilsCrossed,
  BookOpen,
  Bus,
  GraduationCap,
  Megaphone,
  CreditCard,
  Search as SearchIcon,
  Vote,
  CalendarDays,
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
        (sum: number, h: { available_rooms: number }) => sum + (h.available_rooms || 0), 0
      );

      if (user) {
        const unreadMessages = (msgResult.data || []).reduce((sum: number, c: {
          participant_a: string;
          participant_b: string;
          unread_count_a: number;
          unread_count_b: number;
        }) => {
          const isA = c.participant_a === user.id;
          return sum + (isA ? (c.unread_count_a || 0) : (c.unread_count_b || 0));
        }, 0);

        setLiveStats({
          availableBeds: totalBeds,
          unreadMessages,
          unreadAlerts: (alertResult as any).count || 0,
        });

        const { data: stats } = statsResult as { data: UserStats | null };
        setUserStats(stats as UserStats | null);
      } else {
        setLiveStats(prev => ({ ...prev, availableBeds: totalBeds }));
      }
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.headerTitle}>{member?.full_name?.split(' ')[0] || 'Student'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/favourites' as any)}
          activeOpacity={0.7}
        >
          <Heart size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <NotificationBell size={22} color={COLORS.textPrimary} />
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Text style={styles.avatarText}>{(member?.full_name || 'S')[0].toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsStrip}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push('/(tabs)/search' as any)}
          activeOpacity={0.7}
        >
          <AnimatedStatNum value={liveStats.availableBeds} />
          <Text style={styles.statLabel}>Beds</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push('/(tabs)/messages' as any)}
          activeOpacity={0.7}
        >
          <AnimatedStatNum value={liveStats.unreadMessages} />
          <Text style={styles.statLabel}>Messages</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push('/(tabs)/bookings' as any)}
          activeOpacity={0.7}
        >
          <AnimatedStatNum value={userStats?.bookings_made || 0} />
          <Text style={styles.statLabel}>Bookings</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.7}
        >
          <AnimatedStatNum value={liveStats.unreadAlerts} />
          <Text style={[styles.statLabel, liveStats.unreadAlerts > 0 && styles.statLabelAlert]}>Alerts</Text>
        </TouchableOpacity>
      </View>

      <OnboardingProgress compact={true} />

      {activeBooking && (
        <LeaseRenewalCard
          hostelId={activeBooking.hostelId}
          hostelName={activeBooking.hostelName}
          checkOutDate={activeBooking.checkOutDate}
        />
      )}

      <View style={styles.quickActionsSection}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/planner' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DBEAFE' }]}>
              <CalendarDays size={28} color={COLORS.info} />
            </View>
            <Text style={styles.qaLabel}>Planner</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/wallet' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#E0F2FE' }]}>
              <Wallet size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.qaLabel}>Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderB]} onPress={() => router.push('/food' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
              <UtensilsCrossed size={28} color={COLORS.warning} />
            </View>
            <Text style={styles.qaLabel}>Food</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/(tabs)/laundry' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#EDE9FE' }]}>
              <ShoppingBag size={28} color='#7C3AED' />
            </View>
            <Text style={styles.qaLabel}>Smart Wash</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/print' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DCFCE7' }]}>
              <Printer size={28} color={COLORS.success} />
            </View>
            <Text style={styles.qaLabel}>DigiPrint</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderB]} onPress={() => router.push('/hall' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DBEAFE' }]}>
              <Shield size={28} color={COLORS.info} />
            </View>
            <Text style={styles.qaLabel}>My Hall</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/events' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
              <Calendar size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.qaLabel}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/safety' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
              <ShieldAlert size={28} color={COLORS.error} />
            </View>
            <Text style={styles.qaLabel}>Safety</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderB]} onPress={() => router.push('/ai-assistant' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#F3E8FF' }]}>
              <Bot size={28} color='#7C3AED' />
            </View>
            <Text style={styles.qaLabel}>AI Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/roommates' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
              <Users size={28} color={COLORS.error} />
            </View>
            <Text style={styles.qaLabel}>Roommates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR, styles.borderB]} onPress={() => router.push('/(tabs)/stumark' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
              <ShoppingBag size={28} color={COLORS.warning} />
            </View>
            <Text style={styles.qaLabel}>StuMark</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderB]} onPress={() => router.push('/study-rooms' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#E0F2FE' }]}>
              <BookOpen size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.qaLabel}>Study Rooms</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR]} onPress={() => router.push('/shuttle' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DCFCE7' }]}>
              <Bus size={28} color={COLORS.success} />
            </View>
            <Text style={styles.qaLabel}>Shuttle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qa, styles.borderR]} onPress={() => router.push('/bulletin' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
              <Megaphone size={28} color='#D97706' />
            </View>
            <Text style={styles.qaLabel}>Bulletin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.qa} onPress={() => router.push('/lost-found' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#F3E8FF' }]}>
              <SearchIcon size={28} color='#9333EA' />
            </View>
            <Text style={styles.qaLabel}>Lost & Found</Text>
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

      <View style={styles.moreSection}>
        <Text style={styles.sectionTitle}>More Services</Text>
        <View style={styles.moreGrid}>
          <TouchableOpacity style={styles.moreItem} onPress={() => router.push('/(tabs)/bookings' as any)}>
            <Home size={20} color={COLORS.accent} />
            <Text style={styles.moreItemText}>My Housing</Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreItem} onPress={() => router.push('/student-id' as any)}>
            <CreditCard size={20} color={COLORS.navy} />
            <Text style={styles.moreItemText}>Student ID</Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreItem} onPress={() => router.push('/elections' as any)}>
            <Vote size={20} color={COLORS.primary} />
            <Text style={styles.moreItemText}>Hall Elections</Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreItem} onPress={() => router.push('/alumni' as any)}>
            <GraduationCap size={20} color={COLORS.success} />
            <Text style={styles.moreItemText}>Alumni Mentors</Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreItem} onPress={() => router.push('/calendar' as any)}>
            <Calendar size={20} color='#9333EA' />
            <Text style={styles.moreItemText}>Academic Calendar</Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreItem} onPress={() => router.push('/transactions' as any)}>
            <Wallet size={20} color={COLORS.accent} />
            <Text style={styles.moreItemText}>Transactions</Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

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

  moreSection: {
    backgroundColor: COLORS.white,
    marginTop: 1,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  moreGrid: { gap: 2 },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  moreItemText: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});