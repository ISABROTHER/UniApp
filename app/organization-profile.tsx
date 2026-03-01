import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, Calendar, Shield, Mail, Phone, Building, GraduationCap, AlertCircle, Pin, Clock, MapPin, Lock } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'announcements' | 'events' | 'members' | 'about';

type Organization = {
  id: string;
  name: string;
  type: string;
  description: string;
  logo_url: string | null;
  verified: boolean;
  member_count: number;
  is_open: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  affiliated_hall: string | null;
  affiliated_department: string | null;
  created_at: string;
  category?: string;
};

type Membership = {
  user_id: string;
  org_id: string;
  role: string;
  title: string | null;
  status: string;
  joined_at: string;
};

type Announcement = {
  id: string;
  org_id: string;
  author_id: string;
  title: string;
  body: string;
  priority: string | null;
  created_at: string;
  author_name?: string;
};

type Event = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  is_members_only: boolean;
};

type Member = {
  user_id: string;
  role: string;
  title: string | null;
  joined_at: string;
  full_name: string;
};

export default function OrganizationProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (orgError) throw orgError;
      setOrg(orgData);

      if (user) {
        const { data: membershipData } = await supabase
          .from('org_memberships')
          .select('*')
          .eq('org_id', id)
          .eq('user_id', user.id)
          .single();

        setMembership(membershipData);
      }

      await loadTabData('announcements');
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab: Tab) => {
    if (!id) return;

    try {
      if (tab === 'announcements' && membership) {
        const { data, error } = await supabase
          .from('org_announcements')
          .select('*')
          .eq('org_id', id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const announcementsWithAuthors = await Promise.all(
            data.map(async (ann) => {
              const { data: memberData } = await supabase
                .from('members')
                .select('full_name')
                .eq('user_id', ann.author_id)
                .single();

              return {
                ...ann,
                author_name: memberData?.full_name || 'Unknown',
              };
            })
          );
          setAnnouncements(announcementsWithAuthors);
        }
      } else if (tab === 'events') {
        const { data, error } = await supabase
          .from('org_events')
          .select('*')
          .eq('org_id', id)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true });

        if (!error && data) {
          setEvents(data);
        }
      } else if (tab === 'members') {
        const { data, error } = await supabase
          .from('org_memberships')
          .select('user_id, role, title, joined_at')
          .eq('org_id', id)
          .eq('status', 'approved')
          .order('role', { ascending: true });

        if (!error && data) {
          const membersWithNames = await Promise.all(
            data.map(async (mem) => {
              const { data: memberData } = await supabase
                .from('members')
                .select('full_name')
                .eq('user_id', mem.user_id)
                .single();

              return {
                ...mem,
                full_name: memberData?.full_name || 'Unknown User',
              };
            })
          );
          setMembers(membersWithNames);
        }
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  const handleJoinLeave = async () => {
    if (!user || !org) return;

    setActionLoading(true);
    try {
      if (membership) {
        const { error } = await supabase
          .from('org_memberships')
          .delete()
          .eq('org_id', org.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setMembership(null);
        Alert.alert('Success', 'You have left the organization');
      } else {
        const { data, error } = await supabase
          .from('org_memberships')
          .insert({
            org_id: org.id,
            user_id: user.id,
            role: 'member',
            status: org.is_open ? 'approved' : 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        setMembership(data);
        Alert.alert(
          'Success',
          org.is_open
            ? 'You have joined the organization'
            : 'Your membership request has been submitted'
        );
      }

      await loadData();
    } catch (error) {
      console.error('Error updating membership:', error);
      Alert.alert('Error', 'Failed to update membership');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddToPlanner = async (event: Event) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to add events to your planner');
      return;
    }

    try {
      const { error } = await supabase.from('planner_events').insert({
        user_id: user.id,
        event_id: event.id,
        event_type: 'org_event',
      });

      if (error) throw error;

      Alert.alert('Success', 'Event added to your planner');
    } catch (error) {
      console.error('Error adding to planner:', error);
      Alert.alert('Error', 'Failed to add event to planner');
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getColorForInitial = (initial: string) => {
    const colors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.error, '#9b59b6', '#16a085'];
    const index = initial.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const filteredMembers = members.filter((member) =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = membership && (membership.role === 'admin' || membership.role === 'exec');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!org) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Organization not found</Text>
      </View>
    );
  }

  const initial = getInitial(org.name);
  const logoColor = getColorForInitial(initial);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {org.name}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.heroSection}>
          <View style={[styles.logoCircle, { backgroundColor: logoColor }]}>
            <Text style={styles.logoInitial}>{initial}</Text>
          </View>

          <Text style={styles.orgName}>{org.name}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{org.type}</Text>
            </View>
            {org.verified && (
              <View style={styles.verifiedBadge}>
                <Shield size={14} color={COLORS.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Users size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{org.member_count} members</Text>
            </View>
            <View style={styles.stat}>
              <Calendar size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{events.length} events</Text>
            </View>
          </View>

          {org.description && (
            <Text style={styles.shortDescription} numberOfLines={3}>
              {org.description}
            </Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.joinButton,
              membership && membership.status === 'approved' && styles.joinedButton,
            ]}
            onPress={handleJoinLeave}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.joinButtonText}>
                {membership
                  ? membership.status === 'pending'
                    ? 'Pending'
                    : 'Joined'
                  : 'Join'}
              </Text>
            )}
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push(`/organization-admin?id=${org.id}`)}
            >
              <Shield size={18} color={COLORS.primary} />
              <Text style={styles.adminButtonText}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'announcements' && styles.activeTab]}
            onPress={() => handleTabChange('announcements')}
          >
            <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>
              Announcements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => handleTabChange('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
              Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => handleTabChange('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
              Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => handleTabChange('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'announcements' && (
            <View>
              {!membership ? (
                <Text style={styles.emptyText}>Join the organization to view announcements</Text>
              ) : announcements.length === 0 ? (
                <Text style={styles.emptyText}>No announcements yet</Text>
              ) : (
                announcements.map((announcement) => (
                  <View key={announcement.id} style={styles.announcementCard}>
                    <View style={styles.announcementHeader}>
                      <Text style={styles.announcementTitle}>{announcement.title}</Text>
                      {announcement.priority && (
                        <View
                          style={[
                            styles.priorityBadge,
                            announcement.priority === 'urgent' && styles.urgentBadge,
                            announcement.priority === 'pinned' && styles.pinnedBadge,
                          ]}
                        >
                          {announcement.priority === 'urgent' ? (
                            <AlertCircle size={12} color={COLORS.background} />
                          ) : (
                            <Pin size={12} color={COLORS.background} />
                          )}
                          <Text style={styles.priorityText}>{announcement.priority}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.announcementBody} numberOfLines={3}>
                      {announcement.body}
                    </Text>
                    <View style={styles.announcementFooter}>
                      <Text style={styles.announcementAuthor}>{announcement.author_name}</Text>
                      <Text style={styles.announcementTime}>{getTimeAgo(announcement.created_at)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'events' && (
            <View>
              {events.length === 0 ? (
                <Text style={styles.emptyText}>No upcoming events</Text>
              ) : (
                events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
                      {event.is_members_only && (
                        <View style={styles.membersOnlyBadge}>
                          <Lock size={12} color={COLORS.warning} />
                          <Text style={styles.membersOnlyText}>Members Only</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.venue && (
                      <View style={styles.eventDetail}>
                        <MapPin size={14} color={COLORS.textSecondary} />
                        <Text style={styles.eventDetailText}>{event.venue}</Text>
                      </View>
                    )}
                    {(event.start_time || event.end_time) && (
                      <View style={styles.eventDetail}>
                        <Clock size={14} color={COLORS.textSecondary} />
                        <Text style={styles.eventDetailText}>
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.addToPlannerButton}
                      onPress={() => handleAddToPlanner(event)}
                    >
                      <Text style={styles.addToPlannerText}>Add to Planner</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'members' && (
            <View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search members..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {filteredMembers.length === 0 ? (
                <Text style={styles.emptyText}>No members found</Text>
              ) : (
                filteredMembers.map((member, index) => (
                  <View key={`${member.user_id}-${index}`} style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      {member.title && <Text style={styles.memberTitle}>{member.title}</Text>}
                    </View>
                    <View style={styles.memberRight}>
                      <View
                        style={[
                          styles.roleBadge,
                          (member.role === 'admin' || member.role === 'exec') && styles.leaderBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            (member.role === 'admin' || member.role === 'exec') && styles.leaderText,
                          ]}
                        >
                          {member.role}
                        </Text>
                      </View>
                      <Text style={styles.joinedDate}>Joined {formatDate(member.joined_at)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutSection}>
              {org.description && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>Description</Text>
                  <Text style={styles.aboutText}>{org.description}</Text>
                </View>
              )}

              {org.contact_email && (
                <View style={styles.aboutItem}>
                  <View style={styles.aboutIconRow}>
                    <Mail size={18} color={COLORS.primary} />
                    <Text style={styles.aboutLabel}>Email</Text>
                  </View>
                  <Text style={styles.aboutText}>{org.contact_email}</Text>
                </View>
              )}

              {org.contact_phone && (
                <View style={styles.aboutItem}>
                  <View style={styles.aboutIconRow}>
                    <Phone size={18} color={COLORS.primary} />
                    <Text style={styles.aboutLabel}>Phone</Text>
                  </View>
                  <Text style={styles.aboutText}>{org.contact_phone}</Text>
                </View>
              )}

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Type</Text>
                <Text style={styles.aboutText}>{org.type}</Text>
              </View>

              {org.category && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>Category</Text>
                  <Text style={styles.aboutText}>{org.category}</Text>
                </View>
              )}

              {org.affiliated_hall && (
                <View style={styles.aboutItem}>
                  <View style={styles.aboutIconRow}>
                    <Building size={18} color={COLORS.primary} />
                    <Text style={styles.aboutLabel}>Affiliated Hall</Text>
                  </View>
                  <Text style={styles.aboutText}>{org.affiliated_hall}</Text>
                </View>
              )}

              {org.affiliated_department && (
                <View style={styles.aboutItem}>
                  <View style={styles.aboutIconRow}>
                    <GraduationCap size={18} color={COLORS.primary} />
                    <Text style={styles.aboutLabel}>Affiliated Department</Text>
                  </View>
                  <Text style={styles.aboutText}>{org.affiliated_department}</Text>
                </View>
              )}

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Membership</Text>
                <Text style={styles.aboutText}>{org.is_open ? 'Open' : 'Closed'}</Text>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Created</Text>
                <Text style={styles.aboutText}>{formatDate(org.created_at)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoInitial: {
    fontSize: 48,
    fontWeight: FONT.weight.bold,
    color: COLORS.background,
  },
  orgName: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: RADIUS.full,
  },
  typeBadgeText: {
    fontSize: FONT.size.sm,
    color: COLORS.text,
    fontWeight: FONT.weight.medium,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.full,
  },
  verifiedText: {
    fontSize: FONT.size.sm,
    color: COLORS.primary,
    fontWeight: FONT.weight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  shortDescription: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  joinButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  joinedButton: {
    backgroundColor: COLORS.success,
  },
  joinButtonText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.background,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  adminButtonText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.medium,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },
  tabContent: {
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  announcementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  announcementTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text,
    flex: 1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
  },
  pinnedBadge: {
    backgroundColor: COLORS.warning,
  },
  priorityText: {
    fontSize: FONT.size.xs,
    color: COLORS.background,
    fontWeight: FONT.weight.semibold,
    textTransform: 'uppercase',
  },
  announcementBody: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementAuthor: {
    fontSize: FONT.size.sm,
    color: COLORS.text,
    fontWeight: FONT.weight.medium,
  },
  announcementTime: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  eventDate: {
    fontSize: FONT.size.sm,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },
  membersOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.warning + '20',
    borderRadius: RADIUS.sm,
  },
  membersOnlyText: {
    fontSize: FONT.size.xs,
    color: COLORS.warning,
    fontWeight: FONT.weight.semibold,
  },
  eventTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  eventDetailText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  addToPlannerButton: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  addToPlannerText: {
    fontSize: FONT.size.sm,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT.size.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  memberTitle: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  memberRight: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: RADIUS.sm,
    marginBottom: 4,
  },
  leaderBadge: {
    backgroundColor: COLORS.primary + '20',
  },
  roleText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.medium,
    textTransform: 'capitalize',
  },
  leaderText: {
    color: COLORS.primary,
  },
  joinedDate: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  aboutSection: {
    gap: SPACING.md,
  },
  aboutItem: {
    marginBottom: SPACING.md,
  },
  aboutIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  aboutLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
    marginBottom: SPACING.xs,
  },
  aboutText: {
    fontSize: FONT.size.md,
    color: COLORS.text,
    lineHeight: 22,
  },
});
