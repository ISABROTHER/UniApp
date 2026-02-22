import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel, HostelReview } from '@/lib/types';
import { ArrowLeft, Heart, MapPin, Star, Users, CheckCircle, Calendar, ShieldCheck, MessageCircle, UserCheck } from 'lucide-react-native';
import ProtectedBookingBadge from '@/components/ProtectedBookingBadge';

const { width: SW } = Dimensions.get('window');

export default function DetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [reviews, setReviews] = useState<HostelReview[]>([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [activeImg, setActiveImg] = useState(0);
  const [roommateCount, setRoommateCount] = useState(0);

  const hostelId = params.id as string;

  useEffect(() => { if (hostelId) fetchHostel(); }, [hostelId]);

  const fetchHostel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('hostels')
      .select('*, hostel_images(*), hostel_amenities(*), hostel_rooms(*), owner_id')
      .eq('id', hostelId)
      .maybeSingle();

    if (data) {
      setHostel(data as Hostel);
      if (user) {
        const { data: fav } = await supabase.from('wishlists').select('id').eq('user_id', user.id).eq('hostel_id', hostelId).maybeSingle();
        setIsFavourite(!!fav);
      }
    }

    const { data: revs } = await supabase.from('reviews')
      .select('*, members(full_name, avatar_url)')
      .eq('hostel_id', hostelId)
      .order('created_at', { ascending: false })
      .limit(10);

    setReviews((revs as HostelReview[]) || []);

    const { count } = await supabase.from('roommate_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hostel_id', hostelId)
      .eq('is_active', true);
    setRoommateCount(count ?? 0);

    setLoading(false);
  };

  const toggleFavourite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isFavourite) {
      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('hostel_id', hostelId);
      setIsFavourite(false);
    } else {
      await supabase.from('wishlists').insert({ user_id: user.id, hostel_id: hostelId });
      setIsFavourite(true);
    }
  };

  if (loading || !hostel) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const images = hostel.images && hostel.images.length > 0
    ? hostel.images
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map(i => i.image_url || i.url || '')
    : ['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'];

  const amenities = hostel.amenities || [];
  const rooms = hostel.rooms || [];
  const lowestPrice = rooms.length > 0
    ? Math.min(...rooms.map((r: any) => r.price_per_night ?? r.price_per_month ?? 0))
    : hostel.price_range_min;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: images[activeImg] }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          {/* Back & Heart */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heartBtn, isFavourite && styles.heartBtnActive]} onPress={toggleFavourite} activeOpacity={0.85}>
            <Heart size={18} color={COLORS.white} fill={COLORS.white} />
          </TouchableOpacity>

          {/* Hostel name overlaid */}
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>{hostel.name}</Text>
          </View>

          {/* Thumbnail strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbsContainer}
            style={styles.thumbsRow}
          >
            {images.map((img, i) => (
              <TouchableOpacity key={i} onPress={() => setActiveImg(i)} activeOpacity={0.85}>
                <Image
                  source={{ uri: img }}
                  style={[styles.thumb, i === activeImg && styles.thumbActive]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <MapPin size={14} color={COLORS.textSecondary} />
            <Text style={styles.statMain}>{hostel.address?.split(',')[0] || 'Cape Coast'}</Text>
            <Text style={styles.statSub}>{hostel.campus_proximity}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users size={14} color={COLORS.textSecondary} />
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statMain}>{hostel.available_rooms}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statMain}>{hostel.rating.toFixed(1)} <Text style={styles.statSub}>/ 5</Text></Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              Reviews
            </Text>
            {reviews.length > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{reviews.length}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {activeTab === 'details' ? (
          <View style={styles.tabContent}>

            <Text style={styles.description}>{hostel.description || 'No description available.'}</Text>

            {rooms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Types</Text>
                {rooms.map((room: any) => (
                  <View key={room.id} style={styles.roomRow}>
                    <View style={styles.roomLeft}>
                      <Text style={styles.roomType}>{room.room_type}</Text>
                      {room.description && <Text style={styles.roomDesc}>{room.description}</Text>}
                      <Text style={styles.roomAvail}>{room.available_units ?? room.available_count ?? 0} available</Text>
                    </View>
                    <Text style={styles.roomPrice}>
                      GH₵{(room.price_per_night ?? room.price_per_month ?? 0).toLocaleString()}
                      <Text style={styles.roomPriceSub}>/mo</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {amenities.map((a: any, i: number) => (
                    <View key={i} style={styles.amenityPill}>
                      <View style={styles.amenityDot} />
                      <Text style={styles.amenityText}>{a.amenity || a.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {hostel.verified && (
              <View style={styles.verifiedRow}>
                <View style={styles.verifiedRowInner}>
                  <ShieldCheck size={18} color={COLORS.success} />
                  <Text style={styles.verifiedRowText}>Owner identity verified via Ghana Card</Text>
                </View>
                <ProtectedBookingBadge compact />
              </View>
            )}

            {roommateCount > 0 && (
              <TouchableOpacity
                style={styles.roommateRow}
                onPress={() => router.push(`/roommates?hostelId=${hostelId}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.roommateIconWrap}>
                  <UserCheck size={18} color={COLORS.accent} />
                </View>
                <View style={styles.roommateText}>
                  <Text style={styles.roommateTitle}>{roommateCount} student{roommateCount !== 1 ? 's' : ''} looking for a roommate here</Text>
                  <Text style={styles.rommmateSub}>Tap to find a compatible flatmate</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>{(rev.member?.full_name || 'S').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{rev.member?.full_name || 'Student'}</Text>
                      <Text style={styles.reviewDate}>{rev.created_at?.slice(0, 10)}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} color={i < rev.rating ? COLORS.gold : COLORS.border} fill={i < rev.rating ? COLORS.gold : COLORS.border} />
                      ))}
                    </View>
                  </View>
                  {rev.comment && <Text style={styles.reviewComment}>"{rev.comment}"</Text>}
                  {rev.is_verified_guest && (
                    <View style={styles.verifiedGuestTag}>
                      <CheckCircle size={10} color={COLORS.success} />
                      <Text style={styles.verifiedGuestText}>Verified Guest</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPrice}>GH₵{lowestPrice.toLocaleString()}</Text>
          <Text style={styles.bottomPriceSub}>from / month</Text>
        </View>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => router.push(`/chat?ownerId=${hostel?.owner_id}&name=${encodeURIComponent('Hostel Owner')}` as any)}
          activeOpacity={0.85}
        >
          <MessageCircle size={17} color={COLORS.accent} />
          <Text style={styles.msgBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push(`/book?id=${hostelId}` as any)}
          activeOpacity={0.85}
        >
          <Calendar size={17} color={COLORS.white} />
          <Text style={styles.bookBtnText}>Book a Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { fontFamily: FONT.regular, fontSize: 16, color: COLORS.textSecondary },

  heroWrap: { position: 'relative' },
  heroImage: { width: SW, height: 340 },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
    backgroundColor: 'transparent',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    left: SPACING.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    right: SPACING.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(180,180,190,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  heartBtnActive: { backgroundColor: COLORS.primary },
  heroTitleWrap: {
    position: 'absolute',
    bottom: 72,
    left: SPACING.md,
    right: SPACING.md,
  },
  heroTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 30,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  thumbsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  thumbsContainer: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  thumb: {
    width: 64, height: 48,
    borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  thumbActive: {
    borderColor: COLORS.white,
    borderWidth: 2.5,
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.borderLight },
  statLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  statMain: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  statSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
    gap: SPACING.xl,
  },
  tab: { paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.textPrimary },
  tabText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textTertiary },
  tabTextActive: { color: COLORS.textPrimary },
  tabBadge: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.full,
    width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  tabBadgeText: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.white },

  tabContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  description: {
    fontFamily: FONT.regular, fontSize: 14,
    color: COLORS.textSecondary, lineHeight: 22,
    marginBottom: SPACING.md,
  },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: SPACING.md },

  roomRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  roomLeft: { flex: 1, marginRight: SPACING.sm },
  roomType: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: 2 },
  roomDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  roomAvail: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  roomPrice: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.primary },
  roomPriceSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  amenityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  amenityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  amenityText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },

  verifiedRow: {
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  verifiedRowInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  verifiedRowText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.success, flex: 1 },

  roommateRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.infoLight, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  roommateIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  roommateText: { flex: 1 },
  roommateTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  rommmateSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.info, marginTop: 2 },

  noReviews: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textTertiary, fontStyle: 'italic', marginTop: SPACING.lg, textAlign: 'center' },
  reviewCard: { marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  reviewerInitial: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: 2 },
  reviewDate: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  verifiedGuestTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  verifiedGuestText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : 32,
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 8,
  },
  bottomPriceCol: { flex: 1 },
  bottomPrice: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.primary },
  bottomPriceSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  msgBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.accent,
  },
  msgBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.accent },
  bookBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingVertical: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  bookBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },
});
