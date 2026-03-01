import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated,
} from 'react-native';
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
  Home, Star, Edit3, X, Check, Phone, Mail,
} from 'lucide-react-native';

const ONBOARDING_FEATURES = [
  {
    icon: Home, iconColor: '#4A90E2', iconBg: '#E0F2FE',
    title: 'Student Housing',
    description: 'Discover verified accommodations near UCC. Book digitally with e-contracts and QR check-ins.',
  },
  {
    icon: ShoppingBag, iconColor: '#7C3AED', iconBg: '#EDE9FE',
    title: 'Smart Wash',
    description: 'Schedule laundry pickup from your room. Real-time tracking from washing to doorstep delivery.',
  },
  {
    icon: Printer, iconColor: COLORS.success, iconBg: '#DCFCE7',
    title: 'Safe Print',
    description: 'Upload documents from anywhere. Pick up with a 6-digit code or get delivery to your door.',
  },
  {
    icon: Users, iconColor: COLORS.accent, iconBg: '#E0F2FE',
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
  badgeColor?: string;
}

function MenuItem({ icon, title, subtitle, onPress, badge, iconBg, badgeColor }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconBox, iconBg && { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.menuTextBox}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={[styles.menuBadge, badgeColor && { backgroundColor: badgeColor }]}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

const EDIT_FIELDS = [
  { key: 'full_name', label: 'Full Name', icon: <User size={18} color={COLORS.textTertiary} />, placeholder: 'Your full name' },
  { key: 'phone', label: 'Phone Number', icon: <Phone size={18} color={COLORS.textTertiary} />, placeholder: '0244123456', keyboardType: 'phone-pad' as const },
  { key: 'faculty', label: 'Faculty', icon: <GraduationCap size={18} color={COLORS.textTertiary} />, placeholder: 'e.g., Science' },
  { key: 'department', label: 'Department', icon: <GraduationCap size={18} color={COLORS.textTertiary} />, placeholder: 'e.g., Computer Science' },
  { key: 'level', label: 'Level', icon: <Star size={18} color={COLORS.textTertiary} />, placeholder: 'e.g., 300' },
  { key: 'hall_of_residence', label: 'Hall of Residence', icon: <Building2 size={18} color={COLORS.textTertiary} />, placeholder: 'e.g., Oguaa Hall' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut, isAdmin, isOwner } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('members').select('*').eq('id', user.id).maybeSingle();
      if (data) { setMember(data as Member); setEditForm(data as Member); }
      const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
      if (stats) setUserStats(stats as UserStats);
    })();
  }, []));

  const handleSaveProfile = async () => {
    if (!member) return;
    setSaving(true);
    const { error } = await supabase.from('members').update({
      full_name: editForm.full_name,
      phone: editForm.phone,
      faculty: editForm.faculty,
      department: editForm.department,
      level: editForm.level,
      hall_of_residence: editForm.hall_of_residence,
    }).eq('id', member.id);
    setSaving(false);
    if (!error) {
      setMember(prev => prev ? { ...prev, ...editForm } : prev);
      setSaveSuccess(true);
      Animated.sequence([
        Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(successScale, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setSaveSuccess(false);
        setEditVisible(false);
      });
    }
  };

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
        <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth/sign-in')} activeOpacity={0.8}>
          <Text style={styles.signInButtonText}>Sign in / Create account</Text>
        </TouchableOpacity>
        <Text style={styles.version}>UCC Housing v1.0 — Campus Super App</Text>
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    );
  }

  return (
    <>
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
            <View style={styles.profileBottom}>
              <View style={[styles.rolePill, { backgroundColor: `${roleColor}35`, borderColor: `${roleColor}55` }]}>
                <Text style={[styles.roleText, { color: COLORS.white }]}>{roleLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => { setEditForm(member ?? {}); setEditVisible(true); }}
                activeOpacity={0.8}
              >
                <Edit3 size={16} color={COLORS.white} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isOwner && (
          <TouchableOpacity
            style={styles.ownerBanner}
            onPress={() => router.push('/owner' as any)}
            activeOpacity={0.88}
          >
            <View style={styles.ownerBannerLeft}>
              <View style={styles.ownerBannerIconBox}>
                <Building2 size={22} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.ownerBannerLabel}>OWNER DASHBOARD</Text>
                <Text style={styles.ownerBannerTitle}>Manage Your Hostels</Text>
                <Text style={styles.ownerBannerSub}>Bookings · Analytics · Issues</Text>
              </View>
            </View>
            <ChevronRight size={20} color='rgba(255,255,255,0.7)' />
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{userStats?.hostels_viewed ?? 0}</Text>
            <Text style={styles.statLabel}>Viewings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.teal }]}>{userStats?.favourites_saved ?? 0}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{userStats?.bookings_made ?? 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.success }]}>{userStats?.services_used ?? 0}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
        </View>

        <OnboardingProgress />
        <LoyaltyCard />

        <SectionHeader title="Housing" />
        <MenuItem icon={<Home size={20} color={COLORS.accent} />} title="My Bookings" subtitle="View and manage reservations" onPress={() => router.push('/(tabs)/bookings' as any)} iconBg="#E0F2FE" />
        <MenuItem icon={<FileText size={20} color={COLORS.info} />} title="Tenancy" subtitle="Agreements & rent payments" onPress={() => router.push('/tenancy' as any)} iconBg="#E0F2FE" />
        <MenuItem icon={<Zap size={20} color={COLORS.warning} />} title="Utilities" subtitle="ECG electricity & GWCL water" onPress={() => router.push('/utilities' as any)} iconBg="#FEF3C7" />
        <MenuItem icon={<Wrench size={20} color={COLORS.error} />} title="Maintenance" subtitle="Report issues & track repairs" onPress={() => router.push('/maintenance' as any)} iconBg="#FEE2E2" />

        <SectionHeader title="Campus Services" />
        <MenuItem icon={<ShoppingBag size={20} color='#FF9900' />} title="StuMark" subtitle="Buy & sell on campus marketplace" onPress={() => router.push('/(tabs)/stumark' as any)} iconBg="#FFF3E6" badge="New" badgeColor="#FF9900" />
        <MenuItem icon={<ShoppingBag size={20} color='#7C3AED' />} title="Smart Wash" subtitle="On-demand laundry pickup & delivery" onPress={() => router.push('/(tabs)/laundry' as any)} iconBg="#EDE9FE" />
        <MenuItem icon={<Printer size={20} color={COLORS.success} />} title="Safe Print" subtitle="Cloud printing with pickup or delivery" onPress={() => router.push('/print' as any)} iconBg="#DCFCE7" />
        <MenuItem icon={<Users size={20} color={COLORS.success} />} title="Roommate Finder" subtitle="Find the perfect flatmate" onPress={() => router.push('/roommates' as any)} iconBg="#DCFCE7" />

        <SectionHeader title="Account" />
        <MenuItem icon={<MessageSquare size={20} color={COLORS.accent} />} title="Messages" subtitle="Chat with owners & students" onPress={() => router.push('/(tabs)/messages' as any)} iconBg="#E0F2FE" />
        <MenuItem icon={<Bell size={20} color={COLORS.textPrimary} />} title="Notifications" subtitle="Manage your alerts" onPress={() => router.push('/notifications' as any)} />
        <MenuItem icon={<GraduationCap size={20} color={COLORS.textPrimary} />} title="University & Hall" subtitle={member?.university || 'Set your institution & hall'} onPress={() => router.push('/edit-profile')} />
        <MenuItem icon={<Shield size={20} color={COLORS.textPrimary} />} title="Privacy & Security" subtitle="Manage your data" onPress={() => {}} />
        <MenuItem icon={<HelpCircle size={20} color={COLORS.textPrimary} />} title="Support" subtitle="Get help from our team" onPress={() => {}} />

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

      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.sheetClose}>
              <X size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={[styles.sheetSaveBtn, saving && { opacity: 0.6 }]}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.sheetSaveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sheetAvatarRow}>
              <View style={styles.sheetAvatar}>
                <Text style={styles.sheetAvatarText}>{(member?.full_name || 'S')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.sheetAvatarName}>{member?.full_name || 'Student'}</Text>
                <Text style={styles.sheetAvatarEmail}>{member?.email}</Text>
              </View>
            </View>

            {EDIT_FIELDS.map((field) => (
              <View key={field.key} style={styles.sheetField}>
                <Text style={styles.sheetFieldLabel}>{field.label}</Text>
                <View style={styles.sheetInputRow}>
                  {field.icon}
                  <TextInput
                    style={styles.sheetInput}
                    value={(editForm[field.key] as string) || ''}
                    onChangeText={(v) => setEditForm(prev => ({ ...prev, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType={field.keyboardType || 'default'}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          {saveSuccess && (
            <Animated.View style={[styles.successToast, { transform: [{ scale: successScale }] }]}>
              <Check size={18} color={COLORS.white} />
              <Text style={styles.successToastText}>Profile Updated!</Text>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl },

  pageTitle: {
    fontFamily: FONT.headingBold, fontSize: 32, color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md, paddingTop: Platform.OS === 'web' ? 20 : 60, paddingBottom: SPACING.md,
  },

  guestHeroCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, marginHorizontal: SPACING.md,
    paddingVertical: SPACING.xl * 1.5, paddingHorizontal: SPACING.lg, alignItems: 'center',
  },
  guestLogoBox: {
    backgroundColor: 'rgba(255,255,255,0.2)', width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  guestHeroTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.white, marginBottom: SPACING.xs },
  guestHeroSub: {
    fontFamily: FONT.regular, fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22,
  },

  featuresHeading: {
    fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary, marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  featureCard: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm, alignItems: 'flex-start',
  },
  featureIconBox: { width: 44, height: 44, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  featureContent: { flex: 1, marginLeft: SPACING.md },
  featureTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 2 },
  featureDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  signInButton: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.md + 2,
    marginHorizontal: SPACING.md, marginTop: SPACING.lg, alignItems: 'center',
  },
  signInButtonText: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.white },

  profileCard: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    marginHorizontal: SPACING.md, alignItems: 'center',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.white },
  profileInfo: { flex: 1, marginLeft: SPACING.md },
  profileName: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  profileUniversity: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  profileBottom: { flexDirection: 'row', marginTop: SPACING.sm, alignItems: 'center', gap: SPACING.sm },
  rolePill: {
    paddingHorizontal: SPACING.sm + 2, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1,
    backgroundColor: COLORS.primary,
  },
  roleText: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.white },
  editBtn: {
    flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2, paddingVertical: 6, alignItems: 'center', gap: 4,
  },
  editBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  ownerBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.navy, borderRadius: RADIUS.lg, paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md, marginHorizontal: SPACING.md, marginTop: SPACING.sm,
  },
  ownerBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  ownerBannerIconBox: {
    width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  ownerBannerLabel: { fontFamily: FONT.bold, fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 },
  ownerBannerTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.white, marginTop: 2 },
  ownerBannerSub: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  statsRow: {
    flexDirection: 'row', marginTop: SPACING.md, marginHorizontal: SPACING.md, gap: SPACING.sm,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  statNum: { fontFamily: FONT.bold, fontSize: 22 },
  statLabel: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  sectionHeader: {
    fontFamily: FONT.bold, fontSize: 15, color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.xs, borderRadius: RADIUS.md,
  },
  menuIconBox: {
    width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  menuTextBox: { flex: 1, marginLeft: SPACING.md },
  menuTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  menuSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  menuBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.xs,
    paddingVertical: 2, marginRight: SPACING.xs,
  },
  menuBadgeText: { fontFamily: FONT.bold, fontSize: 10, color: COLORS.white },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md, marginTop: SPACING.lg,
  },
  signOutText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.error },

  version: {
    fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, textAlign: 'center',
    marginTop: SPACING.lg,
  },

  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  sheetClose: { padding: SPACING.xs },
  sheetTitle: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  sheetSaveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2, minWidth: 60, alignItems: 'center',
  },
  sheetSaveBtnText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },

  sheetBody: { flex: 1, paddingHorizontal: SPACING.md },
  sheetAvatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.md },
  sheetAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  sheetAvatarText: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.white },
  sheetAvatarName: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary },
  sheetAvatarEmail: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  sheetField: { marginBottom: SPACING.md },
  sheetFieldLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  sheetInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: SPACING.sm + 2,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
  },
  sheetInput: {
    flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, marginLeft: SPACING.xs,
    padding: 0,
  },

  successToast: {
    position: 'absolute', bottom: SPACING.xl, alignSelf: 'center', flexDirection: 'row',
    backgroundColor: COLORS.success, borderRadius: RADIUS.md, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md, alignItems: 'center', gap: SPACING.xs,
  },
  successToastText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
});