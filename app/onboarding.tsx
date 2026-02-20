import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Home, ShoppingBag, Printer, Shield, Zap, Users } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: Home,
    bg: COLORS.navy,
    iconBg: 'rgba(74,144,226,0.2)',
    iconColor: '#4A90E2',
    accentColor: '#4A90E2',
    badge: 'Housing',
    title: 'Your Home\nAway from Home',
    description:
      'Discover verified student accommodations near UCC. Filter by price, room type, and amenities. Book digitally with e-contracts and QR check-ins.',
    highlights: ['Verified Listings', 'Digital Contracts', 'Utility Top-ups'],
  },
  {
    icon: ShoppingBag,
    bg: '#1A2332',
    iconBg: 'rgba(124,58,237,0.2)',
    iconColor: '#A78BFA',
    accentColor: '#A78BFA',
    badge: 'Smart Wash',
    title: 'Laundry,\nOn Your Terms',
    description:
      'Schedule laundry pickup right from your room. Track every step in real-time, from washing to doorstep delivery. Never visit a laundromat again.',
    highlights: ['Pickup & Delivery', 'Real-time Tracking', 'Monthly Passes'],
  },
  {
    icon: Printer,
    bg: '#7C1F2E',
    iconBg: 'rgba(220,20,60,0.25)',
    iconColor: '#FFB3C1',
    accentColor: '#FFB3C1',
    badge: 'Safe Print',
    title: 'Print Smarter,\nNot Harder',
    description:
      'Upload your documents from anywhere. Choose a campus print shop, select your settings, and get it delivered or pick it up with a 6-digit code.',
    highlights: ['Cloud Upload', 'Multiple Shops', 'Delivery Option'],
  },
  {
    icon: Users,
    bg: '#14532D',
    iconBg: 'rgba(22,163,74,0.25)',
    iconColor: '#BBF7D0',
    accentColor: '#BBF7D0',
    badge: 'Community',
    title: 'Find Your\nPeople',
    description:
      'Match with compatible flatmates before you move in. Chat with property owners, track maintenance requests, and build your campus community.',
    highlights: ['Flatmate Matching', 'Owner Chat', 'Maintenance Tracking'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.replace('/auth/sign-in');
    }
  };

  const handleSkip = () => router.replace('/auth/sign-in');

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: slide.bg }]}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((s, index) => {
          const SlideIcon = s.icon;
          return (
            <View key={index} style={[styles.slide, { backgroundColor: s.bg }]}>
              <View style={styles.slideInner}>
                <View style={styles.topArea}>
                  <View style={[styles.badgePill, { backgroundColor: `${s.accentColor}25`, borderColor: `${s.accentColor}50` }]}>
                    <Text style={[styles.badgeText, { color: s.accentColor }]}>{s.badge}</Text>
                  </View>
                  <View style={[styles.iconContainer, { backgroundColor: s.iconBg }]}>
                    <SlideIcon size={52} color={s.iconColor} strokeWidth={1.5} />
                  </View>
                </View>

                <Text style={styles.slideTitle}>{s.title}</Text>
                <Text style={styles.slideDescription}>{s.description}</Text>

                <View style={styles.highlightsList}>
                  {s.highlights.map((hl) => (
                    <View key={hl} style={[styles.highlightItem, { backgroundColor: `${s.accentColor}20`, borderColor: `${s.accentColor}40` }]}>
                      <View style={[styles.highlightDot, { backgroundColor: s.accentColor }]} />
                      <Text style={[styles.highlightText, { color: s.accentColor }]}>{hl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                setCurrentIndex(index);
              }}
            >
              <View
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                  index === currentIndex && { backgroundColor: slide.accentColor },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: slide.accentColor }]}
          >
            <Text style={[styles.nextText, { color: slide.bg }]}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLastSlide && (
          <TouchableOpacity style={styles.guestBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.guestBtnText}>Browse without account</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },

  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  slideInner: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingBottom: SPACING.xl,
  },
  topArea: { alignItems: 'flex-start', marginBottom: SPACING.xl },
  badgePill: {
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 5, marginBottom: SPACING.lg,
  },
  badgeText: { fontFamily: FONT.semiBold, fontSize: 12, letterSpacing: 0.5 },
  iconContainer: {
    width: 96, height: 96, borderRadius: RADIUS.xl,
    justifyContent: 'center', alignItems: 'center',
  },

  slideTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 34,
    color: COLORS.white,
    lineHeight: 42,
    marginBottom: SPACING.md,
  },
  slideDescription: {
    fontFamily: FONT.regular,
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 26,
    marginBottom: SPACING.xl,
  },
  highlightsList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  highlightItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  highlightDot: { width: 6, height: 6, borderRadius: 3 },
  highlightText: { fontFamily: FONT.medium, fontSize: 12 },

  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'web' ? SPACING.xl : 40,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  dotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { width: 24 },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipButton: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  skipText: { fontFamily: FONT.medium, fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  nextButton: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: RADIUS.full,
  },
  nextText: { fontFamily: FONT.semiBold, fontSize: 16 },

  guestBtn: { alignItems: 'center', paddingVertical: SPACING.xs },
  guestBtnText: {
    fontFamily: FONT.medium, fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
  },
});
