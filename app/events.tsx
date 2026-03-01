import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Plus,
  MapPin,
  Users,
  Calendar,
  Clock,
  X,
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Category = 'All' | 'Academic' | 'Social' | 'Sports' | 'Career' | 'Cultural' | 'Hall Week';

interface Event {
  id: string;
  organizer_id: string;
  university: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  event_date: string;
  end_date: string;
  image_url: string | null;
  max_attendees: number | null;
  is_free: boolean;
  price: number | null;
  status: string;
  rsvp_count?: number;
  user_rsvp?: string | null;
}

const CATEGORIES: Category[] = ['All', 'Academic', 'Social', 'Sports', 'Career', 'Cultural', 'Hall Week'];

const CATEGORY_COLORS: Record<string, string> = {
  Academic: COLORS.accent,
  Social: COLORS.primary,
  Sports: COLORS.success,
  Career: COLORS.warning,
  Cultural: '#8B5CF6',
  'Hall Week': '#EC4899',
};

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Academic',
    venue: '',
    event_date: '',
    is_free: true,
    price: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data: eventsData, error } = await supabase
        .from('campus_events')
        .select('*')
        .eq('status', 'active')
        .order('event_date', { ascending: true });

      if (error) throw error;

      if (eventsData) {
        const eventsWithRsvps = await Promise.all(
          eventsData.map(async (event) => {
            const { count } = await supabase
              .from('event_rsvps')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('status', 'going');

            const { data: userRsvp } = await supabase
              .from('event_rsvps')
              .select('status')
              .eq('event_id', event.id)
              .eq('user_id', user?.id)
              .single();

            return {
              ...event,
              rsvp_count: count || 0,
              user_rsvp: userRsvp?.status || null,
            };
          })
        );

        setEvents(eventsWithRsvps);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string, currentStatus: string | null) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to RSVP');
      return;
    }

    const statusCycle = {
      null: 'going',
      going: 'interested',
      interested: 'not_going',
      not_going: null,
    };

    const newStatus = statusCycle[currentStatus || 'null'];

    try {
      if (newStatus === null) {
        await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
      } else {
        const { data: existing } = await supabase
          .from('event_rsvps')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();

        if (existing) {
          await supabase
            .from('event_rsvps')
            .update({ status: newStatus })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('event_rsvps')
            .insert({ event_id: eventId, user_id: user.id, status: newStatus });
        }
      }

      fetchEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      Alert.alert('Error', 'Failed to update RSVP');
    }
  };

  const handleCreateEvent = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to create events');
      return;
    }

    if (!formData.title || !formData.venue || !formData.event_date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('campus_events').insert({
        organizer_id: user.id,
        university: user.university,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue: formData.venue,
        event_date: formData.event_date,
        is_free: formData.is_free,
        price: formData.is_free ? null : parseFloat(formData.price) || null,
        status: 'active',
      });

      if (error) throw error;

      Alert.alert('Success', 'Event created successfully!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'Academic',
        venue: '',
        event_date: '',
        is_free: true,
        price: '',
      });
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event');
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getRSVPButtonStyle = (status: string | null) => {
    if (status === 'going') return styles.rsvpButtonGoing;
    if (status === 'interested') return styles.rsvpButtonInterested;
    if (status === 'not_going') return styles.rsvpButtonNotGoing;
    return styles.rsvpButtonDefault;
  };

  const getRSVPButtonText = (status: string | null) => {
    if (status === 'going') return 'Going';
    if (status === 'interested') return 'Interested';
    if (status === 'not_going') return 'Not Going';
    return 'RSVP';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Events</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.createButton}>
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.categoryPill,
              selectedCategory === category && styles.categoryPillActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.eventsContainer} showsVerticalScrollIndicator={false}>
        {filteredEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View
              style={[
                styles.categoryAccent,
                { backgroundColor: CATEGORY_COLORS[event.category] || COLORS.accent },
              ]}
            />

            <View style={styles.eventImageContainer}>
              {event.image_url ? (
                <Image source={{ uri: event.image_url }} style={styles.eventImage} />
              ) : (
                <View style={styles.eventImagePlaceholder}>
                  <Calendar size={32} color={COLORS.textTertiary} />
                </View>
              )}
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>{formatDate(event.event_date)}</Text>
              </View>
            </View>

            <View style={styles.eventContent}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                {event.is_free ? (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free</Text>
                  </View>
                ) : (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>${event.price}</Text>
                  </View>
                )}
              </View>

              <View style={styles.eventMeta}>
                <View style={styles.metaRow}>
                  <Clock size={14} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{formatTime(event.event_date)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={14} color={COLORS.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {event.venue}
                  </Text>
                </View>
              </View>

              <View style={styles.eventFooter}>
                <View style={styles.attendeeInfo}>
                  <Users size={16} color={COLORS.textSecondary} />
                  <Text style={styles.attendeeText}>{event.rsvp_count} going</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRSVP(event.id, event.user_rsvp || null)}
                  style={[styles.rsvpButton, getRSVPButtonStyle(event.user_rsvp || null)]}
                >
                  <Text style={styles.rsvpButtonText}>
                    {getRSVPButtonText(event.user_rsvp || null)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {filteredEvents.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Calendar size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyStateText}>No events found</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Event</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Event title"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Event description"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryPicker}
              >
                {CATEGORIES.filter((c) => c !== 'All').map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setFormData({ ...formData, category })}
                    style={[
                      styles.categoryPickerItem,
                      formData.category === category && styles.categoryPickerItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPickerText,
                        formData.category === category && styles.categoryPickerTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Venue *</Text>
              <TextInput
                style={styles.input}
                placeholder="Event location"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.venue}
                onChangeText={(text) => setFormData({ ...formData, venue: text })}
              />

              <Text style={styles.label}>Date & Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM:SS"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.event_date}
                onChangeText={(text) => setFormData({ ...formData, event_date: text })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Free Event</Text>
                <Switch
                  value={formData.is_free}
                  onValueChange={(value) => setFormData({ ...formData, is_free: value })}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>

              {!formData.is_free && (
                <>
                  <Text style={styles.label}>Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textTertiary}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    keyboardType="decimal-pad"
                  />
                </>
              )}
            </ScrollView>

            <TouchableOpacity onPress={handleCreateEvent} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
  },
  createButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: SPACING.md,
  },
  categoryContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  eventImageContainer: {
    position: 'relative',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBadgeText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  eventContent: {
    padding: SPACING.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  freeBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  freeBadgeText: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  paidBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  paidBadgeText: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  eventMeta: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
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
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  attendeeText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  rsvpButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  rsvpButtonDefault: {
    backgroundColor: COLORS.primary,
  },
  rsvpButtonGoing: {
    backgroundColor: COLORS.success,
  },
  rsvpButtonInterested: {
    backgroundColor: COLORS.accent,
  },
  rsvpButtonNotGoing: {
    backgroundColor: COLORS.textTertiary,
  },
  rsvpButtonText: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
  },
  modalForm: {
    padding: SPACING.md,
    maxHeight: 500,
  },
  label: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    maxHeight: 50,
    marginBottom: SPACING.sm,
  },
  categoryPickerItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  categoryPickerItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPickerText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  categoryPickerTextActive: {
    color: COLORS.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
});
