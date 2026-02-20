import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, GHANA_UNIVERSITIES, BUDGET_OPTIONS_GHS } from '@/lib/constants';
import { RoommateProfile } from '@/lib/types';
import { ArrowLeft, Users, MapPin, BookOpen, GraduationCap, MessageSquare, Plus, Edit3 } from 'lucide-react-native';

type TabType = 'browse' | 'my_profile';

export default function RoommatesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('browse');
  const [profiles, setProfiles] = useState<RoommateProfile[]>([]);
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [location, setLocation] = useState('');
  const [university, setUniversity] = useState('');
  const [genderPref, setGenderPref] = useState<'male' | 'female' | 'any'>('any');
  const [level, setLevel] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from('roommate_profiles').select('*, members(full_name, email, faculty, department, level, gender, avatar_url)').eq('is_active', true).order('created_at', { ascending: false }).limit(30),
      user ? supabase.from('roommate_profiles').select('*').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    setProfiles((all as RoommateProfile[]) || []);
    if (mine) {
      setMyProfile(mine as RoommateProfile);
      const p = mine as RoommateProfile;
      setBudgetMin(String(p.budget_min));
      setBudgetMax(String(p.budget_max));
      setLocation(p.preferred_location || '');
      setUniversity(p.preferred_university || '');
      setGenderPref(p.gender_preference);
      setLevel(p.academic_level || '');
      setNotes(p.lifestyle_notes || '');
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      budget_min: parseFloat(budgetMin) || 0,
      budget_max: parseFloat(budgetMax) || 0,
      preferred_location: location || null,
      preferred_university: university || null,
      gender_preference: genderPref,
      academic_level: level || null,
      lifestyle_notes: notes || null,
      is_active: true,
    };

    if (myProfile) {
      await supabase.from('roommate_profiles').update(payload).eq('id', myProfile.id);
    } else {
      await supabase.from('roommate_profiles').insert(payload);
    }

    setEditing(false);
    fetchData();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Roommate Finder</Text>
      </View>

      <View style={styles.tabRow}>
        {([['browse', 'Browse'], ['my_profile', 'My Profile']] as [TabType, string][]).map(([t, label]) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : tab === 'browse' ? (
          profiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Roommate Profiles</Text>
              <Text style={styles.emptySubtitle}>Be the first! Create your profile to find compatible roommates.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setTab('my_profile')}>
                <Text style={styles.createBtnText}>Create My Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            profiles.map((p) => {
              const m = (p as any).members;
              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitial}>{m?.full_name?.[0]?.toUpperCase() || 'S'}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{m?.full_name || 'Student'}</Text>
                      {m?.faculty && <Text style={styles.cardFaculty}>{m.faculty}</Text>}
                      <View style={styles.tagRow}>
                        {m?.level && <View style={styles.tag}><GraduationCap size={10} color={COLORS.accent} /><Text style={styles.tagText}>{m.level}</Text></View>}
                        <View style={styles.tag}><Users size={10} color={COLORS.success} /><Text style={styles.tagText}>{p.gender_preference === 'any' ? 'Any gender' : p.gender_preference}</Text></View>
                      </View>
                    </View>
                    <View style={styles.budgetBadge}>
                      <Text style={styles.budgetText}>GH₵{p.budget_min}–{p.budget_max}</Text>
                      <Text style={styles.budgetSub}>/mo</Text>
                    </View>
                  </View>

                  {p.preferred_location && (
                    <View style={styles.infoRow}>
                      <MapPin size={13} color={COLORS.textTertiary} />
                      <Text style={styles.infoText}>{p.preferred_location}</Text>
                    </View>
                  )}
                  {p.preferred_university && (
                    <View style={styles.infoRow}>
                      <BookOpen size={13} color={COLORS.textTertiary} />
                      <Text style={styles.infoText}>{p.preferred_university}</Text>
                    </View>
                  )}
                  {p.lifestyle_notes && <Text style={styles.notes}>{p.lifestyle_notes}</Text>}

                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => router.push(`/(tabs)/messages` as any)}
                  >
                    <MessageSquare size={15} color={COLORS.white} />
                    <Text style={styles.messageBtnText}>Send Message</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )
        ) : (
          <>
            {!editing && myProfile ? (
              <>
                <View style={styles.myProfileCard}>
                  <View style={styles.myProfileHeader}>
                    <Text style={styles.sectionTitle}>My Roommate Profile</Text>
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                      <Edit3 size={14} color={COLORS.primary} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Budget</Text>
                    <Text style={styles.profileValue}>GH₵{myProfile.budget_min} – GH₵{myProfile.budget_max}/month</Text>
                  </View>
                  {myProfile.preferred_location && (
                    <View style={styles.profileRow}>
                      <Text style={styles.profileLabel}>Location</Text>
                      <Text style={styles.profileValue}>{myProfile.preferred_location}</Text>
                    </View>
                  )}
                  {myProfile.preferred_university && (
                    <View style={styles.profileRow}>
                      <Text style={styles.profileLabel}>University</Text>
                      <Text style={styles.profileValue}>{myProfile.preferred_university}</Text>
                    </View>
                  )}
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Gender Preference</Text>
                    <Text style={styles.profileValue}>{myProfile.gender_preference}</Text>
                  </View>
                  {myProfile.lifestyle_notes && (
                    <View style={styles.profileRow}>
                      <Text style={styles.profileLabel}>About Me</Text>
                      <Text style={styles.profileValue}>{myProfile.lifestyle_notes}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.form}>
                <Text style={styles.formTitle}>{myProfile ? 'Edit Profile' : 'Create Profile'}</Text>
                <Text style={styles.formSubtitle}>Help others find compatible roommates</Text>

                <Text style={styles.fieldLabel}>Budget Range (GH₵/month)</Text>
                <View style={styles.rangeRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={budgetMin} onChangeText={setBudgetMin} placeholder="Min" placeholderTextColor={COLORS.textTertiary} keyboardType="numeric" />
                  <Text style={styles.rangeSep}>—</Text>
                  <TextInput style={[styles.input, { flex: 1 }]} value={budgetMax} onChangeText={setBudgetMax} placeholder="Max" placeholderTextColor={COLORS.textTertiary} keyboardType="numeric" />
                </View>

                <Text style={styles.fieldLabel}>Preferred Location / Area</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. East Legon, Kumasi" placeholderTextColor={COLORS.textTertiary} />

                <Text style={styles.fieldLabel}>Preferred University</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.uniScroll}>
                  {GHANA_UNIVERSITIES.slice(0, 6).map((u) => (
                    <TouchableOpacity key={u} style={[styles.uniChip, university === u && styles.uniChipActive]} onPress={() => setUniversity(u === university ? '' : u)}>
                      <Text style={[styles.uniChipText, university === u && styles.uniChipTextActive]} numberOfLines={1}>{u.split(' (')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Gender Preference</Text>
                <View style={styles.genderRow}>
                  {(['any', 'male', 'female'] as const).map((g) => (
                    <TouchableOpacity key={g} style={[styles.genderChip, genderPref === g && styles.genderChipActive]} onPress={() => setGenderPref(g)}>
                      <Text style={[styles.genderChipText, genderPref === g && styles.genderChipTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Academic Level</Text>
                <TextInput style={styles.input} value={level} onChangeText={setLevel} placeholder="e.g. Level 300, Year 2, Postgrad" placeholderTextColor={COLORS.textTertiary} />

                <Text style={styles.fieldLabel}>About Me / Lifestyle Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="I'm a quiet student who prefers a clean space..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} activeOpacity={0.8}>
                  <Text style={styles.saveBtnText}>{myProfile ? 'Update Profile' : 'Create Profile'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {!editing && !myProfile && (
              <TouchableOpacity style={styles.createFirstBtn} onPress={() => setEditing(true)}>
                <Plus size={18} color={COLORS.white} />
                <Text style={styles.createFirstBtnText}>Create Roommate Profile</Text>
              </TouchableOpacity>
            )}
          </>
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

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background },
  tabBtnActive: { backgroundColor: COLORS.primaryFaded },
  tabLabel: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  content: { padding: SPACING.md },
  loadingText: { textAlign: 'center', marginTop: 60, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md },
  createBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.white },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 2 },
  cardFaculty: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  tagText: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textSecondary },
  budgetBadge: { alignItems: 'flex-end' },
  budgetText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.primary },
  budgetSub: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textTertiary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  notes: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: SPACING.sm, lineHeight: 20 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 10, marginTop: SPACING.sm, gap: 6 },
  messageBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  myProfileCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  myProfileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.primary },
  profileRow: { marginBottom: SPACING.sm },
  profileLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  profileValue: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textPrimary },

  form: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  formTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 4 },
  formSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  fieldLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6, marginTop: SPACING.sm },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rangeSep: { fontFamily: FONT.regular, fontSize: 16, color: COLORS.textTertiary },
  input: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 46, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary, marginBottom: 4 },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: SPACING.sm },
  uniScroll: { marginBottom: SPACING.sm },
  uniChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  uniChipActive: { backgroundColor: COLORS.primaryFaded, borderColor: COLORS.primary },
  uniChipText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, maxWidth: 140 },
  uniChipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },
  genderRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  genderChip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  genderChipActive: { backgroundColor: COLORS.primaryFaded, borderColor: COLORS.primary },
  genderChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  genderChipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.md },
  saveBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  createFirstBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, gap: 8 },
  createFirstBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },
});
