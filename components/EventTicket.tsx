import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Circle, Path, Line } from 'react-native-svg';
import { Calendar, MapPin, Clock, Check, X } from 'lucide-react-native';
import { COLORS, FONT, SPACING } from '@/lib/constants';
import QRCode from '@/components/QRCode';

const { width: SCREEN_W } = Dimensions.get('window');
const TICKET_W = Math.min(SCREEN_W - SPACING.md * 2, 380);

export interface TicketData {
  id: string;
  event_name: string;
  event_date: string;
  venue: string;
  category: string;
  is_free: boolean;
  price: number | null;
  status: 'valid' | 'used' | 'expired';
  attendee_name: string;
  ticket_number: string;
}

const CATEGORY_THEMES: Record<string, { bg: string; accent: string; light: string }> = {
  Academic: { bg: '#0C4A6E', accent: '#38BDF8', light: '#E0F2FE' },
  Social: { bg: '#881337', accent: '#FB7185', light: '#FFE4E6' },
  Sports: { bg: '#14532D', accent: '#4ADE80', light: '#DCFCE7' },
  Career: { bg: '#78350F', accent: '#FBBF24', light: '#FEF3C7' },
  Cultural: { bg: '#581C87', accent: '#C084FC', light: '#F3E8FF' },
  'Hall Week': { bg: '#831843', accent: '#F472B6', light: '#FCE7F3' },
};

const DEFAULT_THEME = { bg: '#1E293B', accent: '#94A3B8', light: '#F1F5F9' };

function PerforationLine() {
  return (
    <View style={styles.perforation}>
      {Array.from({ length: 20 }).map((_, i) => (
        <View key={i} style={styles.perfDot} />
      ))}
    </View>
  );
}

function TicketNotch({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <View style={[styles.notch, side === 'left' ? styles.notchLeft : styles.notchRight, { backgroundColor: color }]} />
  );
}

interface EventTicketProps {
  ticket: TicketData;
  onPress?: () => void;
  compact?: boolean;
}

