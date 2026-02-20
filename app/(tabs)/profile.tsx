import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Member, LoyaltyBalance, UserStats } from '@/lib/types';
import OnboardingProgress from '@/components/OnboardingProgress';
import LoyaltyCard from '@/components/LoyaltyCard';
import {
  ChevronRight, LogOut, Bell, FileText, HelpCircle,
  User, MessageSquare, Wrench, Building2, Shield,
  CreditCard, Users, Zap, GraduationCap, ShoppingBag, Printer,
  Home, BookOpen, Star,
} from 'lucide-react-native';

const ONBOARDING_FEATURES = [
  {
    icon: Home,
    iconColor: '#4A90E2',
    iconBg: '#E0F2FE',
    title: 'Student Housing',
    description: 'Discover verified accommodations near UCC. Book digitally with e-contracts and QR check-ins.',
  },
  {
    icon: ShoppingBag,
    iconColor: '#7C3AED',
    iconBg: '#EDE9FE',
    title: 'Smart Wash',
    description: 'Schedule laundry pickup from your room. Real-time tracking from washing to doorstep delivery.',
  },
  {
    icon: Printer,
    iconColor: COLORS.success,
    iconBg: '#DCFCE7',
    title: 'Safe Print',
    description: 'Upload documents from anywhere. Pick up with a 6-digit code or get delivery to your door.',
  },
  {
    icon: Users,
    iconColor: COLORS.accent,
    iconBg: '#E0F2FE',
    title: 'Community',
    description: 'Match with compatible flatmates, chat with owners, and track maintenance requests.',
  },
];

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  badge?: string;
  iconBg?: string;
}

function MenuItem({ icon, title, subtitle, onPress, badge, iconBg }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconBox, iconBg ? { backgroundColor: iconBg } : {}]}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      )}
      <ChevronRight size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

