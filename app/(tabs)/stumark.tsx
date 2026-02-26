import { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Plus, Search, X, Tag, MapPin, Phone, ShoppingBag, Heart, Star } from 'lucide-react-native';

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
          .select(
            'id,seller_id,title,description,price,category,condition,campus_location,seller_phone,is_available,is_sold,created_at',
          )
          .order('created_at', { ascending: false });

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const q = searchQuery.trim();
        if (q.length > 0) {
          query = query.ilike('title', `%${q}%`);
        }

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

  const openPost = useCallback(() => {
    setPostError(null);
    setPostTitle('');
    setPostDescription('');
    setPostPrice('');
    setPostCategory('other');
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

  const formatPrice = useCallback((value: number | string) => {
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return '₵0';
    return `₵${n.toLocaleString()}`;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search items..."
              placeholderTextColor={COLORS.textTertiary}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => void fetchListings()}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openPost} activeOpacity={0.8}>
            <Plus size={22} color={COLORS.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && listings.length === 0 ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyBox}>
            <ShoppingBag size={48} color={COLORS.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0
                ? 'Try a different search'
                : 'Be the first to list something!'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openPost} activeOpacity={0.9}>
              <Plus size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.emptyBtnText}>List Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {listings.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardImage}>
                  <View style={styles.imagePlaceholder}>
                    <ShoppingBag size={36} color={COLORS.textTertiary} strokeWidth={1.5} />
                  </View>
                  <TouchableOpacity style={styles.favoriteBtn} activeOpacity={0.7}>
                    <Heart size={18} color={COLORS.error} strokeWidth={2} />
                  </TouchableOpacity>
                  {item.condition && (
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionText}>{item.condition}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                  </View>
                  {item.campus_location && (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={COLORS.textTertiary} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {item.campus_location}
                      </Text>
                    </View>
                  )}
                  <View style={styles.ratingRow}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>3.6</Text>
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
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.inlineChips}
                    >
                      {CONDITIONS.map((cond) => {
                        const active = postCondition === cond;
                        return (
                          <TouchableOpacity
                            key={cond}
                            style={[styles.smallChip, active && styles.smallChipActive]}
                            onPress={() => setPostCondition(cond)}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[styles.smallChipText, active && styles.smallChipTextActive]}
                            >
                              {cond}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.inlineChips}
                  >
                    {CATEGORIES.filter((c) => c.key !== 'all').map((c) => {
                      const key = c.key as Exclude<MarketCategory, 'all'>;
                      const active = postCategory === key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[styles.smallChip, active && styles.smallChipActive]}
                          onPress={() => setPostCategory(key)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                            {c.label}
                          </Text>
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
                  activeOpacity={0.9}
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  searchRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  searchBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  categories: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  categoryChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  categoryChipActive: { backgroundColor: '#16A34A' },
  categoryText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  categoryTextActive: { color: COLORS.white },

  content: { flex: 1 },
  contentContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loadingText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  emptyTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  emptyBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH,
    position: 'relative',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: '#16A34A',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  conditionText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.white,
    textTransform: 'capitalize',
  },

  cardBody: { padding: SPACING.sm, gap: 4 },
  cardTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  cardPrice: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textSecondary },

  footerSpace: { height: 32 },

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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontFamily: FONT.bold, fontSize: 17, color: COLORS.textPrimary },
  modalError: { marginBottom: SPACING.sm, fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  modalBody: { paddingTop: SPACING.xs },
  field: { gap: 6, marginBottom: SPACING.md },
  label: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  smallChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  smallChipText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  smallChipTextActive: { color: COLORS.white },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },
});