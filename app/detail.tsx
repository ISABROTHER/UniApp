import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel, HostelReview } from '@/lib/types';
import { ArrowLeft, Heart, MapPin, Star, Users, CheckCircle, Calendar, ShieldCheck, MessageCircle, UserCheck, Wifi, Shield, Droplet, Zap, Wind, Car, BookOpen, Tv, UtensilsCrossed, WashingMachine, Dumbbell, Waves, Trash2, Eye, DoorOpen, Building2, BedDouble, CreditCard, Info, ChevronDown, ChevronUp, FileText } from 'lucide-react-native';
import ProtectedBookingBadge from '@/components/ProtectedBookingBadge';

const { width: SW } = Dimensions.get('window');
const YEAR_MONTHS = 12;

const AMENITY_CATEGORIES: { key: string; label: string; icon: typeof Wifi; items: string[] }[] = [
  {
    key: 'connectivity',
    label: 'Connectivity',
    icon: Wifi,
    items: ['wifi'],
  },
  {
    key: 'security',
    label: 'Security & Safety',
    icon: Shield,
    items: ['security', 'cctv', 'gated compound', 'gated'],
  },
  {
    key: 'power',
    label: 'Power & Water',
    icon: Zap,
    items: ['electricity', 'generator', 'water', 'borehole'],
  },
  {
    key: 'comfort',
    label: 'Comfort',
    icon: Wind,
    items: ['air conditioning', 'ceiling fan', 'ac'],
  },
  {
    key: 'facilities',
    label: 'Shared Facilities',
    icon: BookOpen,
    items: ['study room', 'common room', 'kitchen', 'gym', 'swimming pool', 'parking', 'laundry', 'waste management'],
  },
];

function getAmenityIcon(amenity: string) {
  const a = amenity.toLowerCase();
  if (a.includes('wifi')) return Wifi;
  if (a.includes('security')) return Shield;
  if (a.includes('cctv')) return Eye;
  if (a.includes('gated')) return DoorOpen;
  if (a.includes('water') || a.includes('borehole')) return Droplet;
  if (a.includes('electricity') || a.includes('generator')) return Zap;
  if (a.includes('air conditioning') || a.includes('ac')) return Wind;
  if (a.includes('ceiling fan') || a.includes('fan')) return Wind;
  if (a.includes('study')) return BookOpen;
  if (a.includes('common')) return Tv;
  if (a.includes('kitchen')) return UtensilsCrossed;
  if (a.includes('laundry')) return WashingMachine;
  if (a.includes('gym')) return Dumbbell;
  if (a.includes('swimming') || a.includes('pool')) return Waves;
  if (a.includes('parking')) return Car;
  if (a.includes('waste')) return Trash2;
  return CheckCircle;
}

function getPricingTier(minPrice: number): { label: string; color: string; bg: string } {
  if (minPrice >= 900) return { label: 'Premium', color: '#7C3AED', bg: '#F3E8FF' };
  if (minPrice >= 500) return { label: 'Mid-Range', color: COLORS.accent, bg: '#E0F2FE' };
  return { label: 'Budget-Friendly', color: COLORS.success, bg: COLORS.successLight };
}

function getHostelType(amenities: string[]): string {
  const a = amenities.map(x => x.toLowerCase());
  const hasAC = a.some(x => x.includes('air conditioning') || x.includes('ac'));
  const hasPool = a.some(x => x.includes('pool'));
  const hasGym = a.some(x => x.includes('gym'));
  if (hasPool || (hasAC && hasGym)) return 'Luxury Private Hostel';
  if (hasAC) return 'Premium Private Hostel';
  return 'Standard Private Hostel';
}

