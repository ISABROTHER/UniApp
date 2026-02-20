import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Platform, RefreshControl, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, ROOM_TYPES, BUDGET_OPTIONS_GHS } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { Search, Heart, Star, MapPin, SlidersHorizontal, X } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = (SW - 16 * 2 - 12) / 2;
const BG = '#F2F3F8';

function HostelCard({ hostel, onPress, onToggleFav }: { hostel: Hostel; onPress: () => void; onToggleFav: () => void }) {
  const imageUrl = hostel.images?.[0]?.image_url || hostel.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=400';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.93}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{hostel.name}</Text>
        <Text style={styles.locationText} numberOfLines={1}>{hostel.campus_proximity}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedRoomType, setSelectedRoomType] = useState('All');
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let q = supabase.from('hostels').select('*, hostel_images(*), hostel_rooms(*), wishlists!left(id,user_id)').eq('status', 'active');
      if (verifiedOnly) q = q.eq('verified', true);
      if (maxBudget) q = q.lte('price_range_min', maxBudget);
      const { data } = await q.order('rating', { ascending: false });

      const processed = (data || []).map((h: any) => ({
        ...h,
        is_favourite: user ? h.wishlists?.some((w: any) => w.user_id === user.id) : false,
        wishlists: undefined,
      })) as Hostel[];

      setHostels(processed);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchHostels(); }, [maxBudget, verifiedOnly]);

  const toggleFavourite = async (hostelId: string, isFav: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isFav) await supabase.from('wishlists').delete().eq('user_id', user.id).eq('hostel_id', hostelId);
    else await supabase.from('wishlists').insert({ user_id: user.id, hostel_id: hostelId });
    setHostels((prev) => prev.map((h) => h.id === hostelId ? { ...h, is_favourite: !isFav } : h));
  };

  const filtered = hostels.filter((h) => {
    const matchRoom = selectedRoomType === 'All' || (h.rooms || []).some((r) => r.room_type === selectedRoomType);
    const matchQuery = !query.trim() || `${h.name} ${h.address} ${h.campus_proximity} ${h.description}`.toLowerCase().includes(query.toLowerCase());
    return matchRoom && matchQuery;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Search</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, city, university..."
              placeholderTextColor={COLORS.textTertiary}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={16} color={COLORS.textSecondary} /></TouchableOpacity>}
          </View>
          <TouchableOpacity style={[styles.filterBtn, showFilters && styles.filterBtnActive]} onPress={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={18} color={showFilters ? COLORS.white : COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.priceRangeRow}>
            <Text style={styles.filterLabel}>Price Range</Text>
            {maxBudget !== null && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>GH₵80 – GH₵{maxBudget}/mo</Text>
              </View>
            )}
          </View>
          <Text style={styles.filterSubLabel}>Max Budget (GH₵/month)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            <TouchableOpacity style={[styles.chip, maxBudget === null && styles.chipActive]} onPress={() => setMaxBudget(null)}>
              <Text style={[styles.chipText, maxBudget === null && styles.chipTextActive]}>Any</Text>
            </TouchableOpacity>
            {BUDGET_OPTIONS_GHS.map((b) => (
              <TouchableOpacity key={b} style={[styles.chip, maxBudget === b && styles.chipActive]} onPress={() => setMaxBudget(b)}>
                <Text style={[styles.chipText, maxBudget === b && styles.chipTextActive]}>≤ GH₵{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.filterSubLabel}>Room Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {ROOM_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, selectedRoomType === t && styles.chipActive]} onPress={() => setSelectedRoomType(t)}>
                <Text style={[styles.chipText, selectedRoomType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.filterRow}>
            <Text style={styles.filterSubLabel}>Verified Only</Text>
            <TouchableOpacity style={[styles.toggle, verifiedOnly && styles.toggleActive]} onPress={() => setVerifiedOnly(!verifiedOnly)}>
              <View style={[styles.toggleDot, verifiedOnly && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHostels(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.results}
      >
        <Text style={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</Text>

        <View style={styles.grid}>
          {filtered.map((hostel) => (
            <HostelCard
              key={hostel.id}
              hostel={hostel}
              onPress={() => router.push(`/detail?id=${hostel.id}` as any)}
              onToggleFav={() => toggleFavourite(hostel.id, !!hostel.is_favourite)}
            />
          ))}
        </View>

        {filtered.length === 0 && !loading && (
          <View style={styles.empty}>
            <Search size={40} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No hostels found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: COLORS.white, paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  pageTitle: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary, marginBottom: SPACING.md },
  searchRow: { flexDirection: 'row', gap: SPACING.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, gap: SPACING.sm },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary },
  filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtersPanel: { backgroundColor: COLORS.white, paddingHorizontal: SPACING.md, paddingTop: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  priceRangeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  filterLabel: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  filterSubLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  priceBadge: { backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  priceBadgeText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: SPACING.md },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white },
  toggleDotActive: { alignSelf: 'flex-end' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.white },
  results: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  resultCount: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  cardImageWrap: {},
  cardImage: { width: CARD_WIDTH, height: CARD_WIDTH, backgroundColor: COLORS.borderLight },
  cardBody: { padding: 12, paddingBottom: 14 },
  cardName: { fontFamily: FONT.headingBold, fontSize: 17, color: COLORS.textPrimary, marginBottom: 4 },
  locationText: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textTertiary },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },
});
