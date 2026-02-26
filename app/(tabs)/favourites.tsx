import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { Heart, MapPin, Star, ShieldCheck, BookOpen, TrendingUp } from 'lucide-react-native';
import { markOnboardingStep, awardPoints } from '@/hooks/useRetention';

const BG = '#ECEEF6';

export default function FavouritesScreen() {
  const router = useRouter();
  const [favourites, setFavourites] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavourites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('favourites')
        .select('hostel_id, hostels(*, hostel_images(*), hostel_rooms(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const hostels = (data || [])
        .map((w: any) => w.hostels)
        .filter(Boolean)
        .map((h: any) => ({
          ...h,
          images: h.hostel_images || [],
          rooms: h.hostel_rooms || [],
          is_favourite: true,
        })) as Hostel[];

      setFavourites(hostels);

      if (hostels.length > 0) {
        await markOnboardingStep(user.id, 'first_favourite');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchFavourites(); }, []));

  const removeFavourite = async (hostelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('favourites').delete().eq('user_id', user.id).eq('hostel_id', hostelId);
    setFavourites((prev) => prev.filter((h) => h.id !== hostelId));
  };

  const getImageUrl = (h: Hostel) => h.images?.[0]?.image_url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=400';

  if (!loading && favourites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Saved</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Heart size={56} color={COLORS.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No saved hostels yet</Text>
          <Text style={styles.emptyText}>Tap the heart icon on any hostel to save it here for quick access.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/search' as any)}>
            <Text style={styles.browseBtnText}>Browse Hostels</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Saved</Text>
        <Text style={styles.count}>{favourites.length} saved</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavourites(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
      >
        {favourites.map((hostel) => {
          const roomType = hostel.rooms?.[0]?.room_type ?? null;
          return (
            <TouchableOpacity key={hostel.id} style={styles.card} onPress={() => router.push(`/detail?id=${hostel.id}` as any)} activeOpacity={0.92}>
              <View style={styles.cardImageWrap}>
                <Image source={{ uri: getImageUrl(hostel) }} style={styles.cardImage} />
                {hostel.verified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={10} color={COLORS.white} strokeWidth={2.5} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.heartBtnActive}
                  onPress={(e) => { e.stopPropagation(); removeFavourite(hostel.id); }}
                  activeOpacity={0.85}
                >
                  <Heart size={16} color={COLORS.white} fill={COLORS.white} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{hostel.name}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={11} color={COLORS.primary} />
                  <Text style={styles.locationText} numberOfLines={1}>{hostel.campus_proximity}</Text>
                </View>
                {roomType && (
                  <View style={styles.roomTypeBadge}>
                    <Text style={styles.roomTypeText}>{roomType}</Text>
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <Text>
                    <Text style={styles.priceCurrency}>GH₵</Text>
                    <Text style={styles.priceAmount}>{hostel.price_range_min.toLocaleString()}</Text>
                    <Text style={styles.pricePer}>/mo</Text>
                  </Text>
                  <View style={styles.ratingRow}>
                    <Star size={13} color={COLORS.warning} fill={COLORS.warning} />
                    <Text style={styles.ratingText}>{hostel.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={(e) => { e.stopPropagation(); router.push(`/book?id=${hostel.id}` as any); }}
                  activeOpacity={0.85}
                >
                  <BookOpen size={13} color={COLORS.white} />
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pageTitle: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary },
  count: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  list: { padding: SPACING.md },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardImageWrap: { position: 'relative', width: 140 },
  cardImage: { width: 140, height: 170, backgroundColor: COLORS.borderLight },
  cardBody: { flex: 1, padding: SPACING.md, justifyContent: 'space-between' },
  cardName: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  locationText: { flex: 1, fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  roomTypeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 8,
  },
  roomTypeText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textPrimary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  priceCurrency: { fontFamily: FONT.bold, fontSize: 13, color: COLORS.primary },
  priceAmount: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.primary },
  pricePer: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },

  verifiedBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(22,22,34,0.72)',
    borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 4,
  },
  verifiedText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.white },
  heartBtnActive: {
    position: 'absolute', top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingVertical: 9,
  },
  bookBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 22, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  browseBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md },
  browseBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
});
