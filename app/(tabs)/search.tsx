import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, Platform, RefreshControl, Dimensions, Modal,
  ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { 
  Search, Heart, Star, MapPin, SlidersHorizontal, X, 
  ArrowUpDown, Wifi, Lock, Coffee, UtensilsCrossed, Wind,
  Users, CheckCircle2, XCircle, ChevronDown, RotateCcw
} from 'lucide-react-native';

const { width: SW, height: SH } = Dimensions.get('window');

type SortOption = 'best_match' | 'lowest_price' | 'highest_rating' | 'closest' | 'most_beds';
type QuickFilter = 'free_cancellation' | 'breakfast' | 'near_center' | 'private' | 'high_rating' | 'lockers' | 'female_dorms';

interface Filters {
  priceMin: number;
  priceMax: number;
  roomTypes: string[];
  minRating: number;
  amenities: string[];
  showSoldOut: boolean;
}

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  lockers: Lock,
  breakfast: Coffee,
  kitchen: UtensilsCrossed,
  ac: Wind,
};

const DEFAULT_FILTERS: Filters = {
  priceMin: 0,
  priceMax: 1000,
  roomTypes: [],
  minRating: 0,
  amenities: [],
  showSoldOut: false,
};

function HostelCard({ 
  hostel, 
  onPress, 
  onToggleFav 
}: { 
  hostel: Hostel; 
  onPress: () => void; 
  onToggleFav: () => void;
}) {
  const imageUrl = hostel.images?.[0]?.image_url || hostel.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=400';
  const availableRooms = hostel.available_rooms ?? 0;
  const totalRooms = hostel.total_rooms ?? 0;
  const isAvailable = availableRooms > 0;
  const isSoldOut = !isAvailable;
  
  const amenities = [
    hostel.has_wifi && 'wifi',
    hostel.has_parking && 'lockers',
    hostel.has_laundry && 'breakfast',
  ].filter(Boolean).slice(0, 3);
  
  const extraCount = Math.max(0, (hostel.amenities?.length || 0) - 3);

  return (
    <TouchableOpacity 
      style={[styles.card, isSoldOut && styles.cardDisabled]} 
      onPress={onPress} 
      activeOpacity={0.93}
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
            color={hostel.is_favourite ? COLORS.error : COLORS.white} 
            fill={hostel.is_favourite ? COLORS.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow1}>
          <Text style={styles.cardName} numberOfLines={2}>{hostel.name}</Text>
          {hostel.rating && hostel.rating > 0 && (
            <View style={styles.ratingPill}>
              <Star size={10} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={styles.ratingText}>{hostel.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardRow2}>
          <MapPin size={12} color={COLORS.textTertiary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {hostel.campus_proximity || hostel.address || 'Location'}
          </Text>
        </View>

        <View style={styles.cardRow3}>
          {amenities.map((amenity, idx) => {
            const Icon = AMENITY_ICONS[amenity as string];
            return Icon ? <Icon key={idx} size={14} color={COLORS.textSecondary} /> : null;
          })}
          {extraCount > 0 && (
            <Text style={styles.extraAmenities}>+{extraCount}</Text>
          )}
        </View>

        <View style={styles.cardRow4}>
          {isSoldOut ? (
            <View style={styles.soldOutBadge}>
              <XCircle size={12} color={COLORS.error} />
              <Text style={styles.soldOutText}>Sold out</Text>
            </View>
          ) : (
            <View style={styles.availableBadge}>
              <CheckCircle2 size={12} color={COLORS.success} />
              <Text style={styles.availableText}>
                {availableRooms > 0 ? `Beds left: ${availableRooms}` : 'Available'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardRow5}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceFrom}>From</Text>
            <Text style={styles.priceAmount}>GH₵{hostel.price_range_min || 0}</Text>
            <Text style={styles.priceNight}>/ night</Text>
          </View>
          <TouchableOpacity 
            style={[styles.viewBtn, isSoldOut && styles.viewBtnDisabled]}
            disabled={isSoldOut}
          >
            <Text style={[styles.viewBtnText, isSoldOut && styles.viewBtnTextDisabled]}>
              {isSoldOut ? 'Unavailable' : 'View'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range (GH₵/night)</Text>
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
                {['Dorm', 'Private', 'Studio'].map((type) => {
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
              <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              <View style={styles.chipGrid}>
                {[0, 7, 8, 9].map((rating) => {
                  const isSelected = localFilters.minRating === rating;
                  return (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setLocalFilters(prev => ({ ...prev, minRating: rating }))}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Amenities</Text>
              <View style={styles.chipGrid}>
                {['Wi-Fi', 'Lockers', 'Breakfast', 'Kitchen', 'AC'].map((amenity) => {
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
                <Text style={styles.filterSectionTitle}>Show sold out</Text>
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

function SortSheet({
  visible,
  onClose,
  currentSort,
  onSelectSort,
}: {
  visible: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'best_match', label: 'Best match' },
    { key: 'lowest_price', label: 'Lowest price' },
    { key: 'highest_rating', label: 'Highest rating' },
    { key: 'closest', label: 'Closest distance' },
    { key: 'most_beds', label: 'Most beds available' },
  ];

  const handleSelect = (sort: SortOption) => {
    onSelectSort(sort);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sortContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sort by</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.sortBody}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortOption}
                onPress={() => handleSelect(option.key)}
              >
                <Text style={[
                  styles.sortOptionText,
                  currentSort === option.key && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {currentSort === option.key && (
                  <CheckCircle2 size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
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
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>('best_match');
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('hostels')
        .select('*, hostel_images(*), hostel_rooms(*), wishlists!left(id,user_id)')
        .eq('status', 'active')
        .order('rating', { ascending: false });

      const processed = (data || []).map((h: any) => ({
        ...h,
        is_favourite: user ? h.wishlists?.some((w: any) => w.user_id === user.id) : false,
        wishlists: undefined,
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
      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('hostel_id', hostelId);
    } else {
      await supabase.from('wishlists').insert({ user_id: user.id, hostel_id: hostelId });
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
      
      const matchRating = filters.minRating === 0 || (h.rating && h.rating >= filters.minRating);
      
      const matchRoom = filters.roomTypes.length === 0 || 
        (h.rooms || []).some((r) => filters.roomTypes.includes(r.room_type));
      
      const isAvailable = (h.available_rooms ?? 0) > 0;
      const matchAvailability = filters.showSoldOut || isAvailable;

      const matchQuick = quickFilters.every(qf => {
        if (qf === 'high_rating') return h.rating && h.rating >= 8;
        if (qf === 'private') return (h.rooms || []).some(r => r.room_type === 'Private');
        return true;
      });

      return matchQuery && matchPrice && matchRating && matchRoom && matchAvailability && matchQuick;
    });

    result.sort((a, b) => {
      switch (sort) {
        case 'lowest_price':
          return (a.price_range_min || 0) - (b.price_range_min || 0);
        case 'highest_rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'most_beds':
          return (b.available_rooms || 0) - (a.available_rooms || 0);
        default:
          return (b.rating || 0) - (a.rating || 0);
      }
    });

    return result;
  }, [hostels, query, filters, sort, quickFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priceMin !== DEFAULT_FILTERS.priceMin || filters.priceMax !== DEFAULT_FILTERS.priceMax) count++;
    if (filters.roomTypes.length > 0) count++;
    if (filters.minRating > 0) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.showSoldOut) count++;
    return count;
  }, [filters]);

  const sortLabel = useMemo(() => {
    switch (sort) {
      case 'lowest_price': return 'Lowest price';
      case 'highest_rating': return 'Highest rating';
      case 'closest': return 'Closest';
      case 'most_beds': return 'Most beds';
      default: return 'Best match';
    }
  }, [sort]);

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Search</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hostels..."
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
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => setFilterSheetOpen(true)}
          >
            <SlidersHorizontal size={18} color={COLORS.textPrimary} />
            <Text style={styles.actionBtnText}>
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => setSortSheetOpen(true)}
          >
            <ArrowUpDown size={18} color={COLORS.textPrimary} />
            <Text style={styles.actionBtnText}>{sortLabel}</Text>
            <ChevronDown size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersRow}
        >
          {([
            { key: 'high_rating', label: '8+ rating' },
            { key: 'private', label: 'Private rooms' },
            { key: 'near_center', label: 'Near center' },
            { key: 'breakfast', label: 'Breakfast' },
            { key: 'lockers', label: 'Lockers' },
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
        renderItem={({ item }) => (
          <HostelCard
            hostel={item}
            onPress={() => router.push(`/detail?id=${item.id}` as any)}
            onToggleFav={() => toggleFavourite(item.id, !!item.is_favourite)}
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
            {filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? 's' : ''} found
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

      <SortSheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        currentSort={sort}
        onSelectSort={setSort}
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
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  actionBtnText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.white,
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
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warningFaded,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
    color: COLORS.warning,
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
  cardRow3: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extraAmenities: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  cardRow4: {
    marginTop: 4,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  cardRow5: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceFrom: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  priceAmount: {
    fontFamily: FONT.headingBold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  priceNight: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  viewBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  viewBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  viewBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  viewBtnTextDisabled: {
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
  sortContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 400,
  },
  sortBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sortOptionText: {
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  sortOptionTextActive: {
    fontFamily: FONT.semiBold,
    color: COLORS.primary,
  },
});