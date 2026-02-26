import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, FlatList, Image, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ArrowLeft, Plus, Search, ShoppingBag, Heart, Star, MapPin, Clock } from 'lucide-react-native';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  seller_name: string;
  category: 'food' | 'stationery' | 'services' | 'merch' | 'other';
  is_available: boolean;
  created_at: string;
}

export default function StuMarkScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['all', 'food', 'stationery', 'services', 'merch'];

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('stumark_listings')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      setListings((data || []) as Listing[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchListings();
  }, []));

  const filteredListings = listings.filter((item) => {
    const matchesSearch = !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateListing = () => {
    // Placeholder for create flow - can be expanded later
    alert('Create new listing coming soon! (Post your item for sale)');
  };

  const handleBuy = (item: Listing) => {
    alert(`Contact seller for ${item.title} - GH₵${item.price}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>StuMark</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateListing}>
          <Plus size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items, food, services..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchListings(); }} tintColor={COLORS.primary} />}
      >
        {loading && listings.length === 0 ? (
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No listings found</Text>
            <Text style={styles.emptySub}>Be the first to post something!</Text>
          </View>
        ) : (
          filteredListings.map((item) => (
            <TouchableOpacity key={item.id} style={styles.listingCard} onPress={() => handleBuy(item)} activeOpacity={0.85}>
              <View style={styles.imageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.listingImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <ShoppingBag size={32} color={COLORS.textTertiary} />
                  </View>
                )}
              </View>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.listingSeller}>by {item.seller_name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>GH₵{item.price}</Text>
                  <Text style={styles.categoryLabel}>{item.category}</Text>
                </View>
                <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(item)}>
                  <Text style={styles.buyBtnText}>Buy / Chat</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, marginLeft: SPACING.sm },

  categoryScroll: { marginBottom: SPACING.sm },
  categoryContainer: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  categoryTextActive: { color: COLORS.white },

  list: { flex: 1, paddingHorizontal: SPACING.md },
  loadingText: { textAlign: 'center', marginTop: 80, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontFamily: FONT.semiBold, fontSize: 18, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  listingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: { width: 110, height: 110 },
  listingImage: { width: 110, height: 110, resizeMode: 'cover' },
  placeholderImage: { width: 110, height: 110, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  listingInfo: { flex: 1, padding: SPACING.md, justifyContent: 'space-between' },
  listingTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 4 },
  listingSeller: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  price: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.primary },
  categoryLabel: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textTertiary, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  buyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  buyBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },
});