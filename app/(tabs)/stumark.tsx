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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  Plus,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const DEAL_CARD_WIDTH = width * 0.42;
const GRID_CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.sm) / 2;

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

const CATEGORIES: { key: MarketCategory; label: string; icon: any; color: string; bg: string }[] =[
  { key: 'all', label: 'All', icon: ShoppingBag, color: '#1F2937', bg: '#F3F4F6' },
  { key: 'electronics', label: 'Tech', icon: Smartphone, color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'food', label: 'Food', icon: UtensilsCrossed, color: '#EA580C', bg: '#FFEDD5' },
  { key: 'services', label: 'Services', icon: Briefcase, color: '#0284C7', bg: '#E0F2FE' },
  { key: 'grocery', label: 'Grocery', icon: Package, color: '#16A34A', bg: '#DCFCE7' },
];

const CONDITIONS =['new', 'good', 'fair', 'used'] as const;

const stripBadgesFromTitle = (title: string) =>
  title
    .replace(/\s*-\s*like new\s*/gi, ' ')
    .replace(/\s*-\s*gaming ready\s*/gi, ' ')
    .replace(/\s*\(\s*like new\s*\)\s*/gi, ' ')
    .replace(/\s*\(\s*gaming ready\s*\)\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const DUMMY_PRODUCTS: MarketListing[] =[
  {
    id: '1',
    seller_id: 'dummy-user-1',
    title: stripBadgesFromTitle('iPhone 13 Pro 256GB - Like New'),
    description: 'Barely used iPhone 13 Pro in Sierra Blue. Comes with original box, charger, and case. Battery health 98%.',
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
    description: 'Powerful Dell XPS 15 with Intel i7, 16GB RAM, 512GB SSD. Perfect for coding, gaming, and design work.',
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
    title: 'Naa Spicy Bite (Waakye)',
    description: 'Hot meals available daily.',
    price: 25,
    category: 'food',
    condition: 'new',
    campus_location: 'Science Market',
    seller_phone: '0557654321',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80',
  },
  {
    id: '4',
    seller_id: 'dummy-user-4',
    title: 'Macoy Groceries',
    description: 'Fresh provisions and hostel essentials.',
    price: 50,
    category: 'grocery',
    condition: 'new',
    campus_location: 'Science Market',
    seller_phone: '0246789012',
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
  const[category, setCategory] = useState<MarketCategory>('all');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [filterCondition, setFilterCondition] = useState<string[]>([]);
  const[postOpen, setPostOpen] = useState(false);
  
  // Post Form State
  const[postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const[postPrice, setPostPrice] = useState('');
  const [postCategory, setPostCategory] = useState<Exclude<MarketCategory, 'all'>>('electronics');
  const [postCondition, setPostCondition] = useState<(typeof CONDITIONS)[number]>('good');
  const [postLocation, setPostLocation] = useState('');
  const [postPhone, setPostPhone] = useState('');
  const [postError, setPostError] = useState<string | null>(null);
  const[posting, setPosting] = useState(false);

  const fetchListings = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      let query = supabase
        .from('market_listings')
        .select('*')
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
  }, [category, searchQuery]);

  useFocusEffect(useCallback(() => { void fetchListings(); }, [fetchListings]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings({ silent: true });
    setRefreshing(false);
  }, [fetchListings]);

  const openPost = () => {
    setPostError(null); setPostTitle(''); setPostDescription(''); setPostPrice('');
    setPostCategory('electronics'); setPostCondition('good'); setPostLocation(''); setPostPhone('');
    setPostOpen(true);
  };

  const closePost = () => { if (!posting) setPostOpen(false); };

  const submitPost = async () => {
    if (posting) return;
    const title = stripBadgesFromTitle(postTitle.trim());
    const priceNumber = Number(postPrice);
    if (title.length === 0) return setPostError('Add a title.');
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) return setPostError('Enter a valid price.');
    
    setPosting(true); setPostError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) {
        setPostError('Please sign in to post.');
        setPosting(false);
        return;
      }
      const payload = {
        seller_id: userData.user.id, title, description: postDescription.trim(), price: priceNumber,
        category: postCategory, condition: postCondition, campus_location: postLocation.trim(),
        seller_phone: postPhone.trim(), is_available: true, is_sold: false,
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
    if (!Number.isFinite(n)) return 'GH₵0';
    return `GH₵${n.toLocaleString()}`;
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
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const recentListings = filteredListings.slice(0, 4);
  const trendingListings = filteredListings.slice(0, 10);

  return (
    <View style={styles.container}>
      {/* ─── MODERN HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>StuMark</Text>
        </View>
        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for textbooks, phones, food..."
            placeholderTextColor={COLORS.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <X size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9900" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── HERO BANNER ─── */}
        <LinearGradient
          colors={['#FF9900', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerBadge}>
              <TrendingUp size={14} color="#FF9900" />
              <Text style={styles.bannerBadgeText}>Campus Deals</Text>
            </View>
            <Text style={styles.bannerTitle}>Buy & Sell with Students</Text>
            <Text style={styles.bannerSubtitle}>Verified campus marketplace</Text>
          </View>
          <View style={styles.heroDecoCircle1} />
          <View style={styles.heroDecoCircle2} />
        </LinearGradient>

        {/* ─── CATEGORIES ─── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            const Icon = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryItem, active && styles.categoryItemActive]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: active ? COLORS.primary : cat.bg }]}>
                  <Icon size={22} color={active ? COLORS.white : cat.color} strokeWidth={active ? 2.5 : 2} />
                </View>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── TODAY'S DEALS (HORIZONTAL) ─── */}
        {recentListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fresh Finds</Text>
              <TouchableOpacity style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealsScroll}>
              {recentListings.map((item) => (
                <View key={item.id} style={styles.dealCard}>
                  <View style={styles.dealImageWrap}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.dealImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.dealImagePlaceholder}>
                        <ShoppingBag size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
                      </View>
                    )}
                    {item.condition === 'new' && (
                      <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                    )}
                  </View>
                  <View style={styles.dealInfo}>
                    <Text style={styles.dealTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.dealPrice}>{formatPrice(item.price)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── TRENDING NOW (GRID) ─── */}
        {trendingListings.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: SPACING.lg }]}>
            <Text style={[styles.sectionTitle, { marginBottom: SPACING.sm }]}>Trending Now</Text>
            <View style={styles.grid}>
              {trendingListings.map((item) => (
                <TouchableOpacity key={item.id} style={styles.gridCard} activeOpacity={0.9}>
                  <View style={styles.gridImageWrap}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.gridImagePlaceholder}>
                        <ShoppingBag size={28} color={COLORS.textTertiary} strokeWidth={1.5} />
                      </View>
                    )}
                    <BlurView intensity={60} tint="light" style={styles.favoriteBtnOverlay}>
                      <TouchableOpacity onPress={() => toggleWishlist(item.id)} style={styles.favoriteBtnInner}>
                        <Heart
                          size={18}
                          color={wishlist.has(item.id) ? COLORS.error : COLORS.textPrimary}
                          fill={wishlist.has(item.id) ? COLORS.error : 'transparent'}
                        />
                      </TouchableOpacity>
                    </BlurView>
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.gridFooter}>
                      <Text style={styles.gridPrice}>{formatPrice(item.price)}</Text>
                      {item.campus_location && (
                        <View style={styles.gridLocationRow}>
                          <MapPin size={10} color={COLORS.textTertiary} />
                          <Text style={styles.gridLocationText} numberOfLines={1}>{item.campus_location}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {filteredListings.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <ShoppingBag size={48} color={COLORS.borderDark} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Nothing found</Text>
            <Text style={styles.emptySubtitle}>Try searching for something else or be the first to sell!</Text>
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* ─── FLOATING ACTION BUTTON ─── */}
      <TouchableOpacity style={styles.fab} onPress={openPost} activeOpacity={0.85}>
        <Plus size={24} color={COLORS.white} strokeWidth={2.5} />
        <Text style={styles.fabText}>Sell</Text>
      </TouchableOpacity>

      {/* ─── POST AD MODAL ─── */}
      <Modal visible={postOpen} transparent animationType="slide" onRequestClose={closePost}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>List an Item</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={closePost}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {postError && (
                <View style={styles.errorBox}>
                  <Text style={styles.modalError}>{postError}</Text>
                </View>
              )}

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    value={postTitle}
                    onChangeText={setPostTitle}
                    placeholder="What are you selling?"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Price (GH₵)</Text>
                  <TextInput
                    value={postPrice}
                    onChangeText={setPostPrice}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                    keyboardType="numeric"
                  />
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
                          <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                            {cond.charAt(0).toUpperCase() + cond.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    value={postDescription}
                    onChangeText={setPostDescription}
                    placeholder="Provide details about the item..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    value={postLocation}
                    onChangeText={setPostLocation}
                    placeholder="Where can buyers meet you?"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, posting && styles.submitBtnDisabled]}
                  onPress={submitPost}
                  disabled={posting}
                >
                  <Text style={styles.submitBtnText}>{posting ? 'Posting...' : 'Publish Listing'}</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTop: { marginBottom: SPACING.sm },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary },
  
  searchBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary },

  content: { flex: 1 },
  contentContainer: { paddingBottom: SPACING.xl },

  heroBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#FF9900',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  heroDecoCircle1: { position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroDecoCircle2: { position: 'absolute', bottom: -40, right: 40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  bannerContent: { zIndex: 1, alignItems: 'flex-start' },
  bannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: SPACING.md },
  bannerBadgeText: { fontFamily: FONT.bold, fontSize: 11, color: '#FF9900', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerTitle: { fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.white, marginBottom: 4 },
  bannerSubtitle: { fontFamily: FONT.medium, fontSize: 14, color: 'rgba(255,255,255,0.9)' },

  categories: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md, flexDirection: 'row' },
  categoryItem: { alignItems: 'center', gap: 8, width: 68 },
  categoryItemActive: {},
  categoryIconWrap: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  categoryLabelActive: { color: COLORS.textPrimary, fontFamily: FONT.bold },

  section: { marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },

  dealsScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  dealCard: {
    width: DEAL_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  dealImageWrap: { height: DEAL_CARD_WIDTH, backgroundColor: COLORS.background, position: 'relative' },
  dealImage: { width: '100%', height: '100%' },
  dealImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  newBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  newBadgeText: { fontFamily: FONT.bold, fontSize: 9, color: COLORS.white, letterSpacing: 0.5 },
  dealInfo: { padding: SPACING.sm, gap: 4 },
  dealTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  dealPrice: { fontFamily: FONT.bold, fontSize: 15, color: '#FF9900' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'space-between' },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  gridImageWrap: { height: GRID_CARD_WIDTH, position: 'relative', backgroundColor: COLORS.background },
  gridImage: { width: '100%', height: '100%' },
  gridImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  favoriteBtnOverlay: { position: 'absolute', top: 8, right: 8, borderRadius: 16, overflow: 'hidden' },
  favoriteBtnInner: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
  gridInfo: { padding: SPACING.md, gap: 6 },
  gridTitle: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  gridFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  gridPrice: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.textPrimary },
  gridLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, justifyContent: 'flex-end' },
  gridLocationText: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textTertiary, maxWidth: 60 },

  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  footerSpace: { height: 100 },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF9900',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#FF9900',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  fabText: { fontFamily: FONT.headingBold, fontSize: 16, color: COLORS.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: SPACING.sm, marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  modalTitle: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.textPrimary },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  errorBox: { backgroundColor: COLORS.errorLight, padding: SPACING.md, marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.md },
  modalError: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },
  modalBody: { padding: SPACING.lg },

  field: { gap: 8, marginBottom: SPACING.lg },
  label: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: '#F9FAFB',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: SPACING.md },
  rowItem: { flex: 1 },

  inlineChips: { gap: SPACING.sm, paddingVertical: 4 },
  smallChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  smallChipActive: { backgroundColor: `${COLORS.primary}10`, borderColor: COLORS.primary },
  smallChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, textTransform: 'capitalize' },
  smallChipTextActive: { color: COLORS.primary, fontFamily: FONT.bold },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.white },
});