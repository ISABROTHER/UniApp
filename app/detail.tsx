import { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel, HostelReview } from '@/lib/types';
import { ArrowLeft, Heart, MapPin, Star, Users, CheckCircle, Calendar, ShieldCheck, MessageCircle, UserCheck, Wifi, Shield, Droplet } from 'lucide-react-native';
import ProtectedBookingBadge from '@/components/ProtectedBookingBadge';

const { width: SW } = Dimensions.get('window');

export default function DetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [reviews, setReviews] = useState<HostelReview[]>([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'facilities' | 'others'>('details');
  const [activeImg, setActiveImg] = useState(0);
  const [roommateCount, setRoommateCount] = useState(0);
  const [autoSlide, setAutoSlide] = useState(true);
  const autoSlideInterval = useRef<NodeJS.Timeout | null>(null);

  const hostelId = params.id as string;

  const images = useMemo(() => {
    const fallbackImages = [
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
      'https://images.pexels.com/photos/2029667/pexels-photo-2029667.jpeg',
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
      'https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg',
      'https://images.pexels.com/photos/439391/pexels-photo-439391.jpeg',
    ];

    if (hostel?.images && hostel.images.length > 0) {
      const hostelImages = hostel.images
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map(i => i.image_url || i.url || '')
        .filter(url => url);
      
      if (hostelImages.length >= 7) {
        return hostelImages.slice(0, 7);
      }
      
      const combined = [...hostelImages];
      for (let i = hostelImages.length; i < 7; i++) {
        combined.push(fallbackImages[i]);
      }
      return combined;
    }
    
    return fallbackImages;
  }, [hostel?.images]);

  useEffect(() => { 
    if (hostelId) fetchHostel(); 
  }, [hostelId]);

  useEffect(() => {
    if (autoSlide && images.length > 1) {
      autoSlideInterval.current = setInterval(() => {
        setActiveImg((prev) => (prev + 1) % images.length);
      }, 2000);
    }

    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
      }
    };
  }, [autoSlide, images.length]);

  const fetchHostel = async () => {
    try {
      const [hostelRes, userRes] = await Promise.all([
        supabase.from('hostels')
          .select('*, hostel_images(*), hostel_amenities(*), hostel_rooms(*), owner_id')
          .eq('id', hostelId)
          .maybeSingle(),
        supabase.auth.getUser()
      ]);

      if (hostelRes.data) {
        setHostel(hostelRes.data as Hostel);
        
        if (userRes.data?.user) {
          const [favRes, reviewsRes, roommatesRes] = await Promise.all([
            supabase.from('favourites').select('id').eq('user_id', userRes.data.user.id).eq('hostel_id', hostelId).maybeSingle(),
            supabase.from('hostel_reviews')
              .select('*, members(full_name, avatar_url)')
              .eq('hostel_id', hostelId)
              .order('created_at', { ascending: false })
              .limit(10),
            supabase.from('roommate_profiles')
              .select('id', { count: 'exact', head: true })
              .eq('hostel_id', hostelId)
              .eq('is_active', true)
          ]);

          setIsFavourite(!!favRes.data);
          setReviews((reviewsRes.data as HostelReview[]) || []);
          setRoommateCount(roommatesRes.count ?? 0);
        }
      }
    } catch (error) {
      console.error('Error fetching hostel:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavourite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isFavourite) {
      await supabase.from('favourites').delete().eq('user_id', user.id).eq('hostel_id', hostelId);
      setIsFavourite(false);
    } else {
      await supabase.from('favourites').insert({ user_id: user.id, hostel_id: hostelId });
      setIsFavourite(true);
    }
  };

  const amenities = useMemo(() => hostel?.amenities || [], [hostel?.amenities]);
  const rooms = useMemo(() => hostel?.rooms || [], [hostel?.rooms]);

  if (loading || !hostel) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: images[activeImg] }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heartBtn, isFavourite && styles.heartBtnActive]} onPress={toggleFavourite} activeOpacity={0.85}>
            <Heart size={18} color={COLORS.white} fill={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>{hostel.name}</Text>
            <View style={styles.photoGrid}>
              {images.map((img, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => {
                    setActiveImg(i);
                    setAutoSlide(false);
                  }} 
                  activeOpacity={0.85}
                  style={[styles.photoBox, i === activeImg && styles.photoBoxActive]}
                >
                  <Image
                    source={{ uri: img }}
                    style={styles.photoBoxImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <MapPin size={14} color={COLORS.textSecondary} />
            <Text style={styles.statMain} numberOfLines={1}>{hostel.campus_proximity || hostel.address?.split(',')[0] || 'Cape Coast'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users size={14} color={COLORS.textSecondary} />
            <Text style={styles.statMain}>{hostel.available_rooms} beds available</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {(['details', 'reviews', 'facilities', 'others'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'details' ? 'Details' : tab === 'reviews' ? 'Reviews' : tab === 'facilities' ? 'Facilities' : 'Others'}
              </Text>
              {tab === 'reviews' && reviews.length > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{reviews.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'details' && (
          <View style={styles.tabContent}>
            <Text style={styles.description}>{hostel.description || 'No description available.'}</Text>

            {rooms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Types</Text>
                {rooms.map((room: any) => (
                  <View key={room.id} style={styles.roomRow}>
                    <View style={styles.roomLeft}>
                      <Text style={styles.roomType}>{room.room_type}</Text>
                      <Text style={styles.roomDesc}>{room.description || 'Standard room'}</Text>
                      {room.available_count > 0 && (
                        <Text style={styles.roomAvail}>{room.available_count} available</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.roomPrice}>GH₵{room.price_per_month || room.price_per_night || 0}</Text>
                      <Text style={styles.roomPriceSub}>/month</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {hostel.verified && (
              <View style={styles.verifiedRow}>
                <View style={styles.verifiedRowInner}>
                  <ShieldCheck size={18} color={COLORS.success} />
                  <Text style={styles.verifiedRowText}>Verified Hostel</Text>
                </View>
                <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLORS.success }}>
                  This hostel has been verified by our team
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why your booking is secured</Text>
              <ProtectedBookingBadge />
            </View>

            {roommateCount > 0 && (
              <TouchableOpacity
                style={styles.roommateRow}
                onPress={() => router.push(`/roommates?hostel_id=${hostelId}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.roommateIconWrap}>
                  <UserCheck size={20} color={COLORS.info} />
                </View>
                <View style={styles.roommateText}>
                  <Text style={styles.roommateTitle}>Find Roommates</Text>
                  <Text style={styles.rommmateSub}>{roommateCount} student{roommateCount !== 1 ? 's' : ''} looking for roommates here</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.tabContent}>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet</Text>
            ) : (
              reviews.map((review: HostelReview) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                        {review.member?.full_name?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{review.member?.full_name || 'Anonymous'}</Text>
                      <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          color={i < review.rating ? COLORS.warning : COLORS.border}
                          fill={i < review.rating ? COLORS.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>"{review.comment}"</Text>}
                  {review.verified_guest && (
                    <View style={styles.verifiedGuestTag}>
                      <CheckCircle size={12} color={COLORS.success} />
                      <Text style={styles.verifiedGuestText}>Verified Guest</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'facilities' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              {amenities.length > 0 ? (
                <View style={styles.amenitiesGrid}>
                  {amenities.map((amenity: any, idx: number) => (
                    <View key={idx} style={styles.amenityPill}>
                      <View style={styles.amenityDot} />
                      <Text style={styles.amenityText}>{amenity.name || amenity}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noReviews}>No amenities listed</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Facilities</Text>
              <View style={styles.facilitiesGrid}>
                {hostel.has_wifi && (
                  <View style={styles.facilityItem}>
                    <Wifi size={20} color={COLORS.primary} />
                    <Text style={styles.facilityText}>WiFi</Text>
                  </View>
                )}
                {hostel.has_security && (
                  <View style={styles.facilityItem}>
                    <Shield size={20} color={COLORS.primary} />
                    <Text style={styles.facilityText}>Security</Text>
                  </View>
                )}
                {hostel.has_laundry && (
                  <View style={styles.facilityItem}>
                    <Droplet size={20} color={COLORS.primary} />
                    <Text style={styles.facilityText}>Laundry</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'others' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.description}>{hostel.address || 'No address available'}</Text>
              <Text style={styles.description}>{hostel.campus_proximity || ''}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <Text style={styles.description}>View contact details after booking</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push(`/book?hostel_id=${hostelId}` as any)}
          activeOpacity={0.85}
        >
          <Calendar size={18} color={COLORS.white} />
          <Text style={styles.bookBtnText}>APPLY FOR HOUSING</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => router.push(`/chat?hostel_id=${hostelId}` as any)}
          activeOpacity={0.85}
        >
          <MessageCircle size={18} color={COLORS.accent} />
          <Text style={styles.msgBtnText}>Message</Text>
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
    bottom: 16,
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
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  photoBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  photoBoxActive: {
    borderColor: COLORS.white,
    borderWidth: 2.5,
  },
  photoBoxImage: {
    width: '100%',
    height: '100%',
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  statItem: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center', 
    gap: 6,
  },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.borderLight },
  statMain: { 
    fontFamily: FONT.semiBold, 
    fontSize: 13, 
    color: COLORS.textPrimary,
    flex: 1,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
    gap: SPACING.lg,
  },
  tab: { paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textTertiary },
  tabTextActive: { color: COLORS.primary },
  tabBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  tabBadgeText: { fontFamily: FONT.bold, fontSize: 10, color: COLORS.white },

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

  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  facilityItem: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  facilityText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 6,
  },

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
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : 32,
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 8,
  },
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
  bookBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
}); 