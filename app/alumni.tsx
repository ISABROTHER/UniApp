import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Filter, Briefcase, GraduationCap, MapPin, Send, X, CheckCircle, Clock, XCircle, Plus } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AlumniProfile {
  id: string;
  user_id: string;
  university: string;
  graduation_year: number;
  degree: string;
  department: string;
  job_title: string;
  company_name: string;
  bio: string;
  linkedin_url: string;
  areas_of_mentorship: string[];
  is_available: boolean;
  full_name: string;
  avatar_url: string;
}

interface MentorshipRequest {
  id: string;
  student_id: string;
  alumni_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  alumni_profile: {
    full_name: string;
    job_title: string;
    company_name: string;
  };
}

export default function AlumniScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'requests'>('browse');
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [filteredAlumni, setFilteredAlumni] = useState<AlumniProfile[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniProfile | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasAlumniProfile, setHasAlumniProfile] = useState(false);

  const departments = ['Computer Science', 'Engineering', 'Business', 'Medicine', 'Law', 'Arts', 'Science'];
  const mentorshipAreas = ['Career Guidance', 'Interview Prep', 'Networking', 'Skill Development', 'Entrepreneurship', 'Research', 'Industry Insights'];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    filterAlumni();
  }, [searchQuery, selectedDepartment, selectedArea, alumni]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'browse') {
      await loadAlumni();
      await checkAlumniProfile();
    } else {
      await loadRequests();
    }
    setLoading(false);
  };

  const loadAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select(`
          *,
          members!alumni_profiles_user_id_fkey(full_name, avatar_url)
        `)
        .eq('is_available', true)
        .order('graduation_year', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        ...item,
        full_name: item.members?.full_name || 'Unknown',
        avatar_url: item.members?.avatar_url || null,
      }));

      setAlumni(formattedData);
      setFilteredAlumni(formattedData);
    } catch (error) {
      console.error('Error loading alumni:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select(`
          *,
          alumni_profiles!mentorship_requests_alumni_id_fkey(
            members!alumni_profiles_user_id_fkey(full_name),
            job_title,
            company_name
          )
        `)
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        ...item,
        alumni_profile: {
          full_name: item.alumni_profiles?.members?.full_name || 'Unknown',
          job_title: item.alumni_profiles?.job_title || '',
          company_name: item.alumni_profiles?.company_name || '',
        },
      }));

      setRequests(formattedData);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const checkAlumniProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      setHasAlumniProfile(!!data);
    } catch (error) {
      setHasAlumniProfile(false);
    }
  };

  const filterAlumni = () => {
    let filtered = alumni;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.full_name.toLowerCase().includes(query) ||
          a.job_title.toLowerCase().includes(query) ||
          a.company_name.toLowerCase().includes(query) ||
          a.department.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter((a) => a.department === selectedDepartment);
    }

    if (selectedArea) {
      filtered = filtered.filter((a) => a.areas_of_mentorship.includes(selectedArea));
    }

    setFilteredAlumni(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSendRequest = async () => {
    if (!requestMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('mentorship_requests').insert({
        student_id: user?.id,
        alumni_id: selectedAlumni?.id,
        message: requestMessage.trim(),
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('Success', 'Mentorship request sent successfully');
      setShowRequestModal(false);
      setRequestMessage('');
      setSelectedAlumni(null);
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAlumniCard = (alumnus: AlumniProfile) => (
    <View key={alumnus.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{alumnus.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.alumniName}>{alumnus.full_name}</Text>
          <View style={styles.metaRow}>
            <GraduationCap size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              {alumnus.degree} • {alumnus.graduation_year}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.departmentBadge}>
        <Text style={styles.departmentText}>{alumnus.department}</Text>
      </View>

      <View style={styles.jobInfo}>
        <Briefcase size={16} color={COLORS.primary} />
        <Text style={styles.jobTitle}>{alumnus.job_title}</Text>
      </View>
      <View style={styles.companyInfo}>
        <MapPin size={16} color={COLORS.textSecondary} />
        <Text style={styles.companyName}>{alumnus.company_name}</Text>
      </View>

      <Text style={styles.bio} numberOfLines={3}>
        {alumnus.bio}
      </Text>

      <View style={styles.areasContainer}>
        {alumnus.areas_of_mentorship.slice(0, 3).map((area, index) => (
          <View key={index} style={styles.areaBadge}>
            <Text style={styles.areaText}>{area}</Text>
          </View>
        ))}
        {alumnus.areas_of_mentorship.length > 3 && (
          <Text style={styles.moreAreas}>+{alumnus.areas_of_mentorship.length - 3}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.requestButton}
        onPress={() => {
          setSelectedAlumni(alumnus);
          setShowRequestModal(true);
        }}
      >
        <Send size={18} color={COLORS.white} />
        <Text style={styles.requestButtonText}>Request Mentorship</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = (request: MentorshipRequest) => {
    const statusConfig = {
      pending: { icon: Clock, color: COLORS.warning, label: 'Pending' },
      accepted: { icon: CheckCircle, color: COLORS.success, label: 'Accepted' },
      declined: { icon: XCircle, color: COLORS.error, label: 'Declined' },
    };

    const config = statusConfig[request.status];
    const StatusIcon = config.icon;

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.requestAlumniName}>{request.alumni_profile.full_name}</Text>
            <Text style={styles.requestJobTitle}>
              {request.alumni_profile.job_title} at {request.alumni_profile.company_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
            <StatusIcon size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <Text style={styles.requestMessage} numberOfLines={2}>
          {request.message}
        </Text>
        <Text style={styles.requestDate}>{new Date(request.created_at).toLocaleDateString()}</Text>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Department</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedDepartment && styles.filterChipActive]}
              onPress={() => setSelectedDepartment(null)}
            >
              <Text style={[styles.filterChipText, !selectedDepartment && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept}
                style={[styles.filterChip, selectedDepartment === dept && styles.filterChipActive]}
                onPress={() => setSelectedDepartment(dept)}
              >
                <Text style={[styles.filterChipText, selectedDepartment === dept && styles.filterChipTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Mentorship Area</Text>
          <View style={styles.areaGrid}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedArea && styles.filterChipActive]}
              onPress={() => setSelectedArea(null)}
            >
              <Text style={[styles.filterChipText, !selectedArea && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {mentorshipAreas.map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.filterChip, selectedArea === area && styles.filterChipActive]}
                onPress={() => setSelectedArea(area)}
              >
                <Text style={[styles.filterChipText, selectedArea === area && styles.filterChipTextActive]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRequestModal = () => (
    <Modal visible={showRequestModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.requestModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Mentorship</Text>
            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {selectedAlumni && (
            <View style={styles.selectedAlumniInfo}>
              <Text style={styles.selectedAlumniName}>{selectedAlumni.full_name}</Text>
              <Text style={styles.selectedAlumniJob}>
                {selectedAlumni.job_title} at {selectedAlumni.company_name}
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Your Message</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Introduce yourself and explain why you'd like mentorship..."
            placeholderTextColor={COLORS.textTertiary}
            value={requestMessage}
            onChangeText={setRequestMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
            onPress={handleSendRequest}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Send size={18} color={COLORS.white} />
                <Text style={styles.sendButtonText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alumni Mentorship</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.tabTextActive]}>Browse Mentors</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>My Requests</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' && (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search mentors..."
                placeholderTextColor={COLORS.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
              <Filter size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {(selectedDepartment || selectedArea) && (
            <View style={styles.activeFilters}>
              {selectedDepartment && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>{selectedDepartment}</Text>
                  <TouchableOpacity onPress={() => setSelectedDepartment(null)}>
                    <X size={14} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              )}
              {selectedArea && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>{selectedArea}</Text>
                  <TouchableOpacity onPress={() => setSelectedArea(null)}>
                    <X size={14} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        >
          {activeTab === 'browse' ? (
            filteredAlumni.length > 0 ? (
              filteredAlumni.map(renderAlumniCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No mentors found</Text>
              </View>
            )
          ) : requests.length > 0 ? (
            requests.map(renderRequestCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No requests yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {renderFilterModal()}
      {renderRequestModal()}
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl + 12,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontFamily: FONT.semiBold,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm + 2,
  },
  filterButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  activeFilterText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm + 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm + 2,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  cardHeaderText: {
    flex: 1,
  },
  alumniName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  departmentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm + 2,
  },
  departmentText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.accent,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  jobTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm + 2,
  },
  companyName: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    flex: 1,
  },
  bio: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm + 2,
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  areaBadge: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  areaText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  moreAreas: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
    paddingVertical: SPACING.xs,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  requestButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  requestAlumniName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  requestJobTitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
  },
  requestMessage: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  requestDate: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  filterRow: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  filterChip: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  requestModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: SPACING.xl,
  },
  selectedAlumniInfo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  selectedAlumniName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  selectedAlumniJob: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  messageInput: {
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
});
