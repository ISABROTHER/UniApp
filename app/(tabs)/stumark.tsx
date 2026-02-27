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
  ImageBackground,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { 
  Plus, Search, X, MapPin, ShoppingBag, TrendingUp, Heart, ChevronRight,
  Smartphone, Laptop, Shirt, Briefcase, UtensilsCrossed, Package 
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const DEAL_CARD_WIDTH = width * 0.45;
const GRID_CARD_WIDTH = (width - SPACING.lg * 3) / 2;

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
  image_url?: string;
};

const CATEGORIES: { key: MarketCategory; label: string; icon: any }[] = [
  { key: 'all', label: 'All', icon: ShoppingBag },
  { key: 'phones', label: 'Phones', icon: Smartphone },
  { key: 'laptops', label: 'Laptops', icon: Laptop },
  { key: 'clothing', label: 'Fashion', icon: Shirt },
  { key: 'services', label: 'Services', icon: Briefcase },
  { key: 'food', label: 'Food', icon: UtensilsCrossed },
  { key: 'other', label: 'Others', icon: Package },
];

const CONDITIONS = ['new', 'good', 'fair', 'used'] as const;

const DUMMY_PRODUCTS: MarketListing[] = [
  { id: '1', seller_id: 'dummy-user-1', title: 'iPhone 13 Pro 256GB - Like New', description: '...', price: 2800, category: 'phones', condition: 'new', campus_location: 'Science Market, UCC', seller_phone: '0244123456', is_available: true, is_sold: false, created_at: new Date().toISOString(), image_url: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=500&q=80' },
  { id: '2', seller_id: 'dummy-user-2', title: 'Dell XPS 15 Laptop - Gaming Ready', description: '...', price: 4500, category: 'laptops', condition: 'good', campus_location: 'Hall 3, Near Library', seller_phone: '0201234567', is_available: true, is_sold: false, created_at: new Date().toISOString(), image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80' },
  { id: '3', seller_id: 'dummy-user-3', title: 'Adidas Campus 00s Sneakers - Size 42', description: '...', price: 450, category: 'clothing', condition: 'new', campus_location: 'Central Market', seller_phone: '0557654321', is_available: true, is_sold: false, created_at: new Date().toISOString(), image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80' },
  { id: '4', seller_id: 'dummy-user-4', title: 'Mathematics Tutoring - All Levels', description: '...', price: 50, category: 'services', condition: 'new', campus_location: 'Main Campus', seller_phone: '0246789012', is_available: true, is_sold: false, created_at: new Date().toISOString(), image_url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=500&q=80' },
  { id: '5', seller_id: 'dummy-user-5', title: 'Homemade Jollof & Chicken - Daily Special', description: '...', price: 25, category: 'food', condition: 'new', campus_location: 'Hall 7 Kitchen', seller_phone: '0209876543', is_available: true, is_sold: false, created_at: new Date().toISOString(), image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80' },
];

export default function StuMarkScreen() {
  const [listings, setListings] = useState<MarketListing[]>(DUMMY_PRODUCTS);
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

  // ... (your fetchListings, useFocusEffect, onRefresh, openPost, closePost, submitPost, formatPrice, filteredListings exactly as before) ...

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>StuMark</Text>
          <TouchableOpacity style={styles.sellButton} onPress={openPost}>
            <Plus size={20} color={COLORS.white} strokeWidth={2.5} />
            <Text style={styles.sellButtonText}>Sell</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search items on campus..." placeholderTextColor={COLORS.textTertiary} style={styles.searchInput} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        
        {/* BANNER WITH PICTURE + GREEN OVERLAY */}
        <View style={styles.heroBanner}>
          <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800' }} style={styles.heroImage} imageStyle={{ borderRadius: RADIUS.lg }}>
            <View style={styles.greenOverlay} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Campus Deals</Text>
              <Text style={styles.bannerSubtitle}>Shop smart, save more</Text>
            </View>
            <View style={styles.bannerBadge}>
              <TrendingUp size={16} color={COLORS.white} />
              <Text style={styles.bannerBadgeText}>Hot</Text>
            </View>
          </ImageBackground>
        </View>

        {/* CATEGORIES WITH CLEAN ICONS + INNOVATIVE ARROW */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.key;
              const Icon = cat.icon;
              return (
                <TouchableOpacity key={cat.key} style={[styles.categoryCard, active && styles.categoryCardActive]} onPress={() => setCategory(cat.key)} activeOpacity={0.8}>
                  <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                    <Icon size={20} color={active ? COLORS.white : COLORS.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {/* CLEAN NON-COVERING ARROW INDICATOR */}
          <View style={styles.scrollIndicator}>
            <View style={styles.arrowCircle}>
              <ChevronRight size={18} color={COLORS.primary} strokeWidth={3} />
            </View>
          </View>
        </View>

        {/* THIN SEPARATOR LINE */}
        <View style={styles.separator} />

        {/* YOUR ORIGINAL SECTIONS (Today's Deals + Trending) - unchanged except no star ratings */}
        { /* ... your original recentListings and trendingListings blocks ... */ }

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Your original Post Modal unchanged */}
      <Modal visible={postOpen} transparent animationType="slide" onRequestClose={closePost}>
        {/* ... your full modal code exactly as before ... */}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { /* your original header */ },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.textPrimary },
  sellButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.md, gap: 6 },
  sellButtonText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
  searchBox: { /* your original */ },
  content: { flex: 1 },
  heroBanner: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, height: 160, borderRadius: RADIUS.lg, overflow: 'hidden' },
  heroImage: { flex: 1 },
  greenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 128, 0, 0.65)' },
  bannerContent: { position: 'absolute', bottom: SPACING.lg, left: SPACING.lg },
  bannerTitle: { fontFamily: FONT.headingBold, fontSize: 26, color: COLORS.white },
  bannerSubtitle: { fontFamily: FONT.medium, fontSize: 14, color: 'rgba(255,255,255,0.95)' },
  bannerBadge: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  categoriesWrapper: { position: 'relative', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  categories: { flexDirection: 'row', gap: SPACING.sm, paddingRight: 70 },
  scrollIndicator: { position: 'absolute', right: SPACING.lg, top: '50%', transform: [{ translateY: -18 }], zIndex: 10 },
  arrowCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, elevation: 5 },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
  // ... all your original styles for section, dealCard, gridCard, modal etc. remain exactly the same ...
  dealInfo: { padding: SPACING.sm, gap: 4 },
  dealTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  dealPrice: { fontFamily: FONT.bold, fontSize: 16, color: '#B12704' },
  // no star rating styles
});