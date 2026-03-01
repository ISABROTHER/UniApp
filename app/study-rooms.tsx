import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, Users, MapPin, Calendar, Clock, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface StudySpace {
  id: string;
  university: string;
  building: string;
  room_name: string;
  capacity: number;
  amenities: string[];
  is_active: boolean;
}

interface Booking {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  study_spaces?: StudySpace;
}

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export default function StudyRoomsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'spaces' | 'bookings'>('spaces');
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<StudySpace | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [spaceBookings, setSpaceBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'spaces') {
      await fetchSpaces();
    } else {
      await fetchMyBookings();
    }
  };

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_spaces')
        .select('*')
        .eq('is_active', true)
        .order('building', { ascending: true })
        .order('room_name', { ascending: true });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load study spaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_bookings')
        .select('*, study_spaces(*)')
        .eq('user_id', user?.id)
        .in('status', ['booked', 'checked_in'])
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setMyBookings(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaceBookings = async (spaceId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('study_bookings')
        .select('*')
        .eq('space_id', spaceId)
        .eq('booking_date', date)
        .in('status', ['booked', 'checked_in']);

      if (error) throw error;
      setSpaceBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const isSlotBooked = (startTime: string): boolean => {
    return spaceBookings.some(booking => booking.start_time === startTime);
  };

  const handleSpaceSelect = (space: StudySpace) => {
    setSelectedSpace(space);
    setSelectedStartTime(null);
    fetchSpaceBookings(space.id, selectedDate);
  };

  const handleDateChange = (increment: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + increment);
    const newDate = date.toISOString().split('T')[0];
    setSelectedDate(newDate);
    if (selectedSpace) {
      fetchSpaceBookings(selectedSpace.id, newDate);
    }
  };

  const handleBooking = async () => {
    if (!selectedSpace || !selectedStartTime) return;

    try {
      setBookingLoading(true);
      const startIndex = TIME_SLOTS.indexOf(selectedStartTime);
      const endTime = TIME_SLOTS[startIndex + 1] || '22:00';

      const { error } = await supabase.from('study_bookings').insert({
        space_id: selectedSpace.id,
        user_id: user?.id,
        booking_date: selectedDate,
        start_time: selectedStartTime,
        end_time: endTime,
        status: 'booked',
      });

      if (error) throw error;

      Alert.alert('Success', 'Room booked successfully');
      setSelectedSpace(null);
      setSelectedStartTime(null);
      fetchSpaceBookings(selectedSpace.id, selectedDate);
    } catch (error) {
      Alert.alert('Error', 'Failed to book room');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('study_bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

              if (error) throw error;
              Alert.alert('Success', 'Booking cancelled');
              fetchMyBookings();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const groupByBuilding = (spaces: StudySpace[]) => {
    return spaces.reduce((acc, space) => {
      if (!acc[space.building]) {
        acc[space.building] = [];
      }
      acc[space.building].push(space);
      return acc;
    }, {} as Record<string, StudySpace[]>);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderSpaceCard = (space: StudySpace) => (
    <TouchableOpacity
      key={space.id}
      style={styles.spaceCard}
      onPress={() => handleSpaceSelect(space)}
    >
      <View style={styles.spaceHeader}>
        <Text style={styles.roomName}>{space.room_name}</Text>
        <View style={styles.capacityBadge}>
          <Users size={14} color={COLORS.primary} />
          <Text style={styles.capacityText}>{space.capacity}</Text>
        </View>
      </View>
      <View style={styles.spaceInfo}>
        <MapPin size={16} color={COLORS.textSecondary} />
        <Text style={styles.buildingText}>{space.building}</Text>
      </View>
      {space.amenities && space.amenities.length > 0 && (
        <View style={styles.amenitiesContainer}>
          {space.amenities.map((amenity, index) => (
            <View key={index} style={styles.amenityTag}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSpacesTab = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    const groupedSpaces = groupByBuilding(spaces);

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.entries(groupedSpaces).map(([building, buildingSpaces]) => (
          <View key={building} style={styles.buildingSection}>
            <Text style={styles.buildingTitle}>{building}</Text>
            {buildingSpaces.map(renderSpaceCard)}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderBookingModal = () => {
    if (!selectedSpace) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book {selectedSpace.room_name}</Text>
            <TouchableOpacity onPress={() => setSelectedSpace(null)}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.dateSelector}>
              <TouchableOpacity
                onPress={() => handleDateChange(-1)}
                style={styles.dateButton}
                disabled={selectedDate === new Date().toISOString().split('T')[0]}
              >
                <Text style={styles.dateButtonText}>{'<'}</Text>
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Calendar size={18} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.dateButton}>
                <Text style={styles.dateButtonText}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Select Time Slot</Text>
            <View style={styles.timeSlotsGrid}>
              {TIME_SLOTS.map((slot) => {
                const booked = isSlotBooked(slot);
                const selected = selectedStartTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlot,
                      booked && styles.timeSlotBooked,
                      selected && styles.timeSlotSelected,
                    ]}
                    onPress={() => !booked && setSelectedStartTime(slot)}
                    disabled={booked}
                  >
                    <Clock
                      size={16}
                      color={booked ? COLORS.textTertiary : selected ? COLORS.white : COLORS.textPrimary}
                    />
                    <Text
                      style={[
                        styles.timeSlotText,
                        booked && styles.timeSlotTextBooked,
                        selected && styles.timeSlotTextSelected,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.bookButton,
                (!selectedStartTime || bookingLoading) && styles.bookButtonDisabled,
              ]}
              onPress={handleBooking}
              disabled={!selectedStartTime || bookingLoading}
            >
              {bookingLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.bookButtonText}>Book Room</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderMyBookingsTab = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (myBookings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Calendar size={48} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>No upcoming bookings</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {myBookings.map((booking) => (
          <View key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingRoomName}>{booking.study_spaces?.room_name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  booking.status === 'checked_in' && styles.statusBadgeCheckedIn,
                ]}
              >
                <Text style={styles.statusText}>{booking.status}</Text>
              </View>
            </View>
            <View style={styles.bookingInfo}>
              <MapPin size={16} color={COLORS.textSecondary} />
              <Text style={styles.bookingBuildingText}>{booking.study_spaces?.building}</Text>
            </View>
            <View style={styles.bookingDetails}>
              <View style={styles.bookingDetailItem}>
                <Calendar size={16} color={COLORS.textSecondary} />
                <Text style={styles.bookingDetailText}>{formatDate(booking.booking_date)}</Text>
              </View>
              <View style={styles.bookingDetailItem}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.bookingDetailText}>
                  {booking.start_time} - {booking.end_time}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(booking.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Rooms</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'spaces' && styles.tabActive]}
          onPress={() => setActiveTab('spaces')}
        >
          <Text style={[styles.tabText, activeTab === 'spaces' && styles.tabTextActive]}>
            Spaces
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'spaces' ? renderSpacesTab() : renderMyBookingsTab()}
      {selectedSpace && renderBookingModal()}
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
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
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
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
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontFamily: FONT.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
    marginTop: SPACING.md,
  },
  buildingSection: {
    marginTop: SPACING.lg,
  },
  buildingTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  spaceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  roomName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  capacityText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  spaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  buildingText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  amenityTag: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  amenityText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
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
  modalScroll: {
    padding: SPACING.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  dateButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
  },
  dateButtonText: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeSlotBooked: {
    backgroundColor: COLORS.borderLight,
    opacity: 0.5,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  timeSlotTextBooked: {
    color: COLORS.textTertiary,
  },
  timeSlotTextSelected: {
    color: COLORS.white,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    opacity: 0.5,
  },
  bookButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  bookingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bookingRoomName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  statusBadgeCheckedIn: {
    backgroundColor: COLORS.success + '20',
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  bookingBuildingText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  bookingDetails: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bookingDetailText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  cancelButton: {
    backgroundColor: COLORS.error + '10',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.error,
  },
});
