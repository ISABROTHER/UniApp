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
  Plus,
  Search,
  X,
  MapPin,
  ShoppingBag,
  Star,
  TrendingUp,
  Heart,
  ChevronRight,
  Smartphone,
  Laptop,
  Shirt,
  Briefcase,
  UtensilsCrossed,
  Package,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const DEAL_CARD_WIDTH = width * 0.45;
const GRID_CARD_WIDTH = (width - SPACING.lg * 3) / 2;

/* -------------------- LOCAL PRODUCT IMAGES -------------------- */
/* image_url stays STRING — UI CODE NOT TOUCHED */

const IPHONE_13_PRO = Image.resolveAssetSource(
  require('@/assets/products/iphone13pro.jpg')
).uri;

const DELL_XPS_15 = Image.resolveAssetSource(
  require('@/assets/products/dellxps15.jpg')
).uri;

const ADIDAS_CAMPUS_00S = Image.resolveAssetSource(
  require('@/assets/products/adidas-campus-00s.jpg')
).uri;

const MATH_TUTORING = Image.resolveAssetSource(
  require('@/assets/products/math-tutoring.jpg')
).uri;

const JOLLOF_CHICKEN = Image.resolveAssetSource(
  require('@/assets/products/jollof-chicken.jpg')
).uri;

/* -------------------- TYPES -------------------- */

type MarketCategory =
  | 'all'
  | 'phones'
  | 'laptops'
  | 'clothing'
  | 'services'
  | 'food'
  | 'other';

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

/* -------------------- DUMMY PRODUCTS (CORRECT IMAGES) -------------------- */

const DUMMY_PRODUCTS: MarketListing[] = [
  {
    id: '1',
    seller_id: 'dummy-user-1',
    title: 'iPhone 13 Pro 256GB - Like New',
    description: 'Barely used, excellent condition.',
    price: 2800,
    category: 'phones',
    condition: 'new',
    campus_location: 'Science Market, UCC',
    seller_phone: '0244123456',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: IPHONE_13_PRO,
  },
  {
    id: '2',
    seller_id: 'dummy-user-2',
    title: 'Dell XPS 15 Laptop',
    description: 'Intel i7, 16GB RAM, 512GB SSD.',
    price: 4500,
    category: 'laptops',
    condition: 'good',
    campus_location: 'Hall 3',
    seller_phone: '0201234567',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: DELL_XPS_15,
  },
  {
    id: '3',
    seller_id: 'dummy-user-3',
    title: 'Adidas Campus 00s Sneakers',
    description: 'Brand new, size 42.',
    price: 450,
    category: 'clothing',
    condition: 'new',
    campus_location: 'Central Market',
    seller_phone: '0557654321',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: ADIDAS_CAMPUS_00S,
  },
  {
    id: '4',
    seller_id: 'dummy-user-4',
    title: 'Mathematics Tutoring',
    description: 'All levels, experienced tutor.',
    price: 50,
    category: 'services',
    condition: 'new',
    campus_location: 'Main Campus',
    seller_phone: '0246789012',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: MATH_TUTORING,
  },
  {
    id: '5',
    seller_id: 'dummy-user-5',
    title: 'Homemade Jollof & Chicken',
    description: 'Fresh daily.',
    price: 25,
    category: 'food',
    condition: 'new',
    campus_location: 'Hall 7 Kitchen',
    seller_phone: '0209876543',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),
    image_url: JOLLOF_CHICKEN,
  },
];

/* -------------------- SCREEN -------------------- */

export default function StuMarkScreen() {
  const [listings, setListings] = useState<MarketListing[]>(DUMMY_PRODUCTS);

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.grid}>
          {listings.map((item) => (
            <View key={item.id} style={styles.gridCard}>
              <View style={styles.gridImage}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <ShoppingBag size={28} color={COLORS.textTertiary} />
                )}
              </View>
              <View style={styles.gridInfo}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>₵{item.price}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  gridImage: {
    height: GRID_CARD_WIDTH * 0.9,
    backgroundColor: '#F9FAFB',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  gridInfo: {
    padding: SPACING.md,
  },
  title: {
    fontFamily: FONT.medium,
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
});