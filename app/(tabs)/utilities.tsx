import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Animated, Easing, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ShoppingBag, Search, Tag, Package, Plus, X, ChevronRight,
  Bookmark, Clock, CheckCircle, Star, MapPin, Phone, MessageCircle,
  TrendingUp, Grid, List,
} from 'lucide-react-native';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'textbooks', label: 'Textbooks' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'food', label: 'Food & Snacks' },
  { key: 'services', label: 'Services' },
  { key: 'other', label: 'Other' },
];

const CONDITIONS = ['new', 'like_new', 'good', 'fair'];
const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

interface MarketListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  seller_id: string;
  seller_name?: string;
  seller_phone?: string;
  campus_location?: string;
  is_available: boolean;
  is_sold: boolean;
  created_at: string;
  views: number;
  saves: number;
}

function AnimatedTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevActive = useRef(active);

  if (prevActive.current !== active) {
    prevActive.current = active;
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[styles.catChip, active && styles.catChipActive, { transform: [{ scale }] }]}>
        <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function ListingCard({ listing, onPress, onSave }: { listing: MarketListing; onPress: () => void; onSave: () => void }) {
  const conditionColor = {
    new: COLORS.success, like_new: COLORS.accent, good: COLORS.warning, fair: COLORS.textSecondary,
  }[listing.condition] || COLORS.textSecondary;

  return (
    <TouchableOpacity style={styles.listingCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.listingImgPlaceholder}>
        <Tag size={28} color={COLORS.textTertiary} />
      </View>
      <View style={styles.listingBody}>
        <View style={styles.listingTop}>
          <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
          <TouchableOpacity onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Bookmark size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.listingPrice}>GH₵{listing.price.toLocaleString()}</Text>
        <View style={styles.listingMeta}>
          <View style={[styles.conditionBadge, { backgroundColor: `${conditionColor}15` }]}>
            <View style={[styles.conditionDot, { backgroundColor: conditionColor }]} />
            <Text style={[styles.conditionText, { color: conditionColor }]}>
              {CONDITION_LABELS[listing.condition] || listing.condition}
            </Text>
          </View>
          {listing.campus_location && (
            <View style={styles.locationRow}>
              <MapPin size={11} color={COLORS.textTertiary} />
              <Text style={styles.locationText} numberOfLines={1}>{listing.campus_location}</Text>
            </View>
          )}
        </View>
        <View style={styles.listingFooter}>
          <Text style={styles.sellerName}>{listing.seller_name || 'Student'}</Text>
          <Text style={styles.listingTime}>{timeSince(listing.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function timeSince(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function StuMarkScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'browse' | 'sell' | 'my_listings'>('browse');
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);

  const [sellTitle, setSellTitle] = useState('');
  const [sellDesc, setSellDesc] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCategory, setSellCategory] = useState('other');
  const [sellCondition, setSellCondition] = useState('good');
  const [sellLocation, setSellLocation] = useState('');
  const [sellPhone, setSellPhone] = useState('');
  const [sellError, setSellError] = useState('');
  const [sellSuccess, setSellSuccess] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data } = await supabase
        .from('market_listings')
        .select('*, profiles(full_name, phone)')
        .eq('is_sold', false)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(50);

      const processed = (data || []).map((l: any) => ({
        ...l,
        seller_name: l.profiles?.full_name,
        seller_phone: l.profiles?.phone,
      })) as MarketListing[];

      setListings(processed);

      if (user) {
        const { data: mine } = await supabase
          .from('market_listings')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        setMyListings((mine || []) as MarketListing[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handlePost = async () => {
    setSellError('');
    if (!sellTitle.trim()) return setSellError('Enter a title');
    if (!sellPrice || isNaN(parseFloat(sellPrice))) return setSellError('Enter a valid price');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSellError('Sign in to post a listing');

    setSellLoading(true);
    const { error } = await supabase.from('market_listings').insert({
      seller_id: user.id,
      title: sellTitle.trim(),
      description: sellDesc.trim(),
      price: parseFloat(sellPrice),
      category: sellCategory,
      condition: sellCondition,
      campus_location: sellLocation.trim(),
      seller_phone: sellPhone.trim(),
      is_available: true,
      is_sold: false,
      views: 0,
      saves: 0,
    });

    setSellLoading(false);
    if (error) return setSellError(error.message);

    setSellSuccess(true);
    setSellTitle(''); setSellDesc(''); setSellPrice('');
    setSellCategory('other'); setSellCondition('good');
    setSellLocation(''); setSellPhone('');
    fetchData();
    setTimeout(() => { setSellSuccess(false); setActiveView('browse'); }, 2500);
  };

  const handleMarkSold = async (id: string) => {
    await supabase.from('market_listings').update({ is_sold: true, is_available: false }).eq('id', id);
    fetchData();
  };

  const filteredListings = listings.filter((l) => {
    const matchesCat = activeCategory === 'all' || l.category === activeCategory;
    const matchesSearch = !searchQuery.trim() ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const stats = {
    total: listings.length,
    categories: new Set(listings.map(l => l.category)).size,
    recent: listings.filter(l => Date.now() - new Date(l.created_at).getTime() < 86400000).length,
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.brandRow}>
              <ShoppingBag size={20} color={COLORS.primary} />
              <Text style={styles.brandName}>StuMark</Text>
            </View>
            <Text style={styles.brandTagline}>Campus marketplace for students</Text>
          </View>
          <TouchableOpacity style={styles.postBtn} onPress={() => setActiveView('sell')} activeOpacity={0.85}>
            <Plus size={16} color={COLORS.white} />
            <Text style={styles.postBtnText}>Sell</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, activeView === 'browse' && styles.viewToggleBtnActive]}
            onPress={() => setActiveView('browse')}
          >
            <Grid size={14} color={activeView === 'browse' ? COLORS.primary : COLORS.textTertiary} />
            <Text style={[styles.viewToggleText, activeView === 'browse' && styles.viewToggleTextActive]}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, activeView === 'my_listings' && styles.viewToggleBtnActive]}
            onPress={() => setActiveView('my_listings')}
          >
            <List size={14} color={activeView === 'my_listings' ? COLORS.primary : COLORS.textTertiary} />
            <Text style={[styles.viewToggleText, activeView === 'my_listings' && styles.viewToggleTextActive]}>My Listings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeView === 'browse' && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catsRow}
            contentContainerStyle={styles.catsContent}
          >
            {CATEGORIES.map((c) => (
              <AnimatedTab key={c.key} label={c.label} active={activeCategory === c.key} onPress={() => setActiveCategory(c.key)} />
            ))}
          </ScrollView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary} />}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          >
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <TrendingUp size={13} color={COLORS.primary} />
                <Text style={styles.statPillText}>{stats.total} listings</Text>
              </View>
              <View style={styles.statPill}>
                <Clock size={13} color={COLORS.warning} />
                <Text style={styles.statPillText}>{stats.recent} today</Text>
              </View>
              <View style={styles.statPill}>
                <Tag size={13} color={COLORS.accent} />
                <Text style={styles.statPillText}>{stats.categories} categories</Text>
              </View>
            </View>

            {filteredListings.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <ShoppingBag size={52} color={COLORS.textTertiary} />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No results found' : 'No listings yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? 'Try a different search term' : 'Be the first to post something for sale!'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity style={styles.emptyAction} onPress={() => setActiveView('sell')}>
                    <Text style={styles.emptyActionText}>Post a listing</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => setSelectedListing(listing)}
                onSave={async () => {
                  await supabase.from('market_listings').update({ saves: listing.saves + 1 }).eq('id', listing.id);
                  fetchData();
                }}
              />
            ))}
          </ScrollView>
        </>
      )}

      {activeView === 'my_listings' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <Text style={styles.sectionLabel}>Your Listings ({myListings.length})</Text>

          {myListings.length === 0 && (
            <View style={styles.emptyState}>
              <Package size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Post items to sell to fellow students.</Text>
              <TouchableOpacity style={styles.emptyAction} onPress={() => setActiveView('sell')}>
                <Text style={styles.emptyActionText}>Post first listing</Text>
                <ChevronRight size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}

          {myListings.map((l) => (
            <View key={l.id} style={[styles.myListingCard, l.is_sold && styles.myListingCardSold]}>
              <View style={styles.myListingTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.myListingTitle} numberOfLines={1}>{l.title}</Text>
                  <Text style={styles.myListingPrice}>GH₵{l.price.toLocaleString()}</Text>
                </View>
                <View style={[styles.availBadge, l.is_sold && styles.soldBadge]}>
                  {l.is_sold ? <CheckCircle size={12} color={COLORS.textSecondary} /> : <CheckCircle size={12} color={COLORS.success} />}
                  <Text style={[styles.availText, l.is_sold && styles.soldText]}>
                    {l.is_sold ? 'Sold' : 'Available'}
                  </Text>
                </View>
              </View>
              <View style={styles.myListingMeta}>
                <Text style={styles.myListingMetaText}>{timeSince(l.created_at)}</Text>
                <View style={styles.myListingStats}>
                  <Text style={styles.myListingMetaText}>{l.views} views</Text>
                  <Text style={styles.myListingMetaText}>·</Text>
                  <Text style={styles.myListingMetaText}>{l.saves} saves</Text>
                </View>
              </View>
              {!l.is_sold && (
                <TouchableOpacity style={styles.markSoldBtn} onPress={() => handleMarkSold(l.id)}>
                  <CheckCircle size={15} color={COLORS.success} />
                  <Text style={styles.markSoldText}>Mark as Sold</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {activeView === 'sell' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sellHeader}>
              <TouchableOpacity onPress={() => setActiveView('browse')} style={styles.backBtn}>
                <X size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.sellTitle}>New Listing</Text>
            </View>

            {sellSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle size={20} color={COLORS.white} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>Posted!</Text>
                  <Text style={styles.successSub}>Your listing is now live on StuMark.</Text>
                </View>
              </View>
            )}

            {sellError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{sellError}</Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={sellTitle}
                  onChangeText={setSellTitle}
                  placeholder="e.g. Engineering Textbook Year 2"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Price (GH₵) *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextArea]}
                  value={sellDesc}
                  onChangeText={setSellDesc}
                  placeholder="Describe the item, any defects, why you're selling..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Campus Location</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={sellLocation}
                  onChangeText={setSellLocation}
                  placeholder="e.g. Unity Hall, Legon"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={sellPhone}
                  onChangeText={setSellPhone}
                  placeholder="e.g. 0244123456"
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.chipsWrap}>
              {CATEGORIES.filter(c => c.key !== 'all').map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.sellChip, sellCategory === c.key && styles.sellChipActive]}
                  onPress={() => setSellCategory(c.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sellChipText, sellCategory === c.key && styles.sellChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Condition</Text>
            <View style={styles.chipsWrap}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.sellChip, sellCondition === c && styles.sellChipActive]}
                  onPress={() => setSellCondition(c)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sellChipText, sellCondition === c && styles.sellChipTextActive]}>{CONDITION_LABELS[c]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.postListingBtn} onPress={handlePost} activeOpacity={0.85}>
              <ShoppingBag size={20} color={COLORS.white} />
              <Text style={styles.postListingBtnText}>{sellLoading ? 'Posting...' : 'Post Listing'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Modal visible={!!selectedListing} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedListing && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedListing.title}</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedListing(null)}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalPrice}>GH₵{selectedListing.price.toLocaleString()}</Text>

                <View style={styles.modalMetaRow}>
                  <View style={[styles.conditionBadge, { backgroundColor: `${COLORS.accent}15` }]}>
                    <Text style={[styles.conditionText, { color: COLORS.accent }]}>
                      {CONDITION_LABELS[selectedListing.condition]}
                    </Text>
                  </View>
                  <View style={[styles.conditionBadge, { backgroundColor: COLORS.background }]}>
                    <Tag size={11} color={COLORS.textSecondary} />
                    <Text style={[styles.conditionText, { color: COLORS.textSecondary }]}>
                      {CATEGORIES.find(c => c.key === selectedListing.category)?.label || selectedListing.category}
                    </Text>
                  </View>
                </View>

                {selectedListing.description ? (
                  <Text style={styles.modalDesc}>{selectedListing.description}</Text>
                ) : null}

                <View style={styles.sellerCard}>
                  <View style={styles.sellerAvatar}>
                    <Text style={styles.sellerAvatarText}>{(selectedListing.seller_name || 'S')[0]}</Text>
                  </View>
                  <View style={styles.sellerInfo}>
                    <Text style={styles.sellerCardName}>{selectedListing.seller_name || 'Student Seller'}</Text>
                    {selectedListing.campus_location && (
                      <View style={styles.sellerMetaRow}>
                        <MapPin size={12} color={COLORS.textTertiary} />
                        <Text style={styles.sellerMetaText}>{selectedListing.campus_location}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.postedAt}>{timeSince(selectedListing.created_at)}</Text>
                </View>

                {(selectedListing.seller_phone || selectedListing.seller_phone) && (
                  <View style={styles.contactRow}>
                    <TouchableOpacity style={styles.contactBtn}>
                      <Phone size={18} color={COLORS.white} />
                      <Text style={styles.contactBtnText}>Call Seller</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.contactBtn, styles.contactBtnSecondary]}>
                      <MessageCircle size={18} color={COLORS.primary} />
                      <Text style={[styles.contactBtnText, styles.contactBtnSecondaryText]}>Message</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.white, paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  brandName: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.textPrimary },
  brandTagline: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  postBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 42, marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary },

  viewToggleRow: { flexDirection: 'row', gap: SPACING.sm },
  viewToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  viewToggleBtnActive: { backgroundColor: COLORS.primaryFaded, borderColor: COLORS.primary },
  viewToggleText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textTertiary },
  viewToggleTextActive: { color: COLORS.primary },

  catsRow: { backgroundColor: COLORS.white, maxHeight: 52, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catsContent: { paddingHorizontal: SPACING.md, gap: SPACING.xs, alignItems: 'center', paddingVertical: 10 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  catChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  catChipTextActive: { color: COLORS.white, fontFamily: FONT.semiBold },

  content: { padding: SPACING.md },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
  },
  statPillText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },

  listingCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  listingImgPlaceholder: {
    height: 120, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  listingBody: { padding: SPACING.md },
  listingTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  listingTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  listingPrice: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.primary, marginBottom: SPACING.sm },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  conditionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  conditionDot: { width: 5, height: 5, borderRadius: 2.5 },
  conditionText: { fontFamily: FONT.semiBold, fontSize: 11 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, maxWidth: 140 },
  listingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sellerName: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },
  listingTime: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  emptyState: { alignItems: 'center', paddingTop: SPACING.xxl, paddingBottom: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary },
  emptySub: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.lg },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  emptyActionText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary },

  sectionLabel: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: SPACING.sm, marginTop: SPACING.md },

  myListingCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  myListingCardSold: { opacity: 0.6 },
  myListingTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  myListingTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 3 },
  myListingPrice: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.primary },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  soldBadge: { backgroundColor: COLORS.background },
  availText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.success },
  soldText: { color: COLORS.textSecondary },
  myListingMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  myListingMetaText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  myListingStats: { flexDirection: 'row', gap: 6 },
  markSoldBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: COLORS.success,
    borderRadius: RADIUS.md, paddingVertical: 9,
  },
  markSoldText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.success },

  sellHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  sellTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.success, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  successTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
  successSub: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  errorBanner: {
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: `${COLORS.error}30`,
  },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  formField: { padding: SPACING.md },
  fieldLabel: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, paddingVertical: 4 },
  fieldTextArea: { minHeight: 72, paddingVertical: 4 },
  fieldDivider: { height: 1, backgroundColor: COLORS.borderLight },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
  sellChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  sellChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  sellChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },
  sellChipTextActive: { color: COLORS.white },

  postListingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 16, marginTop: SPACING.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  postListingBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
  modalTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  modalPrice: { fontFamily: FONT.headingBold, fontSize: 32, color: COLORS.primary, marginBottom: SPACING.sm },
  modalMetaRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  modalDesc: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.md },

  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center',
  },
  sellerAvatarText: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.white },
  sellerInfo: { flex: 1 },
  sellerCardName: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: 3 },
  sellerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerMetaText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  postedAt: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  contactRow: { flexDirection: 'row', gap: SPACING.sm },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13,
  },
  contactBtnSecondary: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary },
  contactBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
  contactBtnSecondaryText: { color: COLORS.primary },
});
