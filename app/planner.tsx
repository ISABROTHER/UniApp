import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  BookOpen,
  ClipboardList,
  Presentation,
  GraduationCap,
  Flag,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TIME_SLOT_HEIGHT = 60;
const DAY_COLUMN_WIDTH = (SCREEN_WIDTH - 60) / 3;
const START_HOUR = 6;
const END_HOUR = 22;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COURSE_COLORS = [
  '#4A90E2',
  '#16A34A',
  '#DC143C',
  '#F59E0B',
  '#7C3AED',
  '#0CC0B0',
  '#D946EF',
  '#EA580C',
];

const ASSIGNMENT_TYPES = [
  { value: 'assignment', label: 'Assignment', icon: FileText, color: COLORS.warning },
  { value: 'exam', label: 'Exam', icon: GraduationCap, color: COLORS.error },
  { value: 'quiz', label: 'Quiz', icon: BookOpen, color: COLORS.info },
  { value: 'project', label: 'Project', icon: ClipboardList, color: COLORS.success },
  { value: 'presentation', label: 'Presentation', icon: Presentation, color: COLORS.accent },
];

const STATUS_OPTIONS = ['pending', 'in_progress', 'submitted', 'completed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

interface TimetableEntry {
  id: string;
  course_code: string;
  course_name: string;
  lecturer: string;
  venue: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  notes?: string;
}

interface Assignment {
  id: string;
  title: string;
  course_code: string;
  type: string;
  due_date: string;
  due_time?: string;
  description?: string;
  status: string;
  priority: string;
  reminder_enabled: boolean;
}

interface ServiceSlot {
  id: string;
  service_type: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time?: string;
  status: string;
}

export default function PlannerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'week' | 'assignments' | 'add'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [serviceSlots, setServiceSlots] = useState<ServiceSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const scrollViewRef = useRef<ScrollView>(null);

  const [newCourse, setNewCourse] = useState({
    course_code: '',
    course_name: '',
    lecturer: '',
    venue: '',
    day_of_week: 0,
    start_time: '09:00',
    end_time: '10:00',
    color: COURSE_COLORS[0],
    notes: '',
  });

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    course_code: '',
    type: 'assignment',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '23:59',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'week' && scrollViewRef.current) {
      const currentHour = new Date().getHours();
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        const scrollPosition = (currentHour - START_HOUR) * TIME_SLOT_HEIGHT - 100;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
        }, 100);
      }
    }
  }, [activeTab]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [timetableRes, assignmentsRes, servicesRes] = await Promise.all([
        supabase.from('timetable_entries').select('*').eq('user_id', user.id),
        supabase.from('planner_assignments').select('*').eq('user_id', user.id),
        supabase.from('planner_service_slots').select('*').eq('user_id', user.id),
      ]);

      if (timetableRes.data) setTimetableEntries(timetableRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (servicesRes.data) setServiceSlots(servicesRes.data);
    } catch (error) {
      console.error('Error fetching planner data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  const currentTime = new Date();
  const currentDay = currentTime.getDay();
  const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;

  const dailyDigest = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayDayOfWeek = adjustedCurrentDay;

    const lectures = timetableEntries.filter(e => e.day_of_week === todayDayOfWeek).length;
    const assignmentsDue = assignments.filter(a => a.due_date === todayStr && a.status !== 'completed').length;
    const services = serviceSlots.filter(s => s.scheduled_date === todayStr && s.status === 'scheduled');

    return { lectures, assignmentsDue, services };
  }, [timetableEntries, assignments, serviceSlots, adjustedCurrentDay]);

  const assignmentsByDate = useMemo(() => {
    const byWeek: { [key: string]: Assignment[] } = {
      thisWeek: [],
      nextWeek: [],
      later: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

    assignments
      .filter(a => assignmentFilter === 'all' || a.status === assignmentFilter)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .forEach(assignment => {
        const dueDate = new Date(assignment.due_date);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate <= weekEnd) {
          byWeek.thisWeek.push(assignment);
        } else if (dueDate <= nextWeekEnd) {
          byWeek.nextWeek.push(assignment);
        } else {
          byWeek.later.push(assignment);
        }
      });

    return byWeek;
  }, [assignments, assignmentFilter]);

  const getAssignmentsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => a.due_date === dateStr);
  };

  const getServicesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return serviceSlots.filter(s => s.scheduled_date === dateStr);
  };

  const handleAddCourse = async () => {
    if (!user || !newCourse.course_code || !newCourse.course_name) {
      Alert.alert('Error', 'Please fill in course code and name');
      return;
    }

    try {
      const { error } = await supabase.from('timetable_entries').insert({
        user_id: user.id,
        ...newCourse,
      });

      if (error) throw error;

      Alert.alert('Success', 'Course added to timetable');
      setNewCourse({
        course_code: '',
        course_name: '',
        lecturer: '',
        venue: '',
        day_of_week: 0,
        start_time: '09:00',
        end_time: '10:00',
        color: COURSE_COLORS[0],
        notes: '',
      });
      fetchData();
      setActiveTab('week');
    } catch (error) {
      console.error('Error adding course:', error);
      Alert.alert('Error', 'Failed to add course');
    }
  };

  const handleAddAssignment = async () => {
    if (!user || !newAssignment.title) {
      Alert.alert('Error', 'Please fill in assignment title');
      return;
    }

    try {
      const { error } = await supabase.from('planner_assignments').insert({
        user_id: user.id,
        ...newAssignment,
        status: 'pending',
        reminder_enabled: true,
      });

      if (error) throw error;

      Alert.alert('Success', 'Assignment added');
      setNewAssignment({
        title: '',
        course_code: '',
        type: 'assignment',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '23:59',
        description: '',
        priority: 'medium',
      });
      fetchData();
      setActiveTab('assignments');
    } catch (error) {
      console.error('Error adding assignment:', error);
      Alert.alert('Error', 'Failed to add assignment');
    }
  };

  const handleUpdateAssignmentStatus = async (assignment: Assignment, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('planner_assignments')
        .update({ status: newStatus })
        .eq('id', assignment.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('timetable_entries').delete().eq('id', id);
      if (error) throw error;
      setSelectedEntry(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase.from('planner_assignments').delete().eq('id', id);
      if (error) throw error;
      setSelectedAssignment(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const renderTimeGrid = () => {
    const hours = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      hours.push(hour);
    }

    return (
      <View style={styles.gridContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.gridScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.gridContent}>
            {hours.map(hour => (
              <View key={hour} style={styles.timeRow}>
                <View style={styles.timeLabel}>
                  <Text style={styles.timeLabelText}>
                    {hour.toString().padStart(2, '0')}:00
                  </Text>
                </View>
                <View style={styles.dayColumns}>
                  {weekDates.map((date, dayIndex) => (
                    <View key={dayIndex} style={[styles.dayCell, dayIndex === adjustedCurrentDay && styles.todayCell]} />
                  ))}
                </View>
              </View>
            ))}
            {renderTimetableBlocks()}
            {renderServiceBlocks()}
            {renderCurrentTimeIndicator()}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderCurrentTimeIndicator = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour < START_HOUR || currentHour > END_HOUR) return null;

    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < weekStart || today > weekEnd) return null;

    const topOffset = ((currentHour - START_HOUR) * TIME_SLOT_HEIGHT) + ((currentMinute / 60) * TIME_SLOT_HEIGHT);
    const leftOffset = 50 + (adjustedCurrentDay * DAY_COLUMN_WIDTH);

    return (
      <View style={[styles.currentTimeIndicator, { top: topOffset, left: leftOffset, width: DAY_COLUMN_WIDTH }]}>
        <View style={styles.currentTimeDot} />
        <View style={styles.currentTimeLine} />
      </View>
    );
  };

  const renderTimetableBlocks = () => {
    return timetableEntries.map(entry => {
      const [startHour, startMinute] = entry.start_time.split(':').map(Number);
      const [endHour, endMinute] = entry.end_time.split(':').map(Number);

      if (startHour < START_HOUR || endHour > END_HOUR + 1) return null;

      const topOffset = ((startHour - START_HOUR) * TIME_SLOT_HEIGHT) + ((startMinute / 60) * TIME_SLOT_HEIGHT);
      const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      const height = (duration / 60) * TIME_SLOT_HEIGHT;
      const leftOffset = 50 + (entry.day_of_week * DAY_COLUMN_WIDTH);

      return (
        <TouchableOpacity
          key={entry.id}
          style={[
            styles.timetableBlock,
            {
              top: topOffset,
              left: leftOffset,
              height: height - 4,
              width: DAY_COLUMN_WIDTH - 8,
              backgroundColor: entry.color,
            },
          ]}
          onPress={() => setSelectedEntry(entry)}
        >
          <Text style={styles.blockCourseCode}>{entry.course_code}</Text>
          <Text style={styles.blockVenue}>{entry.venue}</Text>
          <Text style={styles.blockTime}>
            {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  const renderServiceBlocks = () => {
    return serviceSlots
      .filter(slot => slot.status === 'scheduled')
      .map(slot => {
        const slotDate = new Date(slot.scheduled_date);
        const dayIndex = weekDates.findIndex(
          date => date.toISOString().split('T')[0] === slot.scheduled_date
        );

        if (dayIndex === -1) return null;

        const [startHour, startMinute] = slot.scheduled_time.split(':').map(Number);
        const [endHour, endMinute] = slot.end_time?.split(':').map(Number) || [startHour + 1, startMinute];

        if (startHour < START_HOUR || startHour > END_HOUR) return null;

        const topOffset = ((startHour - START_HOUR) * TIME_SLOT_HEIGHT) + ((startMinute / 60) * TIME_SLOT_HEIGHT);
        const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        const height = Math.max((duration / 60) * TIME_SLOT_HEIGHT, 40);
        const leftOffset = 50 + (dayIndex * DAY_COLUMN_WIDTH);

        const serviceColor = getServiceColor(slot.service_type);

        return (
          <View
            key={slot.id}
            style={[
              styles.serviceBlock,
              {
                top: topOffset,
                left: leftOffset,
                height: height - 4,
                width: DAY_COLUMN_WIDTH - 8,
                backgroundColor: serviceColor + '20',
                borderColor: serviceColor,
              },
            ]}
          >
            <Text style={[styles.serviceBlockTitle, { color: serviceColor }]}>{slot.title}</Text>
          </View>
        );
      });
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'laundry_pickup':
      case 'laundry_delivery':
        return COLORS.info;
      case 'print_job':
        return COLORS.success;
      case 'food_order':
        return COLORS.warning;
      case 'study_room':
        return '#0CC0B0';
      default:
        return COLORS.accent;
    }
  };

  const renderWeekView = () => (
    <View style={styles.weekViewContainer}>
      {(dailyDigest.lectures > 0 || dailyDigest.assignmentsDue > 0 || dailyDigest.services.length > 0) && (
        <View style={styles.dailyDigestBanner}>
          <Text style={styles.dailyDigestText}>
            Today: {dailyDigest.lectures} lectures
            {dailyDigest.assignmentsDue > 0 && `, ${dailyDigest.assignmentsDue} assignment${dailyDigest.assignmentsDue > 1 ? 's' : ''} due`}
            {dailyDigest.services.length > 0 && `, ${dailyDigest.services[0].title}`}
          </Text>
        </View>
      )}

      <View style={styles.dayHeaders}>
        <View style={styles.timeHeaderPlaceholder} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayHeadersScroll}>
          {weekDates.map((date, index) => {
            const isToday = index === adjustedCurrentDay;
            const dayAssignments = getAssignmentsForDay(date);

            return (
              <View key={index} style={[styles.dayHeader, isToday && styles.todayHeader]}>
                <Text style={[styles.dayHeaderText, isToday && styles.todayHeaderText]}>
                  {DAYS[index]}
                </Text>
                <Text style={[styles.dayHeaderDate, isToday && styles.todayHeaderDate]}>
                  {date.getDate()}
                </Text>
                {dayAssignments.length > 0 && (
                  <View style={styles.assignmentMarkers}>
                    {dayAssignments.slice(0, 3).map((assignment, idx) => {
                      const typeConfig = ASSIGNMENT_TYPES.find(t => t.value === assignment.type);
                      return (
                        <View
                          key={idx}
                          style={[styles.assignmentMarker, { backgroundColor: typeConfig?.color || COLORS.primary }]}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {renderTimeGrid()}
    </View>
  );

  const renderAssignmentsTab = () => {
    const renderAssignmentCard = (assignment: Assignment) => {
      const typeConfig = ASSIGNMENT_TYPES.find(t => t.value === assignment.type);
      const TypeIcon = typeConfig?.icon || FileText;
      const dueDate = new Date(assignment.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let countdown = '';
      if (diffDays === 0) countdown = 'Today';
      else if (diffDays === 1) countdown = 'Tomorrow';
      else if (diffDays > 1) countdown = `in ${diffDays} days`;
      else countdown = 'Overdue';

      const nextStatus = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(assignment.status) + 1) % STATUS_OPTIONS.length];

      return (
        <TouchableOpacity
          key={assignment.id}
          style={styles.assignmentCard}
          onPress={() => setSelectedAssignment(assignment)}
        >
          <View style={styles.assignmentCardHeader}>
            <View style={[styles.assignmentTypeIcon, { backgroundColor: typeConfig?.color + '20' || COLORS.primary + '20' }]}>
              <TypeIcon size={20} color={typeConfig?.color || COLORS.primary} />
            </View>
            <View style={styles.assignmentCardInfo}>
              <Text style={styles.assignmentCardTitle}>{assignment.title}</Text>
              <Text style={styles.assignmentCardCourse}>{assignment.course_code}</Text>
            </View>
            <TouchableOpacity
              style={[styles.statusBadge, styles[`status${assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1).replace('_', '')}` as keyof typeof styles]]}
              onPress={() => handleUpdateAssignmentStatus(assignment, nextStatus)}
            >
              <Text style={styles.statusBadgeText}>
                {assignment.status.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.assignmentCardFooter}>
            <View style={styles.assignmentCardDate}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={styles.assignmentCardDateText}>
                {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={[styles.assignmentCountdown, diffDays < 0 && styles.assignmentOverdue]}>
                {countdown}
              </Text>
            </View>
            {assignment.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Flag size={12} color={COLORS.error} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <ScrollView style={styles.assignmentsContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.filterPills}>
          {['all', 'pending', 'in_progress', 'submitted'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, assignmentFilter === filter && styles.filterPillActive]}
              onPress={() => setAssignmentFilter(filter)}
            >
              <Text style={[styles.filterPillText, assignmentFilter === filter && styles.filterPillTextActive]}>
                {filter === 'all' ? 'All' : filter.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {assignmentsByDate.thisWeek.length > 0 && (
          <View style={styles.assignmentSection}>
            <Text style={styles.assignmentSectionTitle}>This Week</Text>
            {assignmentsByDate.thisWeek.map(renderAssignmentCard)}
          </View>
        )}

        {assignmentsByDate.nextWeek.length > 0 && (
          <View style={styles.assignmentSection}>
            <Text style={styles.assignmentSectionTitle}>Next Week</Text>
            {assignmentsByDate.nextWeek.map(renderAssignmentCard)}
          </View>
        )}

        {assignmentsByDate.later.length > 0 && (
          <View style={styles.assignmentSection}>
            <Text style={styles.assignmentSectionTitle}>Later</Text>
            {assignmentsByDate.later.map(renderAssignmentCard)}
          </View>
        )}

        {assignments.length === 0 && (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyStateText}>No assignments yet</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAddTab = () => (
    <ScrollView style={styles.addContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.addSection}>
        <Text style={styles.addSectionTitle}>Add Course</Text>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Course Code</Text>
          <TextInput
            style={styles.formInput}
            value={newCourse.course_code}
            onChangeText={text => setNewCourse({ ...newCourse, course_code: text })}
            placeholder="e.g., CS101"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Course Name</Text>
          <TextInput
            style={styles.formInput}
            value={newCourse.course_name}
            onChangeText={text => setNewCourse({ ...newCourse, course_name: text })}
            placeholder="e.g., Introduction to Programming"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Lecturer</Text>
          <TextInput
            style={styles.formInput}
            value={newCourse.lecturer}
            onChangeText={text => setNewCourse({ ...newCourse, lecturer: text })}
            placeholder="Lecturer name"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Venue</Text>
          <TextInput
            style={styles.formInput}
            value={newCourse.venue}
            onChangeText={text => setNewCourse({ ...newCourse, venue: text })}
            placeholder="e.g., Room 301"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
            {FULL_DAYS.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.dayOption, newCourse.day_of_week === index && styles.dayOptionActive]}
                onPress={() => setNewCourse({ ...newCourse, day_of_week: index })}
              >
                <Text style={[styles.dayOptionText, newCourse.day_of_week === index && styles.dayOptionTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.formLabel}>Start Time</Text>
            <TextInput
              style={styles.formInput}
              value={newCourse.start_time}
              onChangeText={text => setNewCourse({ ...newCourse, start_time: text })}
              placeholder="09:00"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.formLabel}>End Time</Text>
            <TextInput
              style={styles.formInput}
              value={newCourse.end_time}
              onChangeText={text => setNewCourse({ ...newCourse, end_time: text })}
              placeholder="10:00"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Color</Text>
          <View style={styles.colorPicker}>
            {COURSE_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  newCourse.color === color && styles.colorOptionActive,
                ]}
                onPress={() => setNewCourse({ ...newCourse, color })}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddCourse}>
          <Plus size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Course</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addSection}>
        <Text style={styles.addSectionTitle}>Add Assignment</Text>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={styles.formInput}
            value={newAssignment.title}
            onChangeText={text => setNewAssignment({ ...newAssignment, title: text })}
            placeholder="Assignment title"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Course Code</Text>
          <TextInput
            style={styles.formInput}
            value={newAssignment.course_code}
            onChangeText={text => setNewAssignment({ ...newAssignment, course_code: text })}
            placeholder="e.g., CS101"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.typePicker}>
            {ASSIGNMENT_TYPES.map(type => {
              const TypeIcon = type.icon;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    newAssignment.type === type.value && [styles.typeOptionActive, { borderColor: type.color }],
                  ]}
                  onPress={() => setNewAssignment({ ...newAssignment, type: type.value })}
                >
                  <TypeIcon size={20} color={newAssignment.type === type.value ? type.color : COLORS.textSecondary} />
                  <Text
                    style={[
                      styles.typeOptionText,
                      newAssignment.type === type.value && { color: type.color },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.formLabel}>Due Date</Text>
            <TextInput
              style={styles.formInput}
              value={newAssignment.due_date}
              onChangeText={text => setNewAssignment({ ...newAssignment, due_date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.formLabel}>Due Time</Text>
            <TextInput
              style={styles.formInput}
              value={newAssignment.due_time}
              onChangeText={text => setNewAssignment({ ...newAssignment, due_time: text })}
              placeholder="23:59"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Priority</Text>
          <View style={styles.priorityPicker}>
            {PRIORITY_OPTIONS.map(priority => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityOption,
                  newAssignment.priority === priority && styles.priorityOptionActive,
                ]}
                onPress={() => setNewAssignment({ ...newAssignment, priority })}
              >
                <Text
                  style={[
                    styles.priorityOptionText,
                    newAssignment.priority === priority && styles.priorityOptionTextActive,
                  ]}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            value={newAssignment.description}
            onChangeText={text => setNewAssignment({ ...newAssignment, description: text })}
            placeholder="Assignment details"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddAssignment}>
          <Plus size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Assignment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Planner</Text>
      </View>

      <View style={styles.weekHeader}>
        <TouchableOpacity style={styles.weekNavButton} onPress={goToPreviousWeek}>
          <ChevronLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.weekDisplay}>
          <Text style={styles.weekDisplayText}>
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {weekDates[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.weekNavButton} onPress={goToNextWeek}>
          <ChevronRight size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'week' && styles.tabActive]}
          onPress={() => setActiveTab('week')}
        >
          <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>Week View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assignments' && styles.tabActive]}
          onPress={() => setActiveTab('assignments')}
        >
          <Text style={[styles.tabText, activeTab === 'assignments' && styles.tabTextActive]}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>Add</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'week' && renderWeekView()}
      {activeTab === 'assignments' && renderAssignmentsTab()}
      {activeTab === 'add' && renderAddTab()}

      <Modal visible={selectedEntry !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Course Details</Text>
              <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedEntry && (
              <View style={styles.modalBody}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedEntry.color }]} />
                <Text style={styles.modalCourseCode}>{selectedEntry.course_code}</Text>
                <Text style={styles.modalCourseName}>{selectedEntry.course_name}</Text>
                <View style={styles.modalDetailRow}>
                  <Clock size={16} color={COLORS.textSecondary} />
                  <Text style={styles.modalDetailText}>
                    {selectedEntry.start_time.substring(0, 5)} - {selectedEntry.end_time.substring(0, 5)}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <MapPin size={16} color={COLORS.textSecondary} />
                  <Text style={styles.modalDetailText}>{selectedEntry.venue}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <BookOpen size={16} color={COLORS.textSecondary} />
                  <Text style={styles.modalDetailText}>{selectedEntry.lecturer}</Text>
                </View>
                {selectedEntry.notes && (
                  <View style={styles.modalNotes}>
                    <Text style={styles.modalNotesText}>{selectedEntry.notes}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    Alert.alert('Delete Course', 'Are you sure you want to delete this course?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteEntry(selectedEntry.id) },
                    ]);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete Course</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={selectedAssignment !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assignment Details</Text>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedAssignment && (
              <View style={styles.modalBody}>
                <Text style={styles.modalAssignmentTitle}>{selectedAssignment.title}</Text>
                <Text style={styles.modalAssignmentCourse}>{selectedAssignment.course_code}</Text>
                <View style={styles.modalDetailRow}>
                  <Calendar size={16} color={COLORS.textSecondary} />
                  <Text style={styles.modalDetailText}>
                    Due: {new Date(selectedAssignment.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {selectedAssignment.due_time && ` at ${selectedAssignment.due_time}`}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Flag size={16} color={COLORS.textSecondary} />
                  <Text style={styles.modalDetailText}>
                    Priority: {selectedAssignment.priority.charAt(0).toUpperCase() + selectedAssignment.priority.slice(1)}
                  </Text>
                </View>
                {selectedAssignment.description && (
                  <View style={styles.modalNotes}>
                    <Text style={styles.modalNotesText}>{selectedAssignment.description}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    Alert.alert('Delete Assignment', 'Are you sure you want to delete this assignment?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteAssignment(selectedAssignment.id) },
                    ]);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete Assignment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
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
    paddingTop: Platform.OS === 'web' ? 20 : 56,
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
    fontFamily: FONT.headingBold,
    color: COLORS.textPrimary,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekNavButton: {
    padding: SPACING.sm,
  },
  weekDisplay: {
    paddingHorizontal: SPACING.lg,
  },
  weekDisplayText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  todayButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  todayButtonText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
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
  weekViewContainer: {
    flex: 1,
  },
  dailyDigestBanner: {
    backgroundColor: COLORS.infoLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dailyDigestText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.info,
  },
  dayHeaders: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeHeaderPlaceholder: {
    width: 50,
  },
  dayHeadersScroll: {
    flex: 1,
  },
  dayHeader: {
    width: DAY_COLUMN_WIDTH,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayHeader: {
    backgroundColor: COLORS.primary + '10',
  },
  dayHeaderText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  todayHeaderText: {
    color: COLORS.primary,
  },
  dayHeaderDate: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  todayHeaderDate: {
    color: COLORS.primary,
  },
  assignmentMarkers: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  assignmentMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridContainer: {
    flex: 1,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    position: 'relative',
  },
  timeRow: {
    flexDirection: 'row',
    height: TIME_SLOT_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  timeLabel: {
    width: 50,
    paddingRight: SPACING.xs,
    paddingTop: SPACING.xs,
    alignItems: 'flex-end',
  },
  timeLabelText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  dayColumns: {
    flex: 1,
    flexDirection: 'row',
  },
  dayCell: {
    width: DAY_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
  },
  todayCell: {
    backgroundColor: COLORS.primary + '05',
  },
  timetableBlock: {
    position: 'absolute',
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  blockCourseCode: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  blockVenue: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.white,
    marginTop: 2,
    opacity: 0.9,
  },
  blockTime: {
    fontSize: 10,
    fontFamily: FONT.regular,
    color: COLORS.white,
    marginTop: 2,
    opacity: 0.8,
  },
  serviceBlock: {
    position: 'absolute',
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  serviceBlockTitle: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
  },
  currentTimeIndicator: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginLeft: -4,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.error,
  },
  assignmentsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterPills: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  assignmentSection: {
    padding: SPACING.md,
  },
  assignmentSectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  assignmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  assignmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  assignmentTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  assignmentCardInfo: {
    flex: 1,
  },
  assignmentCardTitle: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  assignmentCardCourse: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  statusPending: {
    backgroundColor: COLORS.textTertiary + '20',
  },
  statusInprogress: {
    backgroundColor: COLORS.info + '20',
  },
  statusSubmitted: {
    backgroundColor: COLORS.warning + '20',
  },
  statusCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  assignmentCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignmentCardDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignmentCardDateText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  assignmentCountdown: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.accent,
    marginLeft: 4,
  },
  assignmentOverdue: {
    color: COLORS.error,
  },
  priorityBadge: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginTop: SPACING.md,
  },
  addContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  addSectionTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dayPicker: {
    flexDirection: 'row',
  },
  dayOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
    marginRight: SPACING.sm,
  },
  dayOptionActive: {
    backgroundColor: COLORS.primary,
  },
  dayOptionText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  dayOptionTextActive: {
    color: COLORS.white,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: COLORS.textPrimary,
  },
  typePicker: {
    gap: SPACING.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  typeOptionActive: {
    borderWidth: 2,
    backgroundColor: COLORS.background,
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  priorityPicker: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  priorityOptionActive: {
    backgroundColor: COLORS.primary,
  },
  priorityOptionText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  priorityOptionTextActive: {
    color: COLORS.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    width: SCREEN_WIDTH - 48,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  modalBody: {
    padding: SPACING.md,
  },
  modalColorBar: {
    height: 4,
    borderRadius: RADIUS.xs,
    marginBottom: SPACING.md,
  },
  modalCourseCode: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalCourseName: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modalAssignmentTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalAssignmentCourse: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modalDetailText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  modalNotes: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
  },
  modalNotesText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: COLORS.error + '10',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.error,
  },
});
