import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Platform, RefreshControl, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { Search, SlidersHorizontal, X, Heart } from 'lucide-react-native';
import HostelCard from '@/components/HostelCard';
import FilterSheet, { Filters, DEFAULT_FILTERS } from '@/components/FilterSheet';

type QuickFilter = 'verified' | 'wifi' | 'security' | 'near_campus' | 'water_247' | 'power_backup';

const QUICK_FILTER_OPTIONS: { key: QuickFilter; label: string }[] = [
  { key: 'verified', label: 'Verified' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'security', label: 'Security' },
  { key: 'near_campus', label: 'Near campus' },
  { key: 'water_247', label: '24/7 Water' },
  { key: 'power_backup', label: 'Power backup' },
];

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

      const dbQuery = supabase
        .from('hostels')
        .select(user ? '*, hostel_images(*), hostel_rooms(*), hostel_amenities(*), favourites!left(id,user_id)' : '*, hostel_images(*), hostel_rooms(*), hostel_amenities(*)')
        .eq('status', 'active')
        .order('verified', { ascending: false })
        .order('available_rooms', { ascending: false });

      const { data } = await dbQuery;

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

      const hostelAmenities = (h.amenities || []).map((a: any) => (a.amenity || '').toLowerCase());
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.pageTitle}>Search</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/favourites' as any)} activeOpacity={0.7}>
            <Heart size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.searchRow,
            {
              opacity: searchBarAnim,
              transform: [{
                translateY: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
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
          {QUICK_FILTER_OPTIONS.map((qf) => (
            <TouchableOpacity
              key={qf.key}
              style={[styles.quickChip, quickFilters.includes(qf.key) && styles.quickChipActive]}
              onPress={() => toggleQuickFilter(qf.key)}
            >
              <Text style={[styles.quickChipText, quickFilters.includes(qf.key) && styles.quickChipTextActive]}>
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
            onRefresh={() => { setRefreshing(true); fetchHostels(); }}
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
                  onPress={() => { setFilters(DEFAULT_FILTERS); setQuickFilters([]); }}
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
        onApply={setFilters}
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
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pageTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 28,
    color: COLORS.textPrimary,
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
});