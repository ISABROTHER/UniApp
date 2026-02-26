import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, Platform, RefreshControl, Dimensions, Modal,
  ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, ROOM_TYPES, AMENITIES_LIST } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { 
  Search, Heart, MapPin, SlidersHorizontal, X, 
  ArrowUpDown, Wifi, Shield, Droplet, Zap, Wind,
  CheckCircle2, XCircle, ChevronDown, RotateCcw, ShieldCheck
} from 'lucide-react-native';

const { width: SW, height: SH } = Dimensions.get('window');

type SortOption = 'best_match' | 'lowest_price' | 'most_beds' | 'closest' | 'verified_first';
type QuickFilter = 'verified' | 'wifi' | 'security' | 'near_campus' | 'water_247' | 'power_backup';

interface Filters {
  priceMin: number;
  priceMax: number;
  roomTypes: string[];
  amenities: string[];
  verifiedOnly: boolean;
  showSoldOut: boolean;
  sortBy: SortOption;
}

const AMENITY_ICONS: Record<string, any> = {
  'WiFi': Wifi,
  'Security': Shield,
  'Water (24hr)': Droplet,
  'Electricity (24hr)': Zap,
  'Air Conditioning': Wind,
  'Generator Backup': Zap,
};

const DEFAULT_FILTERS: Filters = {
  priceMin: 0,
  priceMax: 2000,
  roomTypes: [],
  amenities: [],
  verifiedOnly: false,
  showSoldOut: false,
  sortBy: 'best_match',
};

function HostelCard({ 
  hostel, 
  onPress, 
  onToggleFav,
  index 
}: { 
  hostel: Hostel; 
  onPress: () => void; 
  onToggleFav: () => void;
  index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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

  const imageUrl = hostel.images?.[0]?.image_url || hostel.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=400';
  const availableRooms = hostel.available_rooms ?? 0;
  const isAvailable = availableRooms > 0;
  const isSoldOut = !isAvailable;

  const cardColors = ['#FFFFFF', '#CCFFDD', '#CCE7FF'];
  const cardBgColor = cardColors[index % cardColors.length];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: cardBgColor }, isSoldOut && styles.cardDisabled]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={isSoldOut}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
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
                <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.liveDot} />
                </Animated.View>
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

