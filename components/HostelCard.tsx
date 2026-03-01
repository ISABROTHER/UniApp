import { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated,
} from 'react-native';
import { COLORS, FONT, RADIUS } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { Heart, MapPin, XCircle, PlusCircle, CheckCircle2 } from 'lucide-react-native';

interface HostelCardProps {
  hostel: Hostel;
  onPress: () => void;
  onToggleFav: () => void;
  onToggleCompare?: () => void;
  isCompareSelected?: boolean;
  showCompare?: boolean;
}

export default function HostelCard({ 
  hostel, 
  onPress, 
  onToggleFav, 
  onToggleCompare, 
  isCompareSelected, 
  showCompare = false 
}: HostelCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const imageUrl = hostel.images?.[0]?.image_url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=400';
  const availableRooms = hostel.available_rooms ?? 0;
  const isAvailable = availableRooms > 0;
  const isSoldOut = !isAvailable;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, isSoldOut && styles.cardDisabled, isCompareSelected && styles.cardCompareHighlight]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={isSoldOut}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          
          {/* MODERN COMPARE PILL */}
          {showCompare && (
            <TouchableOpacity
              style={[styles.compareBtn, isCompareSelected && styles.compareBtnSelected]}
              onPress={(e) => {
                e.stopPropagation();
                onToggleCompare?.();
              }}
              activeOpacity={0.8}
            >
              {isCompareSelected ? (
                <>
                  <CheckCircle2 size={13} color={COLORS.white} />
                  <Text style={styles.compareTextSelected}>Added</Text>
                </>
              ) : (
                <>
                  <PlusCircle size={13} color={COLORS.white} />
                  <Text style={styles.compareText}>Compare</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* HEART BUTTON */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFav();
            }}
          >
            <Heart
              size={18}
              color={hostel.is_favourite ? COLORS.primary : COLORS.white}
              fill={hostel.is_favourite ? COLORS.primary : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow1}>
            <Text style={styles.cardName} numberOfLines={2}>{hostel.name}</Text>
            {isSoldOut ? (
              <View style={styles.soldOutBadge}>
                <XCircle size={12} color={COLORS.error} />
                <Text style={styles.soldOutText}>Fully booked</Text>
              </View>
            ) : (
              <View style={styles.availableBadge}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                </View>
                <Text style={styles.availableText}>
                  {availableRooms > 0 ? `${availableRooms} beds available` : 'Available'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardRow2}>
            <MapPin size={12} color={COLORS.textTertiary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {hostel.campus_proximity || hostel.address || 'Location'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardCompareHighlight: {
    borderColor: COLORS.primary,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardImageWrap: {
    position: 'relative',
    height: 140,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.borderLight,
  },
  compareBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 22, 34, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  compareBtnSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  compareText: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
    color: COLORS.white,
  },
  compareTextSelected: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: COLORS.white,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 12,
    gap: 8,
  },
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    flex: 1,
    flexShrink: 1,
    fontFamily: FONT.headingBold,
    fontSize: 16,
    color: COLORS.primary,
    lineHeight: 20,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  availableText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.success,
  },
  soldOutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soldOutText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.error,
  },
  cardRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});