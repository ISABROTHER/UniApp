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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Plus, Search, X, Tag, MapPin, Phone, ShoppingBag, TrendingUp, Sparkles, BadgeCheck } from 'lucide-react-native';

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

const CATEGORIES: { key: MarketCategory; label: string; emoji: string; gradient: string[] }[] = [
  { key: 'all', label: 'All Items', emoji: '🛍️', gradient: ['#667EEA', '#764BA2'] },
  { key: 'phones', label: 'Phones', emoji: '📱', gradient: ['#F093FB', '#F5576C'] },
  { key: 'laptops', label: 'Laptops', emoji: '💻', gradient: ['#4FACFE', '#00F2FE'] },
  { key: 'clothing', label: 'Fashion', emoji: '👕', gradient: ['#FA709A', '#FEE140'] },
  { key: 'services', label: 'Services', emoji: '⚡', gradient: ['#30CFD0', '#330867'] },
  { key: 'food', label: 'Food', emoji: '🍕', gradient: ['#FDBB2D', '#22C1C3'] },
  { key: 'other', label: 'Others', emoji: '📦', gradient: ['#A8EDEA', '#FED6E3'] },
];

const CONDITIONS = ['new', 'good', 'fair', 'used'] as const;

export default function UtilitiesScreen() {
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

  const filteredTitle = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat ? cat.label : 'All Items';
  }, [category]);

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

  const getCategoryColor = (cat: string | null) => {
    const found = CATEGORIES.find((c) => c.key === cat);
    return found ? found.gradient[0] : COLORS.textSecondary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <ShoppingBag size={24} color={COLORS.white} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.title}>StuMark</Text>
              <Text style={styles.subtitle}>Campus marketplace</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sellButton} onPress={openPost} activeOpacity={0.9}>
            <Sparkles size={16} color={COLORS.white} strokeWidth={2.5} />
            <Text style={styles.sellButtonText}>Sell</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Search size={20} color={COLORS.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for anything..."
              placeholderTextColor={COLORS.textTertiary}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => void fetchListings()}
            />
            {searchQuery.trim().length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  void fetchListings({ silent: true });
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
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
              style={[
                styles.categoryChip,
                active && { backgroundColor: cat.gradient[0] },
              ]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
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
            <Text style={styles.loadingText}>Loading marketplace...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <ShoppingBag size={48} color={COLORS.textTertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0
                ? 'Try searching for something else'
                : 'Be the first to list something!'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openPost} activeOpacity={0.9}>
              <Plus size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.emptyBtnText}>Post Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          listings.map((item) => {
            const catColor = getCategoryColor(item.category);
            return (
              <View key={item.id} style={styles.card}>
                <View style={[styles.cardImagePlaceholder, { backgroundColor: `${catColor}15` }]}>
                  <View style={[styles.cardImageIcon, { backgroundColor: `${catColor}30` }]}>
                    <ShoppingBag size={32} color={catColor} strokeWidth={2} />
                  </View>
                  {item.condition && (
                    <View style={[styles.conditionBadge, { backgroundColor: catColor }]}>
                      <Text style={styles.conditionText}>{item.condition}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>Price</Text>
                      <Text style={styles.priceValue}>{formatPrice(item.price)}</Text>
                    </View>
                  </View>

                  {item.description && item.description.length > 0 && (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}

                  <View style={styles.cardMeta}>
                    {item.category && (
                      <View style={[styles.metaChip, { backgroundColor: `${catColor}15` }]}>
                        <Tag size={13} color={catColor} />
                        <Text style={[styles.metaText, { color: catColor }]}>
                          {CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                        </Text>
                      </View>
                    )}

                    {item.campus_location && (
                      <View style={styles.metaChip}>
                        <MapPin size={13} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{item.campus_location}</Text>
                      </View>
                    )}

                    {item.seller_phone && (
                      <View style={styles.metaChip}>
                        <Phone size={13} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{item.seller_phone}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
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
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalIcon}>
                    <Plus size={20} color={COLORS.primary} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.modalTitle}>List an Item</Text>
                </View>
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
                    placeholder="Describe your item, its condition, etc."
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
                          <Text style={styles.categoryEmoji}>{c.emoji}</Text>
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
                    placeholder="e.g., Science market, Hall 3, Library..."
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
                  <Text style={styles.submitBtnText}>{posting ? 'Posting…' : 'Post Listing'}</Text>
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: '#667EEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.textPrimary },
  subtitle: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },

  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  sellButtonText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },

  searchWrapper: { paddingHorizontal: SPACING.lg },
  searchBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm + 2 : SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
  },

  categories: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  categoryEmoji: { fontSize: 16 },
  categoryText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textSecondary },
  categoryTextActive: { color: COLORS.white },

  content: { flex: 1 },
  contentContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loadingText: { fontFamily: FONT.medium, fontSize: 15, color: COLORS.textSecondary },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  emptyTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },
  emptySubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  emptyBtnText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardImagePlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardImageIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  conditionText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  cardBody: { padding: SPACING.md, gap: SPACING.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  cardTitle: { flex: 1, fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary, lineHeight: 22 },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textTertiary, marginBottom: 2 },
  priceValue: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.primary },
  cardDesc: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  metaText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },

  footerSpace: { height: 32 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },
  modalError: { marginBottom: SPACING.sm, fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.error },

  modalBody: { paddingTop: SPACING.xs, gap: SPACING.md },
  field: { gap: 6, marginBottom: SPACING.sm },
  label: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: SPACING.md },
  rowItem: { flex: 1 },

  inlineChips: { gap: SPACING.xs, paddingVertical: 2 },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  smallChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  smallChipText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  smallChipTextActive: { color: COLORS.white },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.white },
}); 