function FilterSheet({ 
  visible, 
  onClose, 
  filters, 
  onApply 
}: { 
  visible: boolean; 
  onClose: () => void; 
  filters: Filters;
  onApply: (filters: Filters) => void;
}) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const slideAnim = useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
  };

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'best_match', label: 'Best match' },
    { key: 'verified_first', label: 'Verified first' },
    { key: 'lowest_price', label: 'Lowest price' },
    { key: 'most_beds', label: 'Most rooms available' },
    { key: 'closest', label: 'Closest to campus' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters & Sort</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.chipGrid}>
                {sortOptions.map((option) => {
                  const isSelected = localFilters.sortBy === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setLocalFilters(prev => ({ ...prev, sortBy: option.key }))}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range (GH₵/month)</Text>
              <View style={styles.priceRangeRow}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceInputLabel}>Min</Text>
                  <Text style={styles.priceInputValue}>{localFilters.priceMin}</Text>
                </View>
                <Text style={styles.priceSeparator}>—</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.priceInputLabel}>Max</Text>
                  <Text style={styles.priceInputValue}>{localFilters.priceMax}</Text>
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Room Type</Text>
              <View style={styles.chipGrid}>
                {ROOM_TYPES.filter(t => t !== 'All').map((type) => {
                  const isSelected = localFilters.roomTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          roomTypes: isSelected 
                            ? prev.roomTypes.filter(t => t !== type)
                            : [...prev.roomTypes, type]
                        }));
                      }}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Essential Amenities</Text>
              <View style={styles.chipGrid}>
                {['WiFi', 'Security', 'Water (24hr)', 'Electricity (24hr)', 'Generator Backup', 'Air Conditioning'].map((amenity) => {
                  const isSelected = localFilters.amenities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          amenities: isSelected
                            ? prev.amenities.filter(a => a !== amenity)
                            : [...prev.amenities, amenity]
                        }));
                      }}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {amenity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.filterSectionTitle}>Verified only</Text>
                <TouchableOpacity
                  style={[styles.toggle, localFilters.verifiedOnly && styles.toggleActive]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                >
                  <View style={[styles.toggleDot, localFilters.verifiedOnly && styles.toggleDotActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.filterSectionTitle}>Show fully booked</Text>
                <TouchableOpacity
                  style={[styles.toggle, localFilters.showSoldOut && styles.toggleActive]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, showSoldOut: !prev.showSoldOut }))}
                >
                  <View style={[styles.toggleDot, localFilters.showSoldOut && styles.toggleDotActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <RotateCcw size={18} color={COLORS.textSecondary} />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);

  const searchBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(searchBarAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: 100,
    }).start();
  }, []);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('hostels')
        .select(user ? '*, hostel_images(*), hostel_rooms(*), hostel_amenities(*), favourites!left(id,user_id)' : '*, hostel_images(*), hostel_rooms(*), hostel_amenities(*)')
        .eq('status', 'active')
        .order('verified', { ascending: false })
        .order('available_rooms', { ascending: false });

      const { data } = await query;

      const processed = (data || []).map((h: any) => ({
        ...h,
        images: h.hostel_images || [],
        rooms: h.hostel_rooms || [],
        amenities: h.hostel_amenities || [],
        is_favourite: user ? h.favourites?.some((w: any) => w.user_id === user.id) : false,
        favourites: undefined,
      })) as Hostel[];

      setHostels(processed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const toggleFavourite = async (hostelId: string, isFav: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isFav) {
      await supabase.from('favourites').delete().eq('user_id', user.id).eq('hostel_id', hostelId);
    } else {
      await supabase.from('favourites').insert({ user_id: user.id, hostel_id: hostelId });
    }
    setHostels((prev) => prev.map((h) => h.id === hostelId ? { ...h, is_favourite: !isFav } : h));
  };

  const toggleQuickFilter = (filter: QuickFilter) => {
    setQuickFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredAndSorted = useMemo(() => {
    let result = hostels.filter((h) => {
      const matchQuery = !query.trim() || 
        `${h.name} ${h.address} ${h.campus_proximity} ${h.description}`.toLowerCase().includes(query.toLowerCase());
      
      const matchPrice = h.price_range_min >= filters.priceMin && h.price_range_min <= filters.priceMax;
      
      const matchVerified = !filters.verifiedOnly || h.verified;
      
      const matchRoom = filters.roomTypes.length === 0 || 
        (h.rooms || []).some((r) => filters.roomTypes.includes(r.room_type));
      
      const isAvailable = (h.available_rooms ?? 0) > 0;
      const matchAvailability = filters.showSoldOut || isAvailable;

      const hostelAmenities = (h.amenities || []).map((a: any) => (a.amenity || a.name || '').toLowerCase());
      const matchQuick = quickFilters.every(qf => {
        if (qf === 'verified') return h.verified;
        if (qf === 'wifi') return hostelAmenities.some((a: string) => a.includes('wifi'));
        if (qf === 'security') return hostelAmenities.some((a: string) => a.includes('security'));
        if (qf === 'near_campus') return h.campus_proximity?.toLowerCase().includes('min');
        if (qf === 'water_247') return hostelAmenities.some((a: string) => a.includes('water'));
        if (qf === 'power_backup') return hostelAmenities.some((a: string) => a.includes('generator'));
        return true;
      });

      return matchQuery && matchPrice && matchVerified && matchRoom && matchAvailability && matchQuick;
    });

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'verified_first':
          if (a.verified !== b.verified) return a.verified ? -1 : 1;
          return (b.available_rooms || 0) - (a.available_rooms || 0);
        case 'lowest_price':
          return (a.price_range_min || 0) - (b.price_range_min || 0);
        case 'most_beds':
          return (b.available_rooms || 0) - (a.available_rooms || 0);
        default:
          if (a.verified !== b.verified) return a.verified ? -1 : 1;
          return (b.available_rooms || 0) - (a.available_rooms || 0);
      }
    });

    return result;
  }, [hostels, query, filters, quickFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priceMin !== DEFAULT_FILTERS.priceMin || filters.priceMax !== DEFAULT_FILTERS.priceMax) count++;
    if (filters.roomTypes.length > 0) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.verifiedOnly) count++;
    if (filters.showSoldOut) count++;
    if (filters.sortBy !== DEFAULT_FILTERS.sortBy) count++;
    return count;
  }, [filters]);

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Search</Text>
        <Animated.View 
          style={[
            styles.searchRow,
            {
              opacity: searchBarAnim,
              transform: [
                {
                  translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.searchBar}>
            <Search size={18} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hostels by name or location..."
              placeholderTextColor={COLORS.textTertiary}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} 
            onPress={() => setFilterSheetOpen(true)}
          >
            <SlidersHorizontal size={20} color={activeFilterCount > 0 ? COLORS.white : COLORS.textPrimary} />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersRow}
        >
          {([
            { key: 'verified', label: 'Verified' },
            { key: 'wifi', label: 'WiFi' },
            { key: 'security', label: 'Security' },
            { key: 'near_campus', label: 'Near campus' },
            { key: 'water_247', label: '24/7 Water' },
            { key: 'power_backup', label: 'Power backup' },
          ] as { key: QuickFilter; label: string }[]).map((qf) => (
            <TouchableOpacity
              key={qf.key}
              style={[
                styles.quickChip,
                quickFilters.includes(qf.key) && styles.quickChipActive
              ]}
              onPress={() => toggleQuickFilter(qf.key)}
            >
              <Text style={[
                styles.quickChipText,
                quickFilters.includes(qf.key) && styles.quickChipTextActive
              ]}>
                {qf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAndSorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <HostelCard
            hostel={item}
            onPress={() => router.push(`/detail?id=${item.id}` as any)}
            onToggleFav={() => toggleFavourite(item.id, !!item.is_favourite)}
            index={index}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHostels();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filteredAndSorted.length} hostel{filteredAndSorted.length !== 1 ? 's' : ''} found
          </Text>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Search size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No hostels found</Text>
              <Text style={styles.emptyText}>
                {activeFilterCount > 0 || quickFilters.length > 0
                  ? 'Try adjusting your filters'
                  : 'Try a different search'}
              </Text>
              {(activeFilterCount > 0 || quickFilters.length > 0) && (
                <TouchableOpacity
                  style={styles.resetFiltersBtn}
                  onPress={() => {
                    setFilters(DEFAULT_FILTERS);
                    setQuickFilters([]);
                  }}
                >
                  <Text style={styles.resetFiltersBtnText}>Reset all filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      <FilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F3F8',
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pageTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 28,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickFiltersRow: {
    gap: 8,
    paddingVertical: SPACING.sm,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickChipText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  quickChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  resultCount: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  resetFiltersBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  resetFiltersBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SH * 0.85,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sheetTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  filterSection: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterSectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  priceInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  priceInputLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  priceInputValue: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  priceSeparator: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  applyBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
});