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
  Wrench,
  ShoppingBag,
  Printer,
  FileText,
  CreditCard,
  ChevronRight,
  Home,
  Bell,
} from 'lucide-react-native';

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
];

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
  const bannerScrollRef = useRef<ScrollView>(null);

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
      if (user) {
        await ensureUserStats(user.id);
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setUserStats(stats as UserStats | null);
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
        <NotificationBell size={22} color={COLORS.textPrimary} />
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Text style={styles.avatarText}>{(member?.full_name || 'S')[0].toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {userStats && (
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{userStats.hostels_viewed}</Text>
            <Text style={styles.statLabel}>Viewed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{userStats.favourites_saved}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{userStats.bookings_made}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{userStats.services_used}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
        </View>
      )}

      <OnboardingProgress compact={true} />

      <View style={styles.quickActionsSection}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/tenancy' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#E0F2FE' }]}>
              <FileText size={22} color={COLORS.info} />
            </View>
            <Text style={styles.qaLabel}>Tenancy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/(tabs)/utilities' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
              <ShoppingBag size={22} color={COLORS.warning} />
            </View>
            <Text style={styles.qaLabel}>StuMark</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/(tabs)/laundry' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#EDE9FE' }]}>
              <ShoppingBag size={22} color='#7C3AED' />
            </View>
            <Text style={styles.qaLabel}>Laundry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/print' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#DCFCE7' }]}>
              <Printer size={22} color={COLORS.success} />
            </View>
            <Text style={styles.qaLabel}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/roommates' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
              <Users size={22} color={COLORS.error} />
            </View>
            <Text style={styles.qaLabel}>Roommates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/maintenance' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FFF7ED' }]}>
              <Wrench size={22} color='#EA580C' />
            </View>
            <Text style={styles.qaLabel}>Repairs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/(tabs)/messages' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#E0F2FE' }]}>
              <Home size={22} color={COLORS.accent} />
            </View>
            <Text style={styles.qaLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/(tabs)/bookings' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
              <CreditCard size={22} color={COLORS.warning} />
            </View>
            <Text style={styles.qaLabel}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qa} onPress={() => router.push('/notifications' as any)}>
            <View style={[styles.qaIcon, { backgroundColor: '#F0FDF4' }]}>
              <Bell size={22} color={COLORS.success} />
            </View>
            <Text style={styles.qaLabel}>Alerts</Text>
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
  statLabel: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textSecondary },
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
    paddingBottom: SPACING.md,
    paddingTop: SPACING.md, // Slightly increased from sm to md to give it breathing room at the top
    marginTop: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  qa: { width: (SW - SPACING.md * 2 - SPACING.sm * 2) / 3, alignItems: 'center', gap: 8 },
  qaIcon: {
    width: 60, height: 60, borderRadius: RADIUS.lg,
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
  seeAll: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },
});