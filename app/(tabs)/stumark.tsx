import { useCallback, useState, useRef, useEffect } from 'react';
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
  Animated,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  Search,
  X,
  MapPin,
  ShoppingBag,
  Heart,
  ChevronRight,
  Smartphone,
  UtensilsCrossed,
  Briefcase,
  Plus,
  MessageCircle,
  Share2,
  ChevronLeft,
  Star,
  Filter,
  TrendingUp,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const DEAL_CARD_WIDTH = width * 0.45;
const GRID_CARD_WIDTH = (width - SPACING.lg * 3) / 2;

type MarketCategory = 'all' | 'electronics' | 'food' | 'services';

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
  seller_name?: string;
};

const CATEGORIES: { key: MarketCategory; label: string; icon: any }[] = [
  { key: 'all', label: 'All', icon: ShoppingBag },
  { key: 'electronics', label: 'Electronics', icon: Smartphone },
  { key: 'food', label: 'Food', icon: UtensilsCrossed },
  { key: 'services', label: 'Services', icon: Briefcase },
];

const CONDITIONS = ['new', 'good', 'fair', 'used'] as const;

const DUMMY_PRODUCTS: MarketListing[] = [
  {
    id: '1',
    seller_id: 'dummy-user-1',
    title: 'iPhone 13 Pro 256GB',
    description:
      'Barely used iPhone 13 Pro in Sierra Blue. Comes with original box, charger, and case. Battery health 98%.',
    price: 2800,
    category: 'electronics',
    condition: 'new',
    campus_location: 'Science Market, UCC',
    seller_phone: '0244123456',
    is_available: true,
    is_sold: false,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=500&q=80',
    seller_name: 'Sarah A.',
  },
  {
    id: '2',
    seller_id: 'dummy-user-2',
    title: 'Dell XPS 15 Laptop',
    description: 'Powerful Dell XPS 15 with Intel i7, 16GB RAM, 512GB SSD, NVIDIA GTX 1650.',
    price: 4500,
    category: 'electronics',
    condition: 'good',
    campus_location: 'Hall 3, Near Library',
    seller_phone: '0201234567',
    is_available: true,
    is_sold: false,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80',
    seller_name: 'Kwame O.',
  },
  {
    id: '3',
    seller_id: 'dummy-user-3',
    title: 'Adidas Campus 00s Sneakers - Size 42',
    description: 'Brand new Adidas Campus 00s in Core Black/Cloud White.',
    price: 450,
    category: 'services',
    condition: 'new',
    campus_location: 'Central Market',
    seller_phone: '0557654321',
    is_available: true,
    is_sold: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
    seller_name: 'Ama K.',
  },
  {
    id: '4',
    seller_id: 'dummy-user-4',
    title: 'Mathematics Tutoring - All Levels',
    description: 'Experienced math tutor offering personalized lessons. First lesson free!',
    price: 50,
    category: 'services',
    condition: 'new',
    campus_location: 'Main Campus',
    seller_phone: '0246789012',
    is_available: true,
    is_sold: false,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=500&q=80',
    seller_name: 'Dr. Mensah',
  },
  {
    id: '5',
    seller_id: 'dummy-user-5',
    title: 'Homemade Jollof & Chicken - Daily Special',
    description: 'Delicious homemade Jollof rice with grilled chicken, coleslaw, and fried plantain.',
    price: 25,
    category: 'food',
    condition: 'new',
    campus_location: 'Hall 7 Kitchen',
    seller_phone: '0209876543',
    is_available: true,
    is_sold: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80',
    seller_name: 'Mama Akos',
  },
];

