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
import { Plus, Search, X, MapPin, ShoppingBag, Star, Heart, Menu } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

type MarketCategory = 'all' | 'phones' | 'laptops' | 'clothing' | 'services' | 'food' | 'other';

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
};

const CATEGORIES: { key: MarketCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'phones', label: 'Phones' },
  { key: 'laptops', label: 'Laptops' },
  { key: 'clothing', label: 'Fashion' },
  { key: 'services', label: 'Services' },
  { key: 'food', label: 'Food' },
  { key: 'other', label: 'Others' },
];

const CONDITIONS = ['new', 'good', 'fair', 'used'] as const;

export default function StuMarkScreen() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<MarketCategory>('all');

  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postCategory, setPostCategory] = useState<Exclude<MarketCategory, 'all'>>('other');
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
          .select('id,seller_id,title,description,price,category,condition,campus_location,seller_phone,is_available,is_sold,created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (category !== 'all') query = query.eq('category', category);
        const q = searchQuery.trim();
        if (q.length > 0) query = query.ilike('title', `%${q}%`);
        query = query.eq('is_sold', false).eq('is_available', true);

        const { data, error } = await query;
        if (error) throw error;
        setListings((data ?? []) as MarketListing[]);
      } catch {
        setListings([]);
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
    setPostCategory('other');
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
  };

  const formatPrice = (value: number | string) => {
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return '₵0';
    return `₵${n.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <ShoppingBag size={24} color={COLORS.white} strokeWidth={2.5} />
            </View>
            <Text style={styles.logoText}>StuMark</Text>
          </View>
          <TouchableOpacity onPress={openPost} style={styles.addBtn} activeOpacity={0.8}>
            <Plus size={20} color={COLORS.white} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Sell</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search all categories"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => void fetchListings()}
          />
        </View>
      </View>

      <View style={styles.categoryBar}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryTab, active && styles.categoryTabActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && listings.length === 0 ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading items...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyBox}>
            <ShoppingBag size={56} color={COLORS.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0
                ? 'Try a different search term'
                : 'Be the first to list something!'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openPost}>
              <Plus size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.emptyBtnText}>List an Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productList}>
            {listings.map((item) => (
              <View key={item.id} style={styles.productCard}>
                <View style={styles.productImage}>
                  <ShoppingBag size={40} color={COLORS.textTertiary} strokeWidth={1.5} />
                  <TouchableOpacity style={styles.favoriteIcon}>
                    <Heart size={18} color={COLORS.error} strokeWidth={2} />
                  </TouchableOpacity>
                  {item.condition && (
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionText}>{item.condition.toUpperCase()}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  <View style={styles.ratingRow}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          color="#FFA41C"
                          fill={star <= 4 ? '#FFA41C' : 'transparent'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingCount}>4.0</Text>
                    <Text style={styles.reviewCount}>(245)</Text>
                  </View>

                  <View style={styles.priceRow}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.currency}>₵</Text>
                      <Text style={styles.price}>{typeof item.price === 'string' ? item.price : item.price.toLocaleString()}</Text>
                    </View>
                  </View>

                  {item.description && (
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}

                  {item.campus_location && (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={COLORS.textTertiary} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {item.campus_location}
                      </Text>
                    </View>
                  )}

                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryText}>FREE Campus Pickup</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      <Modal visible={postOpen} transparent animationType="slide" onRequestClose={closePost}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
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
                    <View style={styles.chipRow}>
                      {CONDITIONS.slice(0, 2).map((cond) => {
                        const active = postCondition === cond;
                        return (
                          <TouchableOpacity
                            key={cond}
                            style={[styles.smallChip, active && styles.smallChipActive]}
                            onPress={() => setPostCondition(cond)}
                          >
                            <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                              {cond}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.chipGrid}>
                    {CATEGORIES.filter((c) => c.key !== 'all').slice(0, 4).map((c) => {
                      const key = c.key as Exclude<MarketCategory, 'all'>;
                      const active = postCategory === key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          onPress={() => setPostCategory(key)}
                        >
                          <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    backgroundColor: '#131921',
    paddingTop: Platform.OS === 'ios' ? 50 : 42,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: '#FF9900',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontFamily: FONT.headingBold, fontSize: 22, color: '#FFFFFF' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF9900',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
  },
  addBtnText: { fontFamily: FONT.bold, fontSize: 13, color: '#FFFFFF' },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary },

  categoryBar: {
    flexDirection: 'row',
    backgroundColor: '#F7F8FA',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  categoryTab: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 2,
  },
  categoryTabActive: { borderBottomWidth: 2, borderBottomColor: '#FF9900' },
  categoryTabText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  categoryTabTextActive: { color: '#FF9900', fontFamily: FONT.semiBold },

  content: { flex: 1, backgroundColor: '#F7F8FA' },
  contentContainer: { padding: SPACING.lg },

  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
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

  productList: { gap: SPACING.md },
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: 140,
    height: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favoriteIcon: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: '#067647',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  conditionText: { fontFamily: FONT.bold, fontSize: 9, color: '#FFFFFF', letterSpacing: 0.5 },

  productInfo: { flex: 1, gap: 6 },
  productTitle: { fontFamily: FONT.medium, fontSize: 14, color: '#007185', lineHeight: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row', gap: 2 },
  ratingCount: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },
  reviewCount: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  priceRow: { marginTop: 2 },
  priceContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  currency: { fontFamily: FONT.regular, fontSize: 12, color: '#B12704', marginTop: 2 },
  price: { fontFamily: FONT.bold, fontSize: 20, color: '#B12704' },
  productDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, flex: 1 },
  deliveryInfo: { marginTop: 4 },
  deliveryText: { fontFamily: FONT.semiBold, fontSize: 12, color: '#067647' },

  footerSpace: { height: 20 },

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

  chipRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  chipGrid: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  smallChip: {
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: COLORS.white,
  },
  smallChipActive: { backgroundColor: '#FF9900', borderColor: '#FF9900' },
  smallChipText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  smallChipTextActive: { color: COLORS.white, fontFamily: FONT.semiBold },

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