export default function DetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [reviews, setReviews] = useState<HostelReview[]>([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'facilities' | 'others' | 'about'>('details');
  const [activeImg, setActiveImg] = useState(0);
  const [roommateCount, setRoommateCount] = useState(0);
  const [autoSlide, setAutoSlide] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [utilityView, setUtilityView] = useState<'included' | 'not_included'>('included');
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
        .map(i => i.image_url || '')
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
      }, 5000);
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
        const raw = hostelRes.data as any;
        const mapped = {
          ...raw,
          images: raw.hostel_images || [],
          rooms: raw.hostel_rooms || [],
          amenities: raw.hostel_amenities || [],
        };
        setHostel(mapped as Hostel);
        
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
  const amenityNames = useMemo(() => amenities.map((a: any) => (a.amenity || '').toLowerCase()), [amenities]);

  const pricingTier = useMemo(() => getPricingTier(hostel?.price_range_min || 0), [hostel?.price_range_min]);
  const hostelType = useMemo(() => getHostelType(amenityNames), [amenityNames]);

  const categorizedAmenities = useMemo(() => {
    return AMENITY_CATEGORIES.map(cat => {
      const matched = amenities.filter((a: any) => {
        const name = (a.amenity || '').toLowerCase();
        return cat.items.some(keyword => name.includes(keyword));
      });
      return { ...cat, matched };
    }).filter(cat => cat.matched.length > 0);
  }, [amenities]);

  const utilityInclusions = useMemo(() => {
    const included: string[] = [];
    const notIncluded: string[] = [];

    const hasWater = amenityNames.some(a => a.includes('water'));
    const hasElectricity = amenityNames.some(a => a.includes('electricity'));
    const hasGenerator = amenityNames.some(a => a.includes('generator'));
    const hasWifi = amenityNames.some(a => a.includes('wifi'));
    const hasBorehole = amenityNames.some(a => a.includes('borehole'));

    if (hasWater || hasBorehole) included.push('Water Supply');
    else notIncluded.push('Water Supply');

    if (hasElectricity) included.push('Electricity (24hr)');
    else notIncluded.push('Electricity (24hr)');

    if (hasGenerator) included.push('Generator Backup');
    else notIncluded.push('Generator Backup');

    if (hasWifi) included.push('Internet / WiFi');
    else notIncluded.push('Internet / WiFi');

    return { included, notIncluded };
  }, [amenityNames]);

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

        <View style={styles.infoStrip}>
          <View style={styles.infoStripItem}>
            <Building2 size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoStripText} numberOfLines={1}>{hostelType}</Text>
          </View>
          <View style={styles.infoStripDivider} />
          <View style={styles.infoStripItem}>
            <View style={[styles.tierBadge, { backgroundColor: pricingTier.bg }]}>
              <Text style={[styles.tierBadgeText, { color: pricingTier.color }]}>{pricingTier.label}</Text>
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
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={styles.statMain}>{hostel.rating} ({hostel.review_count})</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {(['details', 'reviews', 'facilities', 'others', 'about'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'details' ? 'Details' : tab === 'reviews' ? 'Reviews' : tab === 'facilities' ? 'Facilities' : tab === 'others' ? 'Others' : 'About'}
              </Text>
              {tab === 'reviews' && reviews.length > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{reviews.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'details' && (
          <View style={styles.tabContent}>
            <View style={styles.standardCard}>
              <View style={styles.standardCardHeader}>
                <BedDouble size={18} color={COLORS.primary} />
                <Text style={styles.standardCardTitle}>Room Types & Pricing</Text>
              </View>
              <View style={styles.pricingNote}>
                <Info size={12} color={COLORS.accent} />
                <Text style={styles.pricingNoteText}>Self-Contained = 1 person. Shared rooms split the annual rent equally among occupants.</Text>
              </View>
              {rooms.length > 0 ? (
                rooms.map((room: any) => {
                  const roomTypeLower = (room.room_type || '').toLowerCase();
                  const isSelfContained = roomTypeLower.includes('self-contained') || roomTypeLower.includes('self contained') || roomTypeLower.includes('studio');
                  let occupants = 1;
                  if (!isSelfContained) {
                    if (roomTypeLower.includes('4') || roomTypeLower.includes('quad')) occupants = 4;
                    else if (roomTypeLower.includes('3') || roomTypeLower.includes('triple')) occupants = 3;
                    else if (roomTypeLower.includes('chamber') || roomTypeLower.includes('single')) occupants = 1;
                    else occupants = 2;
                  }
                  const totalYearPrice = (room.price_per_month || 0) * YEAR_MONTHS;
                  const perPersonYear = occupants > 1 ? Math.round(totalYearPrice / occupants) : totalYearPrice;
                  const isExpanded = expandedRoom === room.id;
                  const displayName = isSelfContained ? 'Self-Contained (1 Person)' :
                    occupants === 1 ? `${room.room_type} (1 Person)` :
                    `${occupants} in a Room`;

                  return (
                    <TouchableOpacity
                      key={room.id}
                      style={styles.roomCard}
                      onPress={() => setExpandedRoom(isExpanded ? null : room.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.roomCardTop}>
                        <View style={styles.roomCardLeft}>
                          <Text style={styles.roomType}>{displayName}</Text>
                          <Text style={styles.roomDesc}>{room.description || 'Standard room'}</Text>
                          {room.available_count > 0 && (
                            <View style={styles.roomAvailBadge}>
                              <View style={styles.roomAvailDot} />
                              <Text style={styles.roomAvailText}>{room.available_count} of {room.total_count} available</Text>
                            </View>
                          )}
                          {room.available_count === 0 && (
                            <Text style={styles.roomSoldOut}>Fully booked</Text>
                          )}
                        </View>
                        <View style={styles.roomCardRight}>
                          <Text style={styles.roomPriceMain}>GH₵{perPersonYear.toLocaleString()}</Text>
                          <Text style={styles.roomPriceSub}>/year{occupants > 1 ? ' per person' : ''}</Text>
                          {isExpanded ? (
                            <ChevronUp size={16} color={COLORS.textTertiary} style={{ marginTop: 4 }} />
                          ) : (
                            <ChevronDown size={16} color={COLORS.textTertiary} style={{ marginTop: 4 }} />
                          )}
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.roomPricingBreakdown}>
                          <View style={styles.pricingRowLast}>
                            <View style={styles.pricingLabelWrap}>
                              <Calendar size={12} color={COLORS.textSecondary} />
                              <Text style={styles.pricingLabel}>Total Room Cost / Year</Text>
                            </View>
                            <Text style={styles.pricingValue}>GH₵{totalYearPrice.toLocaleString()}</Text>
                          </View>
                          {occupants > 1 && (
                            <View style={styles.pricingRowLast}>
                              <View style={styles.pricingLabelWrap}>
                                <Users size={12} color={COLORS.textSecondary} />
                                <Text style={styles.pricingLabel}>Split by {occupants} occupants</Text>
                              </View>
                              <Text style={[styles.pricingValue, { color: COLORS.primary }]}>GH₵{perPersonYear.toLocaleString()} each</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noDataText}>No room types listed yet</Text>
              )}
            </View>

            <View style={styles.standardCard}>
              <View style={styles.standardCardHeader}>
                <CreditCard size={18} color={COLORS.primary} />
                <Text style={styles.standardCardTitle}>Utilities & Cost Breakdown</Text>
              </View>
              <View style={styles.utilityToggleRow}>
                <TouchableOpacity
                  style={[styles.utilityToggleBtn, utilityView === 'included' && styles.utilityToggleBtnActive]}
                  onPress={() => setUtilityView('included')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.utilityToggleBtnText, utilityView === 'included' && styles.utilityToggleBtnTextActive]}>Included</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.utilityToggleBtn, utilityView === 'not_included' && styles.utilityToggleBtnActiveRed]}
                  onPress={() => setUtilityView('not_included')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.utilityToggleBtnText, utilityView === 'not_included' && styles.utilityToggleBtnTextActiveRed]}>Not Included</Text>
                </TouchableOpacity>
              </View>
              {utilityView === 'included' && (
                utilityInclusions.included.length > 0 ? (
                  utilityInclusions.included.map((item, idx) => (
                    <View key={idx} style={styles.utilityRow}>
                      <View style={styles.utilityIncludedDot} />
                      <Text style={styles.utilityIncludedText}>{item}</Text>
                      <View style={styles.utilityIncludedBadge}>
                        <Text style={styles.utilityIncludedBadgeText}>Included</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No utilities confirmed as included</Text>
                )
              )}
              {utilityView === 'not_included' && (
                utilityInclusions.notIncluded.length > 0 ? (
                  utilityInclusions.notIncluded.map((item, idx) => (
                    <View key={idx} style={styles.utilityRow}>
                      <View style={styles.utilityNotIncludedDot} />
                      <Text style={styles.utilityNotIncludedText}>{item}</Text>
                      <View style={styles.utilityNotIncludedBadge}>
                        <Text style={styles.utilityNotIncludedBadgeText}>Not included</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>All utilities are included in the rent</Text>
                )
              )}
            </View>

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
                  {review.is_verified_guest && (
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
            {categorizedAmenities.length > 0 ? (
              categorizedAmenities.map((cat) => {
                const IconComp = cat.icon;
                return (
                  <View key={cat.key} style={styles.amenityCategoryCard}>
                    <View style={styles.amenityCategoryHeader}>
                      <View style={styles.amenityCategoryIcon}>
                        <IconComp size={16} color={COLORS.primary} />
                      </View>
                      <Text style={styles.amenityCategoryTitle}>{cat.label}</Text>
                    </View>
                    <View style={styles.amenityCategoryItems}>
                      {cat.matched.map((amenity: any, idx: number) => {
                        const AIcon = getAmenityIcon(amenity.amenity || '');
                        return (
                          <View key={idx} style={styles.amenityItemRow}>
                            <AIcon size={15} color={COLORS.success} />
                            <Text style={styles.amenityItemText}>{amenity.amenity}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noDataText}>No amenities listed</Text>
            )}

            {amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {amenities.map((amenity: any, idx: number) => {
                    const AIcon = getAmenityIcon(amenity.amenity || '');
                    return (
                      <View key={idx} style={styles.amenityPill}>
                        <AIcon size={14} color={COLORS.primary} />
                        <Text style={styles.amenityText}>{amenity.amenity}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'others' && (
          <View style={styles.tabContent}>
            <View style={styles.standardCard}>
              <View style={styles.standardCardHeader}>
                <Building2 size={18} color={COLORS.primary} />
                <Text style={styles.standardCardTitle}>Hostel Overview</Text>
              </View>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Type</Text>
                  <Text style={styles.overviewValue}>{hostelType}</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Total Capacity</Text>
                  <Text style={styles.overviewValue}>{hostel.total_rooms} beds</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Available Now</Text>
                  <Text style={[styles.overviewValue, { color: COLORS.success }]}>{hostel.available_rooms} beds</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Price Range</Text>
                  <Text style={styles.overviewValue}>GH₵{hostel.price_range_min} – GH₵{hostel.price_range_max}</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Pricing Tier</Text>
                  <View style={[styles.tierBadge, { backgroundColor: pricingTier.bg }]}>
                    <Text style={[styles.tierBadgeText, { color: pricingTier.color }]}>{pricingTier.label}</Text>
                  </View>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Verification</Text>
                  <Text style={[styles.overviewValue, { color: hostel.verified ? COLORS.success : COLORS.textTertiary }]}>
                    {hostel.verified ? 'Verified ✓' : 'Not verified'}
                  </Text>
                </View>
              </View>
            </View>

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

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <View style={styles.standardCard}>
              <View style={styles.standardCardHeader}>
                <FileText size={18} color={COLORS.primary} />
                <Text style={styles.standardCardTitle}>About This Hostel</Text>
              </View>
              <Text style={styles.aboutText}>{hostel.description || 'No description available.'}</Text>
            </View>

            <View style={styles.standardCard}>
              <View style={styles.standardCardHeader}>
                <MapPin size={18} color={COLORS.primary} />
                <Text style={styles.standardCardTitle}>Address</Text>
              </View>
              <Text style={styles.aboutText}>{hostel.address || 'No address available'}</Text>
              {hostel.campus_proximity ? (
                <Text style={styles.aboutProximity}>{hostel.campus_proximity}</Text>
              ) : null}
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

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  infoStripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoStripDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  infoStripText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tierBadgeText: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
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
    fontSize: 12, 
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
    gap: SPACING.md,
  },
  tab: { paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textTertiary },
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

  standardCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  standardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  standardCardTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  pricingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  pricingNoteText: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.accent,
    flex: 1,
  },

  roomCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  roomCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  roomCardLeft: { flex: 1, marginRight: SPACING.sm },
  roomCardRight: { alignItems: 'flex-end' },
  roomType: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: 2 },
  roomDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  roomAvailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roomAvailDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success,
  },
  roomAvailText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  roomSoldOut: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.error },
  roomPriceMain: { fontFamily: FONT.bold, fontSize: 17, color: COLORS.primary },
  roomPriceSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  roomPricingBreakdown: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pricingRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pricingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingLabel: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pricingValue: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  utilityToggleRow: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  utilityToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  utilityToggleBtnActive: {
    backgroundColor: COLORS.success,
  },
  utilityToggleBtnActiveRed: {
    backgroundColor: COLORS.error,
  },
  utilityToggleBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  utilityToggleBtnTextActive: {
    color: COLORS.white,
  },
  utilityToggleBtnTextActiveRed: {
    color: COLORS.white,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 8,
  },
  utilityIncludedDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success,
  },
  utilityIncludedText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
  utilityIncludedBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  utilityIncludedBadgeText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.success,
  },
  utilityNotIncludedDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textTertiary,
  },
  utilityNotIncludedText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textTertiary,
    flex: 1,
  },
  utilityNotIncludedBadge: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  utilityNotIncludedBadgeText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.textTertiary,
  },

  noDataText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },

  amenityCategoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  amenityCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  amenityCategoryIcon: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  amenityCategoryTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  amenityCategoryItems: {
    gap: 6,
  },
  amenityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  amenityItemText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  amenityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  amenityText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },

  overviewGrid: {
    gap: 2,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  overviewLabel: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  overviewValue: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
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

  aboutText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  aboutProximity: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.accent,
    marginTop: SPACING.sm,
  },
});