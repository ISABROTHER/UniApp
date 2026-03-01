import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bus, Clock, MapPin, Calendar } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface Schedule {
  weekdays: {
    start: string;
    end: string;
    interval_min: number;
  };
  weekends: {
    start: string;
    end: string;
    interval_min: number;
  };
}

interface ShuttleRoute {
  id: string;
  university: string;
  route_name: string;
  stops: Stop[];
  schedule: Schedule;
  is_active: boolean;
}

export default function ShuttleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchRoutes();
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('shuttle_routes')
        .select('*')
        .eq('is_active', true)
        .order('route_name');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  const isWeekend = () => {
    const day = currentTime.getDay();
    return day === 0 || day === 6;
  };

  const getCurrentSchedule = (schedule: Schedule) => {
    return isWeekend() ? schedule.weekends : schedule.weekdays;
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const calculateNextArrival = (schedule: Schedule) => {
    const currentSchedule = getCurrentSchedule(schedule);
    const startTime = parseTime(currentSchedule.start);
    const endTime = parseTime(currentSchedule.end);
    const now = currentTime;

    if (now < startTime) {
      const diff = Math.floor((startTime.getTime() - now.getTime()) / 60000);
      return { minutes: diff, status: 'starts' };
    }

    if (now > endTime) {
      return { minutes: null, status: 'ended' };
    }

    const minutesSinceStart = Math.floor((now.getTime() - startTime.getTime()) / 60000);
    const nextArrivalOffset = currentSchedule.interval_min - (minutesSinceStart % currentSchedule.interval_min);

    return { minutes: nextArrivalOffset, status: 'active' };
  };

  const calculateStopETA = (schedule: Schedule, stopIndex: number, totalStops: number) => {
    const arrival = calculateNextArrival(schedule);
    if (arrival.status !== 'active' || arrival.minutes === null) return arrival;

    const timePerStop = 2;
    const additionalTime = stopIndex * timePerStop;

    return { minutes: arrival.minutes + additionalTime, status: 'active' };
  };

  const RouteCard = ({ route }: { route: ShuttleRoute }) => {
    const currentSchedule = getCurrentSchedule(route.schedule);
    const nextArrival = calculateNextArrival(route.schedule);
    const isExpanded = expandedRoute === route.id;

    return (
      <View style={styles.routeCard}>
        <TouchableOpacity
          onPress={() => setExpandedRoute(isExpanded ? null : route.id)}
          activeOpacity={0.7}
        >
          <View style={styles.routeHeader}>
            <View style={styles.routeIconContainer}>
              <Bus size={24} color={COLORS.white} />
            </View>
            <View style={styles.routeHeaderText}>
              <Text style={styles.routeName}>{route.route_name}</Text>
              <Text style={styles.routeStops}>
                {route.stops.length} stops • {isWeekend() ? 'Weekend' : 'Weekday'} schedule
              </Text>
            </View>
          </View>

          {nextArrival.status === 'active' && nextArrival.minutes !== null && (
            <View style={styles.nextArrivalBanner}>
              <Clock size={16} color={COLORS.white} />
              <Text style={styles.nextArrivalText}>
                Next shuttle in {nextArrival.minutes} {nextArrival.minutes === 1 ? 'minute' : 'minutes'}
              </Text>
            </View>
          )}

          {nextArrival.status === 'starts' && nextArrival.minutes !== null && (
            <View style={[styles.nextArrivalBanner, { backgroundColor: COLORS.warning }]}>
              <Clock size={16} color={COLORS.white} />
              <Text style={styles.nextArrivalText}>
                Starts in {nextArrival.minutes} {nextArrival.minutes === 1 ? 'minute' : 'minutes'}
              </Text>
            </View>
          )}

          {nextArrival.status === 'ended' && (
            <View style={[styles.nextArrivalBanner, { backgroundColor: COLORS.textSecondary }]}>
              <Clock size={16} color={COLORS.white} />
              <Text style={styles.nextArrivalText}>Service ended for today</Text>
            </View>
          )}

          <View style={styles.scheduleInfo}>
            <View style={styles.scheduleItem}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Text style={styles.scheduleText}>
                Every {currentSchedule.interval_min} min
              </Text>
            </View>
            <View style={styles.scheduleItem}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={styles.scheduleText}>
                {currentSchedule.start} - {currentSchedule.end}
              </Text>
            </View>
          </View>

          <View style={styles.stopsVisualization}>
            {route.stops.map((stop, index) => (
              <View key={index} style={styles.stopVisualItem}>
                <View style={styles.stopDotContainer}>
                  <View style={[
                    styles.stopDot,
                    index === 0 && styles.stopDotFirst,
                    index === route.stops.length - 1 && styles.stopDotLast
                  ]} />
                  {index < route.stops.length - 1 && <View style={styles.stopLine} />}
                </View>
                <Text style={styles.stopVisualName} numberOfLines={1}>
                  {stop.name}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            <Text style={styles.expandedTitle}>All Stops with Estimated Arrival</Text>
            {route.stops.map((stop, index) => {
              const eta = calculateStopETA(route.schedule, index, route.stops.length);
              return (
                <View key={index} style={styles.stopDetailItem}>
                  <View style={styles.stopDetailLeft}>
                    <View style={styles.stopDetailDotContainer}>
                      <View style={[
                        styles.stopDetailDot,
                        index === 0 && styles.stopDetailDotFirst,
                        index === route.stops.length - 1 && styles.stopDetailDotLast
                      ]} />
                      {index < route.stops.length - 1 && (
                        <View style={styles.stopDetailLine} />
                      )}
                    </View>
                    <View style={styles.stopDetailInfo}>
                      <Text style={styles.stopDetailName}>{stop.name}</Text>
                      <View style={styles.stopDetailCoords}>
                        <MapPin size={10} color={COLORS.textTertiary} />
                        <Text style={styles.stopDetailCoordsText}>
                          {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {eta.status === 'active' && eta.minutes !== null && (
                    <View style={styles.etaBadge}>
                      <Text style={styles.etaText}>{eta.minutes} min</Text>
                    </View>
                  )}
                  {eta.status === 'ended' && (
                    <View style={[styles.etaBadge, { backgroundColor: COLORS.borderLight }]}>
                      <Text style={[styles.etaText, { color: COLORS.textTertiary }]}>
                        Ended
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.scheduleDetail}>
              <Text style={styles.scheduleDetailTitle}>Full Schedule</Text>
              <View style={styles.scheduleDetailRow}>
                <Text style={styles.scheduleDetailLabel}>Weekdays:</Text>
                <Text style={styles.scheduleDetailValue}>
                  {route.schedule.weekdays.start} - {route.schedule.weekdays.end} (Every {route.schedule.weekdays.interval_min} min)
                </Text>
              </View>
              <View style={styles.scheduleDetailRow}>
                <Text style={styles.scheduleDetailLabel}>Weekends:</Text>
                <Text style={styles.scheduleDetailValue}>
                  {route.schedule.weekends.start} - {route.schedule.weekends.end} (Every {route.schedule.weekends.interval_min} min)
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campus Shuttle</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Shuttle</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <Bus size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Routes</Text>
            <Text style={styles.emptyText}>
              There are currently no active shuttle routes available.
            </Text>
          </View>
        ) : (
          routes.map((route) => <RouteCard key={route.id} route={route} />)
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl + 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeHeaderText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  routeName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  routeStops: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  nextArrivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  nextArrivalText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  scheduleInfo: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  stopsVisualization: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
  },
  stopVisualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stopDotContainer: {
    alignItems: 'center',
    width: 20,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    zIndex: 1,
  },
  stopDotFirst: {
    backgroundColor: COLORS.success,
  },
  stopDotLast: {
    backgroundColor: COLORS.primary,
  },
  stopLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginTop: -5,
  },
  stopVisualName: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  expandedContent: {
    marginTop: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  expandedTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  stopDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  stopDetailLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  stopDetailDotContainer: {
    alignItems: 'center',
    width: 24,
    paddingTop: 4,
  },
  stopDetailDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    zIndex: 1,
  },
  stopDetailDotFirst: {
    backgroundColor: COLORS.success,
  },
  stopDetailDotLast: {
    backgroundColor: COLORS.primary,
  },
  stopDetailLine: {
    width: 2,
    height: 32,
    backgroundColor: COLORS.border,
    marginTop: -4,
  },
  stopDetailInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  stopDetailName: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  stopDetailCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stopDetailCoordsText: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginLeft: 4,
  },
  etaBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xs,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  etaText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  scheduleDetail: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  scheduleDetailTitle: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  scheduleDetailRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  scheduleDetailLabel: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    width: 80,
  },
  scheduleDetailValue: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
