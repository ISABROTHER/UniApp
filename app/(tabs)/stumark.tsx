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
import { Plus, Search, X, Tag, MapPin, Phone, Boxes, BadgeCheck } from 'lucide-react-native';

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
  { key: 'clothing', label: 'Clothing' },
  { key: 'services', label: 'Services' },
  { key: 'food', label: 'Food' },
  { key: 'other', label: 'Others' },
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
    const label = CATEGORIES.find((c) => c.key === category)?.label ?? 'StuMark';
    return category === 'all' ? 'StuMark' : `StuMark • ${label}`;
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
    if (!Number.isFinite(n)) return '₵0.00';
    return `₵${n.toFixed(2)}`;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Boxes size={22} color={COLORS.primary} />
          <View>
            <Text style={styles.title}>{filteredTitle}</Text>
            <Text style={styles.subtitle}>Student marketplace — buy & sell on campus</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.postButton} onPress={openPost} activeOpacity={0.85}>
          <Plus size={18} color={COLORS.white} />
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search phones, laptops, services..."
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
              <X size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map((c) => {
          const active = c.key === category;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Loading listings…</Text>
            <Text style={styles.stateSubtitle}>Fetching what&apos;s new on StuMark</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>No listings found</Text>
            <Text style={styles.stateSubtitle}>Try a different category or search term</Text>
            <TouchableOpacity style={styles.stateCta} onPress={openPost} activeOpacity={0.85}>
              <Plus size={18} color={COLORS.white} />
              <Text style={styles.stateCtaText}>Post the first one</Text>
            </TouchableOpacity>
          </View>
        ) : (
          listings.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                </View>

                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>

              <View style={styles.cardMetaRow}>
                <View style={styles.metaPill}>
                  <Tag size={14} color={COLORS.primary} />
                  <Text style={styles.metaText}>{(item.category ?? 'other').toString()}</Text>
                </View>
                <View style={styles.metaPill}>
                  <BadgeCheck size={14} color={COLORS.info} />
                  <Text style={styles.metaText}>{(item.condition ?? 'good').toString()}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.bottomLeft}>
                  <View style={styles.bottomItem}>
                    <MapPin size={14} color={COLORS.textSecondary} />
                    <Text style={styles.bottomText} numberOfLines={1}>
                      {(item.campus_location ?? 'On campus').toString()}
                    </Text>
                  </View>
                  {item.seller_phone ? (
                    <View style={styles.bottomItem}>
                      <Phone size={14} color={COLORS.textSecondary} />
                      <Text style={styles.bottomText}>{item.seller_phone}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      <Modal visible={postOpen} animationType="slide" transparent onRequestClose={closePost}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Post on StuMark</Text>
                <TouchableOpacity
                  onPress={closePost}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {postError ? <Text style={styles.modalError}>{postError}</Text> : null}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    value={postTitle}
                    onChangeText={setPostTitle}
                    placeholder="e.g., iPhone 12, HP Laptop, Hair braiding..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    value={postDescription}
                    onChangeText={setPostDescription}
                    placeholder="Short details (condition, what&apos;s included, etc.)"
                    placeholderTextColor={COLORS.textTertiary}
                    style={[styles.input, styles.textArea]}
                    multiline
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.field, styles.rowItem]}>
                    <Text style={styles.label}>Price (₵)</Text>
                    <TextInput
                      value={postPrice}
                      onChangeText={setPostPrice}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textTertiary}
                      style={styles.input}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.field, styles.rowItem]}>
                    <Text style={styles.label}>Condition</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.inlineChips}
                    >
                      {CONDITIONS.map((c) => {
                        const active = postCondition === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            style={[styles.smallChip, active ? styles.smallChipActive : null]}
                            onPress={() => setPostCondition(c)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.smallChipText, active ? styles.smallChipTextActive : null]}>
                              {c}
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
                          style={[styles.smallChip, active ? styles.smallChipActive : null]}
                          onPress={() => setPostCategory(key)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.smallChipText, active ? styles.smallChipTextActive : null]}>
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
                  style={[styles.submitBtn, posting ? styles.submitBtnDisabled : null]}
                  onPress={submitPost}
                  activeOpacity={0.85}
                  disabled={posting}
                >
                  <Text style={styles.submitBtnText}>{posting ? 'Posting…' : 'Post listing'}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  title: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  subtitle: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  postButtonText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  searchRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  searchBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },

  categories: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.sm },
  chip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: { backgroundColor: COLORS.primaryFaded, borderColor: COLORS.primary },
  chipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  content: { flex: 1 },
  contentContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  stateBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  stateTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary },
  stateSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  stateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  stateCtaText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTop: { gap: 6 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  cardTitle: { flex: 1, fontFamily: FONT.bold, fontSize: 15, color: COLORS.textPrimary },
  cardPrice: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.primary },
  cardDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.borderLight,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  metaText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'lowercase',
  },

  cardBottom: { marginTop: SPACING.md, gap: SPACING.sm },
  bottomLeft: { gap: 6 },
  bottomItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  bottomText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },

  footerSpace: { height: 28 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary },
  modalError: { marginTop: SPACING.sm, fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  modalBody: { paddingTop: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.md },
  field: { gap: 6 },
  label: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: SPACING.md },
  rowItem: { flex: 1 },

  inlineChips: { gap: SPACING.sm, paddingVertical: 2 },
  smallChip: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  smallChipActive: { backgroundColor: COLORS.primaryFaded, borderColor: COLORS.primary },
  smallChipText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'lowercase',
  },
  smallChipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

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