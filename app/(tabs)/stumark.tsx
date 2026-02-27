import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  Search,
  X,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Heart,
  ChevronRight,
  Smartphone,
  Briefcase,
  UtensilsCrossed,
  Package,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const DEAL_CARD_WIDTH = width * 0.45;
const GRID_CARD_WIDTH = (width - SPACING.lg * 3) / 2;

type MarketCategory = 'all' | 'electronics' | 'food' | 'services' | 'grocery';

type MarketListing = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number | string;
  category: string | null;
  condition: string | null;
  campus_location: string | null;
  seller_phone: string | null;
  is_available: boolean | null;
  is_sold: boolean | null;
  created_at: string;
  image_url?: string;
};

const CATEGORIES: { key: MarketCategory; label: string; icon: any }[] = [
  { key: 'all', label: 'All', icon: ShoppingBag },
  { key: 'electronics', label: 'Electronics', icon: Smartphone },
  { key: 'food', label: 'Food', icon: UtensilsCrossed },
  { key: 'services', label: 'Services', icon: Briefcase },
  { key: 'grocery', label: 'Grocery Shops', icon: Package },
];

const CONDITIONS = ['new', 'good', 'fair', 'used'] as const;

const stripBadgesFromTitle = (title: string) =>
  title
    .replace(/\s*-\s*like new\s*/gi, ' ')
    .replace(/\s*-\s*gaming ready\s*/gi, ' ')
    .replace(/\s*\(\s*like new\s*\)\s*/gi, ' ')
    .replace(/\s*\(\s*gaming ready\s*\)\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const DUMMY_PRODUCTS: MarketListing[] = [
  {
    id: '1',
    seller_id: 'dummy-user-1',
    title: stripBadgesFromTitle('iPhone 13 Pro 256GB - Like New'),
    description:
      'Barely used iPhone 13 Pro in Sierra Blue. Comes with original box, charger, and case. No scratches, perfect condition. Battery health 98%.',
    price: 2800,
    category: 'electronics',
    condition: 'new',
    campus_location: 'BBF Apple Shop, UCC',
    seller_phone: '0244123456',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=500&q=80',
  },
  {
    id: '2',
    seller_id: 'dummy-user-2',
    title: stripBadgesFromTitle('Dell XPS 15 Laptop - Gaming Ready'),
    description:
      'Powerful Dell XPS 15 with Intel i7, 16GB RAM, 512GB SSD, NVIDIA GTX 1650. Perfect for coding, gaming, and design work.',
    price: 4500,
    category: 'electronics',
    condition: 'good',
    campus_location: 'UCC Repairs, UCC',
    seller_phone: '0201234567',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80',
  },
  {
    id: '3',
    seller_id: 'dummy-user-3',
    title: 'Naa Spicy Bite',
    description: 'Meals available daily.',
    price: 25,
    category: 'food',
    condition: 'new',
    campus_location: 'Science Market, UCC',
    seller_phone: '0557654321',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80',
  },
  {
    id: '4',
    seller_id: 'dummy-user-4',
    title: 'Macoy',
    description: 'Meals available at Science Market.',
    price: 25,
    category: 'food',
    condition: 'new',
    campus_location: 'Science Market, UCC',
    seller_phone: '0246789012',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80',
  },
  {
    id: '5',
    seller_id: 'dummy-user-5',
    title: 'Science Market',
    description: 'Food vendors and items available.',
    price: 10,
    category: 'grocery',
    condition: 'new',
    campus_location: 'Science Market, UCC',
    seller_phone: '0209876543',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
  },
];

export default function StuMarkScreen() {
  const [listings, setListings] = useState<MarketListing[]>(DUMMY_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<MarketCategory>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketListing | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [filterCondition, setFilterCondition] = useState<string[]>([]);
  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postCategory, setPostCategory] = useState<Exclude<MarketCategory, 'all'>>('services');
  const [postCondition, setPostCondition] = useState<(typeof CONDITIONS)[number]>('good');
  const [postLocation, setPostLocation] = useState('');
  const [postPhone, setPostPhone] = useState('');
  const [postError, setPostError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const fetchListings = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        let query = supabase
          .from('market_listings')
          .select(
            'id,seller_id,title,description,price,category,condition,campus_location,seller_phone,is_available,is_sold,created_at',
          )
          .order('created_at', { ascending: false });

        if (category !== 'all') query = query.eq('category', category);
        const q = searchQuery.trim();
        if (q.length > 0) query = query.ilike('title', `%${q}%`);
        query = query.eq('is_sold', false).eq('is_available', true);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          const cleaned = (data as MarketListing[]).map((item) => ({
            ...item,
            title: stripBadgesFromTitle(item.title),
          }));
          setListings(cleaned);
        } else {
          setListings(DUMMY_PRODUCTS);
        }
      } catch {
        setListings(DUMMY_PRODUCTS);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [category, searchQuery],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchListings();
    }, [fetchListings]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings({ silent: true });
    setRefreshing(false);
  }, [fetchListings]);

  const openPost = () => {
    setPostError(null);
    setPostTitle('');
    setPostDescription('');
    setPostPrice('');
    setPostCategory('services');
    setPostCondition('good');
    setPostLocation('');
    setPostPhone('');
    setPostOpen(true);
  };

  const closePost = () => {
    if (!posting) setPostOpen(false);
  };

  const submitPost = async () => {
    if (posting) return;
    const title = stripBadgesFromTitle(postTitle.trim());
    const priceNumber = Number(postPrice);
    if (title.length === 0) {
      setPostError('Add a title.');
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setPostError('Enter a valid price.');
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) {
        setPostError('Please sign in to post.');
        return;
      }
      const payload = {
        seller_id: userId,
        title,
        description: postDescription.trim(),
        price: priceNumber,
        category: postCategory,
        condition: postCondition,
        campus_location: postLocation.trim(),
        seller_phone: postPhone.trim(),
        is_available: true,
        is_sold: false,
      };
      const { error } = await supabase.from('market_listings').insert(payload);
      if (error) throw error;
      setPostOpen(false);
      await fetchListings({ silent: true });
    } catch {
      setPostError('Could not post right now. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };

  const formatPrice = (value: number | string) => {
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return '₵0';
    return `₵${n.toLocaleString()}`;
  };

  const filteredListings = listings
    .map((item) => ({ ...item, title: stripBadgesFromTitle(item.title) }))
    .filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q.length > 0 && !item.title.toLowerCase().includes(q)) return false;
      if (filterCondition.length > 0 && item.condition && !filterCondition.includes(item.condition)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const recentListings = filteredListings.slice(0, 6);
  const trendingListings = filteredListings.slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>StuMark</Text>

          {/* PLUS SIGN REPLACED WITH POST AD / SELL */}
          <TouchableOpacity onPress={openPost} style={styles.sellButton} activeOpacity={0.8}>
            <Text style={styles.sellButtonText}>Post Ad</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items on campus..."
            placeholderTextColor={COLORS.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>StuMark (Student Market </Text>
            <Text style={styles.bannerSubtitle}>Created by students and for students, this is an open platform for anyone to post what they want to sell, buy or trade.</Text>
          </View>
          <View style={styles.bannerBadge}>
            <TrendingUp size={16} color={COLORS.white} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            const Icon = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryCard, active && styles.categoryCardActive]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                  <Icon size={20} color={active ? COLORS.white : COLORS.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* THIN LINE SEPARATING LOGO ICONS (CATEGORIES) FROM TODAY'S DEAL */}
        <View style={styles.divider} />

        {recentListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Today's Deals</Text>
                <Text style={styles.sectionSubtitle}>Limited time offers</Text>
              </View>
              <TouchableOpacity style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealsScroll}>
              {recentListings.map((item) => (
                <View key={item.id} style={styles.dealCard}>
                  <View style={styles.dealImage}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <ShoppingBag size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
                    )}
                  </View>
                  <View style={styles.dealInfo}>
                    <Text style={styles.dealTitle} numberOfLines={2}>
                      {stripBadgesFromTitle(item.title)}
                    </Text>
                    <Text style={styles.dealPrice}>{formatPrice(item.price)}</Text>
                    {item.campus_location && (
                      <View style={styles.dealLocation}>
                        <MapPin size={11} color={COLORS.textTertiary} />
                        <Text style={styles.dealLocationText} numberOfLines={1}>
                          {item.campus_location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {trendingListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <Text style={styles.sectionSubtitle}>Most popular items</Text>
              </View>
            </View>
            <View style={styles.grid}>
              {trendingListings.map((item) => (
                <View key={item.id} style={styles.gridCard}>
                  <View style={styles.gridImage}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <ShoppingBag size={28} color={COLORS.textTertiary} strokeWidth={1.5} />
                    )}
                    <TouchableOpacity style={styles.favoriteIcon} onPress={() => toggleWishlist(item.id)}>
                      <Heart
                        size={16}
                        color={wishlist.has(item.id) ? COLORS.error : COLORS.textTertiary}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {stripBadgesFromTitle(item.title)}
                    </Text>
                    <Text style={styles.gridPrice}>{formatPrice(item.price)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {filteredListings.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <ShoppingBag size={56} color={COLORS.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0 ? 'Try a different search term' : 'Be the first to list something!'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openPost}>
              <Text style={styles.emptyBtnText}>Post Ad</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      <Modal visible={postOpen} transparent animationType="slide" onRequestClose={closePost}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>List an Item</Text>
                <TouchableOpacity onPress={closePost} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {postError && <Text style={styles.modalError}>{postError}</Text>}

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.field}>
                  <Text style={styles.label}>Item title</Text>
                  <TextInput
                    value={postTitle}
                    onChangeText={setPostTitle}
                    placeholder="e.g., BBF Apple Shop, UCC Repairs..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    value={postDescription}
                    onChangeText={setPostDescription}
                    placeholder="Describe your item..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.label}>Price (₵)</Text>
                    <TextInput
                      value={postPrice}
                      onChangeText={setPostPrice}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textTertiary}
                      style={styles.input}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.rowItem}>
                    <Text style={styles.label}>Condition</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineChips}>
                      {CONDITIONS.map((cond) => {
                        const active = postCondition === cond;
                        return (
                          <TouchableOpacity
                            key={cond}
                            style={[styles.smallChip, active && styles.smallChipActive]}
                            onPress={() => setPostCondition(cond)}
                          >
                            <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{cond}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineChips}>
                    {CATEGORIES.filter((c) => c.key !== 'all').map((c) => {
                      const key = c.key as Exclude<MarketCategory, 'all'>;
                      const active = postCategory === key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          onPress={() => setPostCategory(key)}
                        >
                          <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{c.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Campus location</Text>
                  <TextInput
                    value={postLocation}
                    onChangeText={setPostLocation}
                    placeholder="e.g., Science Market, UCC..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone number</Text>
                  <TextInput
                    value={postPhone}
                    onChangeText={setPostPhone}
                    placeholder="Optional"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, posting && styles.submitBtnDisabled]}
                  onPress={submitPost}
                  disabled={posting}
                >
                  <Text style={styles.submitBtnText}>{posting ? 'Posting…' : 'List Item'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.textPrimary },
  sellButton: {
    backgroundColor: '#FF9900',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  sellButtonText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.white },

  searchBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary },

  content: { flex: 1 },
  contentContainer: { paddingBottom: SPACING.lg },

  heroBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: '#FF9900',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  bannerContent: { gap: 4 },
  bannerTitle: { fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.white },
  bannerSubtitle: { fontFamily: FONT.medium, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  bannerBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  bannerBadgeText: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.white },

  categories: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm, flexDirection: 'row' },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },

  categoryCard: { alignItems: 'center', gap: 6, paddingHorizontal: SPACING.sm },
  categoryCardActive: {},
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconActive: { backgroundColor: COLORS.primary },
  categoryLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },
  categoryLabelActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  section: { marginTop: SPACING.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  sectionSubtitle: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },

  dealsScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  dealCard: {
    width: DEAL_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dealImage: {
    height: DEAL_CARD_WIDTH * 0.9,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%' },
  dealInfo: { padding: SPACING.sm, gap: 4 },
  dealTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  dealPrice: { fontFamily: FONT.bold, fontSize: 16, color: '#B12704', marginTop: 2 },
  dealLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  dealLocationText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, flex: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gridImage: {
    height: GRID_CARD_WIDTH * 0.9,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favoriteIcon: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridInfo: { padding: SPACING.sm, gap: 3 },
  gridTitle: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textPrimary, lineHeight: 16 },
  gridPrice: { fontFamily: FONT.bold, fontSize: 14, color: '#B12704' },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  emptyTitle: { fontFamily: FONT.bold, fontSize: 17, color: COLORS.textPrimary },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF9900',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  emptyBtnText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },

  footerSpace: { height: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  modalError: { marginBottom: SPACING.sm, fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },
  modalBody: { paddingTop: SPACING.xs },

  field: { gap: 6, marginBottom: SPACING.md },
  label: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: SPACING.md },
  rowItem: { flex: 1 },

  inlineChips: { gap: SPACING.xs, paddingVertical: 2 },
  smallChip: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: COLORS.white,
  },
  smallChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  smallChipText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  smallChipTextActive: { color: COLORS.white },

  submitBtn: {
    backgroundColor: '#FF9900',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.white },
});