export default function StuMarkScreen() {
  const [listings, setListings] = useState<MarketListing[]>(DUMMY_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<MarketCategory>('all');

  // Product Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketListing | null>(null);

  // Wishlist
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  // Filter Modal
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [filterCondition, setFilterCondition] = useState<string[]>([]);

  // Post Modal
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

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const handleCategoryPress = useCallback(
    (newCategory: MarketCategory) => {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCategory(newCategory);
    },
    [scaleAnim],
  );

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
          setListings(data as MarketListing[]);
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

  const openPost = useCallback(() => {
    setPostError(null);
    setPostTitle('');
    setPostDescription('');
    setPostPrice('');
    setPostCategory('services');
    setPostCondition('good');
    setPostLocation('');
    setPostPhone('');
    setPostOpen(true);
  }, []);

  const closePost = useCallback(() => {
    if (!posting) setPostOpen(false);
  }, [posting]);

  const submitPost = useCallback(async () => {
    if (posting) return;
    const title = postTitle.trim();
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
  }, [
    fetchListings,
    postCategory,
    postCondition,
    postDescription,
    postLocation,
    postPhone,
    postPrice,
    postTitle,
    posting,
  ]);

  // NEW: Product Detail Handlers
  const openProductDetail = useCallback((product: MarketListing) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  }, []);

  const closeProductDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  }, []);

  // NEW: Wishlist Handlers
  const toggleWishlist = useCallback((productId: string, e?: any) => {
    if (e) e.stopPropagation();
    setWishlist((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  // NEW: Contact Handler - In-App Chat
  const handleMessage = useCallback((product: MarketListing | null) => {
    if (!product) return;
    // TODO: Navigate to chat screen with seller
    Alert.alert(
      'Start Chat',
      `Chat with ${product.seller_name || 'seller'} about "${product.title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Chat',
          onPress: () => {
            // TODO: Navigate to chat screen
            // navigation.navigate('Chat', { productId: product.id, sellerId: product.seller_id })
            console.log('Opening chat for product:', product.id);
          },
        },
      ],
    );
  }, []);

  // NEW: Helper Functions
  const formatPrice = useCallback((value: number | string) => {
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return '₵0';
    return `₵${n.toLocaleString()}`;
  }, []);

  const getTimeAgo = useCallback((dateString: string) => {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }, []);

  // UPDATED: Filter and Sort Logic
  const filteredListings = listings
    .filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q.length > 0 && !item.title.toLowerCase().includes(q)) return false;
      if (filterCondition.length > 0 && item.condition && !filterCondition.includes(item.condition)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') {
        const priceA = typeof a.price === 'string' ? Number(a.price) : a.price;
        const priceB = typeof b.price === 'string' ? Number(b.price) : b.price;
        return priceA - priceB;
      }
      if (sortBy === 'price-high') {
        const priceA = typeof a.price === 'string' ? Number(a.price) : a.price;
        const priceB = typeof b.price === 'string' ? Number(b.price) : b.price;
        return priceB - priceA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const recentListings = filteredListings.slice(0, 6);
  const trendingListings = filteredListings.slice(0, 8);

  return (
    <View style={styles.container}>
      {/* Header - Fixed */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>StuMark</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setFilterOpen(true)} activeOpacity={0.7}>
              <Filter size={22} color={COLORS.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openPost} activeOpacity={0.7} style={{ marginLeft: 16 }}>
              <Plus size={22} color={COLORS.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
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

      {/* NEW: Sticky Categories */}
      <View style={styles.stickyCategories}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            const Icon = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => handleCategoryPress(cat.key)}
                activeOpacity={0.8}
              >
                <Icon size={16} color={active ? COLORS.white : COLORS.textSecondary} strokeWidth={2} />
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Campus Deals</Text>
            <Text style={styles.bannerSubtitle}>Shop smart, save more</Text>
          </View>
          <View style={styles.bannerBadge}>
            <TrendingUp size={16} color={COLORS.white} />
            <Text style={styles.bannerBadgeText}>Hot</Text>
          </View>
        </View>

        {/* Today's Deals */}
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
                <TouchableOpacity
                  key={item.id}
                  style={styles.dealCard}
                  onPress={() => openProductDetail(item)}
                  activeOpacity={0.9}
                >
                  <View style={styles.dealImage}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <ShoppingBag size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
                    )}
                    {item.condition && (
                      <View style={styles.dealBadge}>
                        <Text style={styles.dealBadgeText}>{item.condition.toUpperCase()}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.wishlistBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleWishlist(item.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Heart
                        size={18}
                        color={COLORS.error}
                        fill={wishlist.has(item.id) ? COLORS.error : 'transparent'}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dealInfo}>
                    <Text style={styles.dealTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.dealRating}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.dealRatingText}>4.5</Text>
                      <Text style={styles.dealReviews}>(120)</Text>
                    </View>
                    <Text style={styles.dealPrice}>{formatPrice(item.price)}</Text>
                    <Text style={styles.dealTime}>{getTimeAgo(item.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending Now */}
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
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridCard}
                  onPress={() => openProductDetail(item)}
                  activeOpacity={0.9}
                >
                  <View style={styles.gridImage}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <ShoppingBag size={28} color={COLORS.textTertiary} strokeWidth={1.5} />
                    )}
                    <TouchableOpacity
                      style={styles.favoriteIcon}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleWishlist(item.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Heart
                        size={16}
                        color={COLORS.error}
                        fill={wishlist.has(item.id) ? COLORS.error : 'transparent'}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.gridRating}>
                      <Star size={11} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.gridRatingText}>4.5</Text>
                    </View>
                    <Text style={styles.gridPrice}>{formatPrice(item.price)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {filteredListings.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <ShoppingBag size={56} color={COLORS.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0 ? 'Try a different search term' : 'Be the first to list something!'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openPost}>
              <Plus size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.emptyBtnText}>List an Item</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* NEW: Product Detail Modal */}
      <Modal visible={detailOpen} animationType="slide" onRequestClose={closeProductDetail}>
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={closeProductDetail} style={styles.backButton}>
              <ChevronLeft size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => selectedProduct && toggleWishlist(selectedProduct.id)}
              style={styles.backButton}
            >
              <Heart
                size={24}
                color={COLORS.error}
                fill={selectedProduct && wishlist.has(selectedProduct.id) ? COLORS.error : 'transparent'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedProduct?.image_url ? (
              <Image source={{ uri: selectedProduct.image_url }} style={styles.detailImage} resizeMode="cover" />
            ) : (
              <View style={styles.detailImagePlaceholder}>
                <ShoppingBag size={80} color={COLORS.textTertiary} strokeWidth={1.5} />
              </View>
            )}

            <View style={styles.detailInfo}>
              {selectedProduct?.condition && (
                <View style={styles.detailBadge}>
                  <Text style={styles.detailBadgeText}>{selectedProduct.condition.toUpperCase()}</Text>
                </View>
              )}

              <Text style={styles.detailTitle}>{selectedProduct?.title}</Text>

              <View style={styles.detailPriceRow}>
                <Text style={styles.detailPrice}>{selectedProduct && formatPrice(selectedProduct.price)}</Text>
                <Text style={styles.detailTime}>{selectedProduct && getTimeAgo(selectedProduct.created_at)}</Text>
              </View>

              <View style={styles.detailRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color="#F59E0B"
                    fill={star <= 4 ? '#F59E0B' : 'transparent'}
                    strokeWidth={1.5}
                  />
                ))}
                <Text style={styles.detailRatingText}>4.0 (245 reviews)</Text>
              </View>

              {selectedProduct?.campus_location && (
                <View style={styles.detailLocationRow}>
                  <MapPin size={16} color={COLORS.textTertiary} />
                  <Text style={styles.detailLocationText}>{selectedProduct.campus_location}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailDescription}>{selectedProduct?.description}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Seller Information</Text>
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerAvatar}>
                    <Text style={styles.sellerAvatarText}>{selectedProduct?.seller_name?.charAt(0) || 'S'}</Text>
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{selectedProduct?.seller_name || 'Student Seller'}</Text>
                    <Text style={styles.sellerStats}>⭐ 4.5 · 12 items sold</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 100 }} />
            </View>
          </ScrollView>

          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.detailActionMessage}
              onPress={() => handleMessage(selectedProduct)}
            >
              <MessageCircle size={20} color={COLORS.white} />
              <Text style={styles.detailActionText}>Message Seller</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NEW: Filter Modal */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter & Sort</Text>
                <TouchableOpacity onPress={() => setFilterOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.field}>
                  <Text style={styles.label}>Sort By</Text>
                  <View style={styles.chipRow}>
                    {[
                      { key: 'newest', label: 'Newest' },
                      { key: 'price-low', label: 'Price: Low to High' },
                      { key: 'price-high', label: 'Price: High to Low' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.smallChip, sortBy === option.key && styles.smallChipActive]}
                        onPress={() => setSortBy(option.key as any)}
                      >
                        <Text style={[styles.smallChipText, sortBy === option.key && styles.smallChipTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Condition</Text>
                  <View style={styles.chipRow}>
                    {CONDITIONS.map((cond) => {
                      const active = filterCondition.includes(cond);
                      return (
                        <TouchableOpacity
                          key={cond}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          onPress={() => {
                            setFilterCondition((prev) => (active ? prev.filter((c) => c !== cond) : [...prev, cond]));
                          }}
                        >
                          <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{cond}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={() => setFilterOpen(false)}>
                  <Text style={styles.submitBtnText}>Apply Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    setSortBy('newest');
                    setFilterCondition([]);
                  }}
                >
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Post Modal */}
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
                    placeholder="e.g., iPhone 13 Pro, Dell Laptop..."
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
                          style={[styles.fullChip, active && styles.fullChipActive]}
                          onPress={() => setPostCategory(key)}
                        >
                          <Text style={[styles.fullChipText, active && styles.fullChipTextActive]}>{c.label}</Text>
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
                    placeholder="e.g., Science market, Hall 3..."
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
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

  // NEW: Sticky Categories
  stickyCategories: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: SPACING.sm,
  },
  categoriesScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  categoryChipActive: { backgroundColor: COLORS.primary },
  categoryChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  categoryChipTextActive: { color: COLORS.white },

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
  dealBadge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  dealBadgeText: { fontFamily: FONT.bold, fontSize: 9, color: COLORS.white, letterSpacing: 0.5 },
  // NEW: Wishlist Button
  wishlistBtn: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealInfo: { padding: SPACING.sm, gap: 4 },
  dealTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  dealRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dealRatingText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.textPrimary },
  dealReviews: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  dealPrice: { fontFamily: FONT.bold, fontSize: 16, color: '#B12704', marginTop: 2 },
  dealTime: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

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
  gridRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridRatingText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.textPrimary },
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

  // NEW: Product Detail Modal Styles
  detailContainer: { flex: 1, backgroundColor: COLORS.white },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  detailImage: { width: '100%', height: width, backgroundColor: '#F9FAFB' },
  detailImagePlaceholder: {
    width: '100%',
    height: width,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: { padding: SPACING.lg },
  detailBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    marginBottom: SPACING.sm,
  },
  detailBadgeText: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.white, letterSpacing: 0.5 },
  detailTitle: { fontFamily: FONT.bold, fontSize: 22, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  detailPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailPrice: { fontFamily: FONT.bold, fontSize: 28, color: '#B12704' },
  detailTime: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textTertiary },
  detailRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
  detailRatingText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginLeft: 4 },
  detailLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.lg },
  detailLocationText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },
  detailSection: { marginTop: SPACING.lg },
  detailSectionTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  detailDescription: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.white },
  sellerDetails: { flex: 1 },
  sellerName: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  sellerStats: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textTertiary, marginTop: 2 },
  detailActions: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  detailActionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
  },
  detailActionText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.white },

  // Modal Styles
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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
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

  fullChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: COLORS.white,
  },
  fullChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  fullChipText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  fullChipTextActive: { color: COLORS.white },

  submitBtn: {
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.white },

  clearBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  clearBtnText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.textSecondary },
}); 