export default function EventTicket({ ticket, onPress, compact = false }: EventTicketProps) {
  const theme = CATEGORY_THEMES[ticket.category] || DEFAULT_THEME;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (ticket.status === 'valid') {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    }
  }, [ticket.status]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-TICKET_W, TICKET_W * 1.5],
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      year: date.getFullYear().toString(),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    };
  };

  const dateInfo = formatDate(ticket.event_date);
  const isValid = ticket.status === 'valid';
  const isUsed = ticket.status === 'used';
  const isExpired = ticket.status === 'expired';

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactTicket, { borderLeftColor: theme.accent }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.compactLeft}>
          <View style={[styles.compactDateBox, { backgroundColor: theme.bg }]}>
            <Text style={styles.compactDay}>{dateInfo.day}</Text>
            <Text style={styles.compactMonth}>{dateInfo.month}</Text>
          </View>
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>{ticket.event_name}</Text>
          <View style={styles.compactMeta}>
            <Clock size={11} color={COLORS.textTertiary} />
            <Text style={styles.compactMetaText}>{dateInfo.time}</Text>
            <MapPin size={11} color={COLORS.textTertiary} />
            <Text style={styles.compactMetaText} numberOfLines={1}>{ticket.venue}</Text>
          </View>
        </View>
        <View style={[
          styles.compactBadge,
          isValid && { backgroundColor: '#DCFCE7' },
          isUsed && { backgroundColor: '#F1F5F9' },
          isExpired && { backgroundColor: '#FEE2E2' },
        ]}>
          {isValid && <Check size={10} color="#16A34A" strokeWidth={3} />}
          {isUsed && <Check size={10} color="#64748B" strokeWidth={3} />}
          {isExpired && <X size={10} color="#DC2626" strokeWidth={3} />}
          <Text style={[
            styles.compactBadgeText,
            isValid && { color: '#16A34A' },
            isUsed && { color: '#64748B' },
            isExpired && { color: '#DC2626' },
          ]}>
            {ticket.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.ticketContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.ticketBody}>
        <TicketNotch side="left" color={COLORS.background} />
        <TicketNotch side="right" color={COLORS.background} />

        <View style={[styles.ticketHeader, { backgroundColor: theme.bg }]}>
          {isValid && (
            <Animated.View
              style={[styles.ticketShimmer, { transform: [{ translateX: shimmerTranslate }, { rotate: '15deg' }] }]}
              pointerEvents="none"
            />
          )}

          <View style={styles.headerLeft}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateDay}>{dateInfo.day}</Text>
              <Text style={styles.dateMonth}>{dateInfo.month}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.eventName} numberOfLines={2}>{ticket.event_name}</Text>
              <View style={styles.headerMeta}>
                <View style={[styles.categoryPill, { backgroundColor: `${theme.accent}30` }]}>
                  <Text style={[styles.categoryText, { color: theme.accent }]}>{ticket.category}</Text>
                </View>
                {!ticket.is_free && ticket.price && (
                  <View style={styles.pricePill}>
                    <Text style={styles.priceText}>GHS {ticket.price.toFixed(2)}</Text>
                  </View>
                )}
                {ticket.is_free && (
                  <View style={[styles.pricePill, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
                    <Text style={[styles.priceText, { color: '#22C55E' }]}>FREE</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {(isUsed || isExpired) && (
            <View style={styles.statusStamp}>
              <View style={[
                styles.stampCircle,
                isUsed && { borderColor: 'rgba(255,255,255,0.4)' },
                isExpired && { borderColor: 'rgba(220,38,38,0.6)' },
              ]}>
                <Text style={[
                  styles.stampText,
                  isUsed && { color: 'rgba(255,255,255,0.5)' },
                  isExpired && { color: 'rgba(220,38,38,0.7)' },
                ]}>
                  {isUsed ? 'USED' : 'EXPIRED'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <PerforationLine />

        <View style={styles.ticketStub}>
          <View style={styles.stubLeft}>
            <View style={styles.stubRow}>
              <Clock size={12} color={COLORS.textSecondary} />
              <Text style={styles.stubText}>{dateInfo.weekday} {dateInfo.time}</Text>
            </View>
            <View style={styles.stubRow}>
              <MapPin size={12} color={COLORS.textSecondary} />
              <Text style={styles.stubText} numberOfLines={1}>{ticket.venue}</Text>
            </View>
            <View style={styles.stubDetailRow}>
              <View style={styles.stubField}>
                <Text style={styles.stubLabel}>ATTENDEE</Text>
                <Text style={styles.stubValue} numberOfLines={1}>{ticket.attendee_name}</Text>
              </View>
              <View style={styles.stubField}>
                <Text style={styles.stubLabel}>TICKET NO.</Text>
                <Text style={styles.stubValueMono}>{ticket.ticket_number}</Text>
              </View>
            </View>
          </View>
          <View style={styles.stubQR}>
            <View style={[styles.qrBox, !isValid && styles.qrBoxDisabled]}>
              <QRCode
                value={`TICKET-${ticket.id}-${ticket.ticket_number}`}
                size={64}
                color={isValid ? theme.bg : '#CBD5E1'}
                bg="#FFFFFF"
              />
            </View>
            {isValid && <Text style={styles.qrHint}>SCAN</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ticketContainer: {
    width: TICKET_W,
    marginBottom: SPACING.md,
  },
  ticketBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  ticketHeader: {
    padding: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ticketShimmer: {
    position: 'absolute',
    top: -20,
    width: 30,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 9,
    fontFamily: FONT.semiBold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eventName: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 20,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: FONT.semiBold,
    letterSpacing: 0.3,
  },
  pricePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  priceText: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },
  statusStamp: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  stampCircle: {
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '-12deg' }],
  },
  stampText: {
    fontSize: 10,
    fontFamily: FONT.bold,
    letterSpacing: 1.5,
  },
  perforation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  perfDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.background,
  },
  notch: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 10,
    top: '50%',
    marginTop: -10,
  },
  notchLeft: {
    left: -10,
  },
  notchRight: {
    right: -10,
  },
  ticketStub: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  stubLeft: {
    flex: 1,
    gap: 6,
  },
  stubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stubText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    flex: 1,
  },
  stubDetailRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  stubField: {},
  stubLabel: {
    fontSize: 7,
    fontFamily: FONT.semiBold,
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  stubValue: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  stubValueMono: {
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  stubQR: {
    alignItems: 'center',
    marginLeft: 10,
  },
  qrBox: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrBoxDisabled: {
    opacity: 0.4,
  },
  qrHint: {
    fontSize: 7,
    fontFamily: FONT.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
    marginTop: 3,
  },

  compactTicket: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  compactLeft: {
    marginRight: 10,
  },
  compactDateBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDay: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    lineHeight: 17,
  },
  compactMonth: {
    fontSize: 7,
    fontFamily: FONT.semiBold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMetaText: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    marginRight: 6,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactBadgeText: {
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
});
