import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, BookOpen, AlertCircle, Home, Clock } from 'lucide-react-native';

// Simulated dynamic timeline data tailored to UCC Academic & Housing cycles
const TIMELINE_EVENTS = [
  { 
    id: '1', 
    date: 'Sept 15, 2026', 
    title: 'First Semester Begins', 
    type: 'academic', 
    desc: 'Official reopening for all returning students.', 
    icon: BookOpen, 
    color: COLORS.info,
    bg: '#E0F2FE'
  },
  { 
    id: '2', 
    date: 'Sept 20, 2026', 
    title: 'Course Registration Deadline', 
    type: 'alert', 
    desc: 'Last day to register courses online without penalty.', 
    icon: AlertCircle, 
    color: COLORS.error,
    bg: '#FEE2E2'
  },
  { 
    id: '3', 
    date: 'Oct 01 - Oct 14', 
    title: 'Peak Booking Window', 
    type: 'housing', 
    desc: 'Hostels around campus fill up fastest during this 2-week window. Book early to secure your spot.', 
    icon: Home, 
    color: COLORS.primary,
    bg: '#E0E7FF'
  },
  { 
    id: '4', 
    date: 'Nov 12 - Nov 19', 
    title: 'SRC & Hall Week', 
    type: 'hall', 
    desc: 'Inter-hall sports, arts, culture events, and the famous campus parade.', 
    icon: MapPin, 
    color: COLORS.warning,
    bg: '#FEF3C7'
  },
  { 
    id: '5', 
    date: 'Dec 15, 2026', 
    title: 'End of Semester Exams', 
    type: 'academic', 
    desc: 'First semester examinations begin across all colleges.', 
    icon: BookOpen, 
    color: COLORS.info,
    bg: '#E0F2FE'
  },
];

export default function CalendarScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <CalendarIcon size={32} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Semester Timeline</Text>
          <Text style={styles.heroSub}>Stay ahead of deadlines, bookings, and campus events.</Text>
        </View>

        <View style={styles.timelineContainer}>
          {TIMELINE_EVENTS.map((event, index) => {
            const IconComponent = event.icon;
            const isLast = index === TIMELINE_EVENTS.length - 1;

            return (
              <View key={event.id} style={styles.timelineRow}>
                {/* Left Side: Time/Date */}
                <View style={styles.timeColumn}>
                  <Text style={styles.dateText}>{event.date.split(',')[0]}</Text>
                  {event.date.includes(',') && (
                    <Text style={styles.yearText}>{event.date.split(',')[1].trim()}</Text>
                  )}
                </View>

                {/* Middle: Node & Line */}
                <View style={styles.nodeColumn}>
                  <View style={[styles.node, { borderColor: event.color }]}>
                    <View style={[styles.nodeInner, { backgroundColor: event.color }]} />
                  </View>
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Right Side: Event Card */}
                <View style={styles.cardColumn}>
                  <View style={[styles.eventCard, { borderLeftColor: event.color }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrap, { backgroundColor: event.bg }]}>
                        <IconComponent size={16} color={event.color} />
                      </View>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                    </View>
                    <Text style={styles.eventDesc}>{event.desc}</Text>
                    
                    {event.type === 'housing' && (
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => router.push('/(tabs)/search' as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText}>Browse Hostels</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        
        <View style={styles.syncBanner}>
          <Clock size={20} color={COLORS.primary} />
          <View style={styles.syncTextWrap}>
            <Text style={styles.syncTitle}>Sync to Device</Text>
            <Text style={styles.syncSub}>Coming soon: Add these dates directly to your phone's calendar.</Text>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },

  content: { flex: 1 },
  
  heroSection: {
    backgroundColor: COLORS.navy,
    padding: SPACING.xl,
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  heroIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroTitle: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.white, marginBottom: 4 },
  heroSub: { fontFamily: FONT.regular, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  timelineContainer: {
    paddingHorizontal: SPACING.md,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: 80,
    alignItems: 'flex-end',
    paddingTop: 4,
    paddingRight: SPACING.sm,
  },
  dateText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' },
  yearText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, textAlign: 'right', marginTop: 2 },
  
  nodeColumn: {
    width: 24,
    alignItems: 'center',
  },
  node: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4, zIndex: 2,
  },
  nodeInner: {
    width: 6, height: 6, borderRadius: 3,
  },
  line: {
    width: 2, flex: 1,
    backgroundColor: COLORS.border,
    marginTop: -4, marginBottom: -4,
    zIndex: 1,
  },

  cardColumn: {
    flex: 1,
    paddingLeft: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  eventTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  eventDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  
  actionBtn: {
    marginTop: 12, backgroundColor: COLORS.primary,
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
  },
  actionBtnText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.white },

  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: `${COLORS.primary}10`,
    marginHorizontal: SPACING.md, marginTop: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  syncTextWrap: { flex: 1 },
  syncTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary, marginBottom: 2 },
  syncSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
});