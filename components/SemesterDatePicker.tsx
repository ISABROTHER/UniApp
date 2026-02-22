import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar, ChevronRight, Zap, X } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS, UCC_SEMESTERS, PEAK_BOOKING_WINDOWS } from '@/lib/constants';

interface Props {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return 'Select date';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isInPeakWindow(dateStr: string): boolean {
  if (!dateStr) return false;
  const month = new Date(dateStr + 'T00:00:00').getMonth() + 1;
  return PEAK_BOOKING_WINDOWS.some((w) => {
    if (w.monthStart <= w.monthEnd) return month >= w.monthStart && month <= w.monthEnd;
    return month >= w.monthStart || month <= w.monthEnd;
  });
}

function getPeakLabel(dateStr: string): string | null {
  if (!dateStr) return null;
  const month = new Date(dateStr + 'T00:00:00').getMonth() + 1;
  for (const w of PEAK_BOOKING_WINDOWS) {
    const inRange =
      w.monthStart <= w.monthEnd
        ? month >= w.monthStart && month <= w.monthEnd
        : month >= w.monthStart || month <= w.monthEnd;
    if (inRange) return w.label;
  }
  return null;
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn + 'T00:00:00');
  const d2 = new Date(checkOut + 'T00:00:00');
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

type Picking = 'checkin' | 'checkout' | null;

export default function SemesterDatePicker({ checkIn, checkOut, onChange }: Props) {
  const [picking, setPicking] = useState<Picking>(null);
  const nights = calcNights(checkIn, checkOut);
  const peakLabel = getPeakLabel(checkIn) || getPeakLabel(checkOut);
  const today = new Date().toISOString().slice(0, 10);

  function applySemester(sem: (typeof UCC_SEMESTERS)[0]) {
    onChange(sem.start, sem.end);
    setPicking(null);
  }

  function handleDateSelect(dateStr: string) {
    if (picking === 'checkin') {
      const newCheckOut = checkOut && checkOut > dateStr ? checkOut : addMonths(dateStr, 4);
      onChange(dateStr, newCheckOut);
      setPicking('checkout');
    } else if (picking === 'checkout') {
      if (dateStr > checkIn) {
        onChange(checkIn, dateStr);
        setPicking(null);
      }
    }
  }

  const calendarDays = generateCalendarDays(
    picking === 'checkin' ? checkIn : checkOut
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.datesRow}>
          <TouchableOpacity
            style={[styles.dateBox, picking === 'checkin' && styles.dateBoxActive]}
            onPress={() => setPicking('checkin')}
          >
            <Calendar size={14} color={COLORS.primary} />
            <View>
              <Text style={styles.dateBoxLabel}>Check-in</Text>
              <Text style={styles.dateBoxValue}>{formatDisplay(checkIn)}</Text>
            </View>
          </TouchableOpacity>

          <ChevronRight size={16} color={COLORS.textTertiary} />

          <TouchableOpacity
            style={[styles.dateBox, picking === 'checkout' && styles.dateBoxActive]}
            onPress={() => setPicking('checkout')}
          >
            <Calendar size={14} color={COLORS.primary} />
            <View>
              <Text style={styles.dateBoxLabel}>Check-out</Text>
              <Text style={styles.dateBoxValue}>{formatDisplay(checkOut)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {nights > 0 && (
          <Text style={styles.nightsText}>
            {nights} night{nights !== 1 ? 's' : ''}
            {nights >= 30 ? ` · ~${Math.round(nights / 30)} month${Math.round(nights / 30) !== 1 ? 's' : ''}` : ''}
          </Text>
        )}

        {peakLabel && (
          <View style={styles.peakBanner}>
            <Zap size={12} color={COLORS.warning} />
            <Text style={styles.peakText}>{peakLabel} — Book early to secure your room!</Text>
          </View>
        )}
      </View>

      <Modal
        visible={picking !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicking(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setPicking(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>
                {picking === 'checkin' ? 'Select Check-in Date' : 'Select Check-out Date'}
              </Text>
              <TouchableOpacity onPress={() => setPicking(null)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Quick Select — UCC Semesters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semesterScroll}>
              {UCC_SEMESTERS.map((sem) => (
                <TouchableOpacity key={sem.id} style={styles.semChip} onPress={() => applySemester(sem)}>
                  {sem.badge && (
                    <View style={styles.semBadge}>
                      <Text style={styles.semBadgeText}>{sem.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.semLabel}>{sem.label}</Text>
                  <Text style={styles.semDates}>
                    {formatDisplay(sem.start)} – {formatDisplay(sem.end)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Or Pick a Date</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.calGrid}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                  <Text key={d} style={styles.calDayHeader}>{d}</Text>
                ))}
                {calendarDays.map((day, i) => {
                  const isSelected =
                    (picking === 'checkin' && day === checkIn) ||
                    (picking === 'checkout' && day === checkOut);
                  const inRange =
                    day && checkIn && checkOut && day > checkIn && day < checkOut;
                  const isPast = day && day < today;
                  const isTooEarly =
                    picking === 'checkout' && day && day <= checkIn;

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.calDay,
                        isSelected && styles.calDaySelected,
                        inRange && styles.calDayInRange,
                        (isPast || isTooEarly) && styles.calDayDisabled,
                        !day && styles.calDayEmpty,
                      ]}
                      onPress={() => day && !isPast && !isTooEarly && handleDateSelect(day)}
                      disabled={!day || isPast || !!isTooEarly}
                    >
                      {day ? (
                        <Text
                          style={[
                            styles.calDayText,
                            isSelected && styles.calDayTextSelected,
                            (isPast || isTooEarly) && styles.calDayTextDisabled,
                          ]}
                        >
                          {new Date(day + 'T00:00:00').getDate()}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function generateCalendarDays(currentDateStr: string): (string | null)[] {
  const ref = currentDateStr
    ? new Date(currentDateStr + 'T00:00:00')
    : new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (string | null)[] = Array(startOffset).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month, d);
    days.push(dt.toISOString().slice(0, 10));
  }

  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  dateBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFaded,
  },
  dateBoxLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  dateBoxValue: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  nightsText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  peakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  peakText: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 12,
    color: '#92400E',
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  semesterScroll: {
    marginBottom: SPACING.md,
  },
  semChip: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    minWidth: 160,
  },
  semBadge: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  semBadgeText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.primary,
  },
  semLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  semDates: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayHeader: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.textTertiary,
    paddingVertical: SPACING.xs,
  },
  calDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  calDayEmpty: {
    backgroundColor: 'transparent',
  },
  calDaySelected: {
    backgroundColor: COLORS.primary,
  },
  calDayInRange: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: 0,
  },
  calDayDisabled: {
    opacity: 0.3,
  },
  calDayText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  calDayTextSelected: {
    color: COLORS.white,
    fontFamily: FONT.bold,
  },
  calDayTextDisabled: {
    color: COLORS.textTertiary,
  },
});