export default function ProfileScreen() {
  const { signOut, isOwner, isAdmin, session } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('members').select('*').eq('id', user.id).maybeSingle();
      if (data) setMember(data as Member);

      const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
      if (stats) setUserStats(stats as UserStats);
    })();
  }, []));

  const roleLabel = isAdmin ? 'Admin' : isOwner ? 'Hostel Owner' : 'Verified Student';
  const roleColor = isAdmin ? COLORS.warning : isOwner ? COLORS.accent : COLORS.primary;

  if (!session) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.guestHeroCard}>
          <View style={styles.guestLogoBox}>
            <Home size={28} color={COLORS.white} strokeWidth={2} />
          </View>
          <Text style={styles.guestHeroTitle}>UCC Housing</Text>
          <Text style={styles.guestHeroSub}>Sign in to access your full profile, bookings, and campus services.</Text>
        </View>

        <Text style={styles.featuresHeading}>What you get with UCC Housing</Text>

        {ONBOARDING_FEATURES.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <View key={feature.title} style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: feature.iconBg }]}>
                <FeatureIcon size={22} color={feature.iconColor} strokeWidth={1.8} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/auth/sign-in')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>Sign in / Create account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>UCC Housing v1.0 — Campus Super App</Text>
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{(member?.full_name || 'S')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{member?.full_name || 'Student User'}</Text>
          <Text style={styles.profileUniversity}>
            {member?.hall_of_residence || 'University of Cape Coast'}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: `${roleColor}35`, borderColor: `${roleColor}55` }]}>
            <Text style={[styles.roleText, { color: COLORS.white }]}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{userStats?.hostels_viewed ?? 0}</Text>
          <Text style={styles.statLabel}>{'Viewings'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: COLORS.teal }]}>{userStats?.favourites_saved ?? 0}</Text>
          <Text style={styles.statLabel}>{'Saved'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: COLORS.warning }]}>{userStats?.bookings_made ?? 0}</Text>
          <Text style={styles.statLabel}>{'Bookings'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{userStats?.services_used ?? 0}</Text>
          <Text style={styles.statLabel}>{'Services'}</Text>
        </View>
      </View>

      <OnboardingProgress />

      <LoyaltyCard />

      <SectionHeader title="Housing" />
      <MenuItem
        icon={<Home size={20} color={COLORS.accent} />}
        title="My Bookings"
        subtitle="View and manage reservations"
        onPress={() => router.push('/(tabs)/bookings' as any)}
        iconBg="#E0F2FE"
      />
      <MenuItem
        icon={<FileText size={20} color={COLORS.info} />}
        title="Tenancy"
        subtitle="Agreements & rent payments"
        onPress={() => router.push('/tenancy' as any)}
        iconBg="#E0F2FE"
      />
      <MenuItem
        icon={<Zap size={20} color={COLORS.warning} />}
        title="Utilities"
        subtitle="ECG electricity & GWCL water"
        onPress={() => router.push('/utilities' as any)}
        iconBg="#FEF3C7"
      />
      <MenuItem
        icon={<Wrench size={20} color={COLORS.error} />}
        title="Maintenance"
        subtitle="Report issues & track repairs"
        onPress={() => router.push('/maintenance' as any)}
        iconBg="#FEE2E2"
      />

      <SectionHeader title="Campus Services" />
      <MenuItem
        icon={<ShoppingBag size={20} color='#7C3AED' />}
        title="Smart Wash"
        subtitle="On-demand laundry pickup & delivery"
        onPress={() => router.push('/(tabs)/laundry' as any)}
        iconBg="#EDE9FE"
        badge="New"
      />
      <MenuItem
        icon={<Printer size={20} color={COLORS.success} />}
        title="Safe Print"
        subtitle="Cloud printing with pickup or delivery"
        onPress={() => router.push('/print' as any)}
        iconBg="#DCFCE7"
        badge="New"
      />
      <MenuItem
        icon={<Users size={20} color={COLORS.success} />}
        title="Roommate Finder"
        subtitle="Find the perfect flatmate"
        onPress={() => router.push('/roommates' as any)}
        iconBg="#DCFCE7"
      />

      <SectionHeader title="Account" />
      <MenuItem
        icon={<MessageSquare size={20} color={COLORS.accent} />}
        title="Messages"
        subtitle="Chat with owners & students"
        onPress={() => router.push('/(tabs)/messages' as any)}
        iconBg="#E0F2FE"
      />
      <MenuItem
        icon={<Bell size={20} color={COLORS.textPrimary} />}
        title="Notifications"
        subtitle="Manage your alerts"
        onPress={() => router.push('/notifications' as any)}
      />
      <MenuItem
        icon={<GraduationCap size={20} color={COLORS.textPrimary} />}
        title="My University"
        subtitle={member?.hall_of_residence || 'University of Cape Coast'}
        onPress={() => {}}
      />
      <MenuItem
        icon={<CreditCard size={20} color={COLORS.textPrimary} />}
        title="Payment Methods"
        subtitle="Cards & mobile money"
        onPress={() => {}}
      />
      <MenuItem
        icon={<Shield size={20} color={COLORS.textPrimary} />}
        title="Privacy & Security"
        subtitle="Manage your data"
        onPress={() => {}}
      />
      <MenuItem
        icon={<HelpCircle size={20} color={COLORS.textPrimary} />}
        title="Support"
        subtitle="Get help from our team"
        onPress={() => {}}
      />

      {(isOwner || isAdmin) && (
        <>
          <SectionHeader title="Owner Tools" />
          <MenuItem
            icon={<Building2 size={20} color={COLORS.navy} />}
            title="Owner Dashboard"
            subtitle="Manage hostels & bookings"
            onPress={() => router.push('/owner' as any)}
            badge="Owner"
            iconBg={COLORS.background}
          />
        </>
      )}

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={async () => { await signOut(); router.replace('/auth/sign-in'); }}
        activeOpacity={0.7}
      >
        <LogOut size={20} color={COLORS.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>UCC Housing v1.0 — Campus Super App</Text>
      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl },

  pageTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 32,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: SPACING.md,
  },

  profileCard: {
    backgroundColor: COLORS.navy,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarInitial: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.white },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.white, marginBottom: 4 },
  profileUniversity: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  roleText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.white },

  statsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statNum: { fontFamily: FONT.headingBold, fontSize: 26, marginBottom: 4 },
  statLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },

  sectionHeader: {
    fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  menuCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  menuIconBox: {
    width: 42, height: 42, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  menuContent: { flex: 1 },
  menuTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  menuSubtitle: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.full,
  },
  badgeText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.primary },

  guestHeroCard: {
    backgroundColor: COLORS.navy,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  guestLogoBox: {
    width: 56, height: 56, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  guestHeroTitle: {
    fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  guestHeroSub: {
    fontFamily: FONT.regular, fontSize: 14,
    color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22,
  },

  featuresHeading: {
    fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },

  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  featureIconBox: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  featureContent: { flex: 1 },
  featureTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 4 },
  featureDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginTop: SPACING.md,
    borderRadius: RADIUS.md, paddingVertical: SPACING.md, gap: SPACING.sm,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4,
  },
  signOutText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.error },
  signInButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, marginHorizontal: SPACING.md, marginTop: SPACING.md,
    borderRadius: RADIUS.md, paddingVertical: 15,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  signInButtonText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
  version: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, textAlign: 'center', marginTop: SPACING.md },
});
