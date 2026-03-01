import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  MapPin,
  Clock,
  Plus,
  Minus,
  X,
  TruckIcon,
  ChefHat,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Category = 'All' | 'Restaurant' | 'Canteen' | 'Fast Food' | 'Snacks' | 'Drinks';

interface Vendor {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  image_url: string;
  rating: number;
  review_count: number;
  delivery_fee: number;
  min_order: number;
  is_active: boolean;
  opening_time?: string;
  closing_time?: string;
}

interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Order {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  status: string;
  estimated_delivery: string;
  driver_name?: string;
  driver_phone?: string;
  created_at: string;
  delivery_type?: string;
  special_instructions?: string;
}

type Screen = 'vendors' | 'menu' | 'checkout' | 'tracking';

const STATUS_STEPS = ['Placed', 'Preparing', 'Ready', 'Delivering', 'Delivered'];

export default function FoodScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [screen, setScreen] = useState<Screen>('vendors');
  const [category, setCategory] = useState<Category>('All');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    loadVendors();
    loadOrders();
  }, []);

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('food_vendors')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['Placed', 'Preparing', 'Ready', 'Delivering'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithVendors = await Promise.all(
        (data || []).map(async (order) => {
          const { data: vendor } = await supabase
            .from('food_vendors')
            .select('name')
            .eq('id', order.vendor_id)
            .single();
          return { ...order, vendor_name: vendor?.name };
        })
      );

      setOrders(ordersWithVendors);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadMenu = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('food_menu_items')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('is_available', true)
        .order('category');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  };

  const handleVendorPress = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    await loadMenu(vendor.id);
    setScreen('menu');
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartVisible(false);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCheckout = () => {
    setCartVisible(false);
    setScreen('checkout');
  };

  const placeOrder = async () => {
    if (!user || !selectedVendor) return;
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) return;

    try {
      const subtotal = getCartTotal();
      const deliveryFee = deliveryType === 'delivery' ? selectedVendor.delivery_fee : 0;
      const total = subtotal + deliveryFee;
      const estimatedMinutes = deliveryType === 'delivery' ? 35 : 20;

      const { data, error } = await supabase
        .from('food_orders')
        .insert({
          user_id: user.id,
          vendor_id: selectedVendor.id,
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          delivery_address: deliveryType === 'delivery' ? deliveryAddress : 'Pickup',
          delivery_type: deliveryType,
          special_instructions: specialInstructions || null,
          status: 'Placed',
          estimated_delivery: new Date(
            Date.now() + estimatedMinutes * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedOrder({ ...data, vendor_name: selectedVendor.name });
      setCart([]);
      setDeliveryAddress('');
      setSpecialInstructions('');
      setScreen('tracking');
      loadOrders();
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVendors();
    loadOrders();
  };

  const isVendorOpen = (vendor: Vendor) => {
    if (!vendor.opening_time || !vendor.closing_time) return true;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = vendor.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = vendor.closing_time.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    return currentTime >= openTime && currentTime < closeTime;
  };

  const filteredVendors =
    category === 'All'
      ? vendors
      : vendors.filter((v) => v.category === category);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => {
          if (screen === 'vendors') {
            router.back();
          } else if (screen === 'menu') {
            setScreen('vendors');
            setSelectedVendor(null);
            setMenuItems([]);
          } else {
            setScreen('menu');
          }
        }}
        style={styles.backButton}
      >
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {screen === 'vendors'
          ? 'Food Delivery'
          : screen === 'menu'
          ? selectedVendor?.name
          : screen === 'checkout'
          ? 'Checkout'
          : 'Order Tracking'}
      </Text>
      {screen === 'menu' && cart.length > 0 && (
        <TouchableOpacity
          onPress={() => setCartVisible(true)}
          style={styles.cartButton}
        >
          <ShoppingCart size={24} color={COLORS.primary} />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCategories = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      {(['All', 'Restaurant', 'Canteen', 'Fast Food', 'Snacks', 'Drinks'] as Category[]).map(
        (cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[
              styles.categoryButton,
              category === cat && styles.categoryButtonActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                category === cat && styles.categoryTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  );

  const renderVendorCard = (vendor: Vendor) => {
    const open = isVendorOpen(vendor);
    return (
      <TouchableOpacity
        key={vendor.id}
        style={[styles.vendorCard, !open && styles.vendorCardClosed]}
        onPress={() => open && handleVendorPress(vendor)}
        disabled={!open}
      >
        <Image
          source={{ uri: vendor.image_url }}
          style={[styles.vendorImage, !open && styles.vendorImageClosed]}
        />
        {!open && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeText}>Closed</Text>
          </View>
        )}
        <View style={styles.vendorInfo}>
          <Text style={[styles.vendorName, !open && styles.vendorNameClosed]}>
            {vendor.name}
          </Text>
          <Text style={styles.vendorCategory}>{vendor.category}</Text>
          {vendor.opening_time && vendor.closing_time && (
            <View style={styles.vendorHours}>
              <Clock size={14} color={open ? COLORS.success : COLORS.textTertiary} />
              <Text style={[styles.vendorHoursText, !open && styles.vendorHoursTextClosed]}>
                {vendor.opening_time} - {vendor.closing_time}
              </Text>
            </View>
          )}
          <View style={styles.vendorMeta}>
            <View style={styles.rating}>
              <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={styles.ratingText}>
                {vendor.rating.toFixed(1)} ({vendor.review_count})
              </Text>
            </View>
            <View style={styles.metaItem}>
              <TruckIcon size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>₦{vendor.delivery_fee}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>Min: ₦{vendor.min_order}</Text>
            </View>
          </View>
          <View style={styles.location}>
            <MapPin size={14} color={COLORS.textTertiary} />
            <Text style={styles.locationText}>{vendor.location}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    const cartItem = cart.find((i) => i.id === item.id);
    const quantity = cartItem?.quantity || 0;

    return (
      <View key={item.id} style={styles.menuItem}>
        <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.menuItemPrice}>₦{item.price.toFixed(2)}</Text>
        </View>
        {quantity > 0 ? (
          <View style={styles.quantityControl}>
            <TouchableOpacity
              onPress={() => removeFromCart(item.id)}
              style={styles.quantityButton}
            >
              <Minus size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => addToCart(item)}
              style={styles.quantityButton}
            >
              <Plus size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => addToCart(item)}
            style={styles.addButton}
          >
            <Plus size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCart = () => (
    <Modal visible={cartVisible} animationType="slide" transparent>
      <View style={styles.cartModal}>
        <View style={styles.cartContent}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Your Cart</Text>
            <TouchableOpacity onPress={() => setCartVisible(false)}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.cartItems}>
            {cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>
                    ₦{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.id)}
                    style={styles.quantityButton}
                  >
                    <Minus size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => addToCart(item)}
                    style={styles.quantityButton}
                  >
                    <Plus size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₦{getCartTotal().toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                ₦{selectedVendor?.delivery_fee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelTotal}>Total</Text>
              <Text style={styles.summaryValueTotal}>
                ₦
                {(getCartTotal() + (selectedVendor?.delivery_fee || 0)).toFixed(
                  2
                )}
              </Text>
            </View>
          </View>
          <View style={styles.cartActions}>
            <TouchableOpacity
              onPress={clearCart}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCheckout}
              style={styles.checkoutButton}
            >
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCheckout = () => (
    <View style={styles.checkoutContainer}>
      <ScrollView style={styles.checkoutScroll}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TextInput
          style={styles.addressInput}
          placeholder="Enter your delivery address"
          placeholderTextColor={COLORS.textTertiary}
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          multiline
        />

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.orderSummary}>
          {cart.map((item) => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.summaryItemPrice}>
                ₦{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₦{getCartTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>
              ₦{selectedVendor?.delivery_fee.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRowTotal}>
            <Text style={styles.summaryLabelTotal}>Total</Text>
            <Text style={styles.summaryValueTotal}>
              ₦
              {(getCartTotal() + (selectedVendor?.delivery_fee || 0)).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={placeOrder}
        style={[
          styles.placeOrderButton,
          !deliveryAddress.trim() && styles.placeOrderButtonDisabled,
        ]}
        disabled={!deliveryAddress.trim()}
      >
        <Text style={styles.placeOrderButtonText}>Place Order</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTracking = () => {
    if (!selectedOrder) return null;

    const currentStepIndex = STATUS_STEPS.indexOf(selectedOrder.status);

    return (
      <ScrollView style={styles.trackingContainer}>
        <View style={styles.trackingCard}>
          <Text style={styles.trackingTitle}>Order #{selectedOrder.id.slice(0, 8)}</Text>
          <Text style={styles.trackingVendor}>{selectedOrder.vendor_name}</Text>

          <View style={styles.statusTrack}>
            {STATUS_STEPS.map((step, index) => (
              <View key={step} style={styles.statusStep}>
                <View
                  style={[
                    styles.statusIcon,
                    index <= currentStepIndex && styles.statusIconActive,
                  ]}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 size={20} color={COLORS.white} />
                  ) : index === currentStepIndex ? (
                    <Clock size={20} color={COLORS.white} />
                  ) : (
                    <View style={styles.statusIconInactive} />
                  )}
                </View>
                <Text
                  style={[
                    styles.statusLabel,
                    index <= currentStepIndex && styles.statusLabelActive,
                  ]}
                >
                  {step}
                </Text>
                {index < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.statusLine,
                      index < currentStepIndex && styles.statusLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          {selectedOrder.driver_name && (
            <View style={styles.driverInfo}>
              <TruckIcon size={24} color={COLORS.primary} />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{selectedOrder.driver_name}</Text>
                <Text style={styles.driverPhone}>{selectedOrder.driver_phone}</Text>
              </View>
            </View>
          )}

          <View style={styles.estimatedTime}>
            <Clock size={20} color={COLORS.textSecondary} />
            <Text style={styles.estimatedText}>
              Estimated delivery: {new Date(selectedOrder.estimated_delivery).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {selectedOrder.items.map((item: any, index: number) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.orderItemName}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.orderItemPrice}>
                ₦{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderActiveOrders = () => (
    <View style={styles.activeOrdersSection}>
      <View style={styles.activeOrdersHeader}>
        <Text style={styles.activeOrdersTitle}>Active Orders</Text>
        <TouchableOpacity onPress={() => setShowActiveOrders(!showActiveOrders)}>
          <Text style={styles.toggleText}>
            {showActiveOrders ? 'Hide' : 'Show'} ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>
      {showActiveOrders &&
        orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.activeOrderCard}
            onPress={() => {
              setSelectedOrder(order);
              setScreen('tracking');
            }}
          >
            <View style={styles.activeOrderHeader}>
              <Text style={styles.activeOrderVendor}>{order.vendor_name}</Text>
              <Text style={styles.activeOrderStatus}>{order.status}</Text>
            </View>
            <Text style={styles.activeOrderId}>#{order.id.slice(0, 8)}</Text>
            <Text style={styles.activeOrderTotal}>₦{order.total.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}

      {screen === 'vendors' && (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {orders.length > 0 && renderActiveOrders()}
          {renderCategories()}
          <View style={styles.vendorsList}>
            {filteredVendors.map((vendor) => renderVendorCard(vendor))}
          </View>
        </ScrollView>
      )}

      {screen === 'menu' && (
        <ScrollView style={styles.content}>
          <View style={styles.menuList}>
            {menuItems.map((item) => renderMenuItem(item))}
          </View>
        </ScrollView>
      )}

      {screen === 'checkout' && renderCheckout()}
      {screen === 'tracking' && renderTracking()}
      {renderCart()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.md,
  },
  cartButton: {
    position: 'relative',
    padding: SPACING.xs,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    marginRight: SPACING.sm,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  vendorsList: {
    padding: SPACING.md,
  },
  vendorCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vendorImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.borderLight,
  },
  vendorInfo: {
    padding: SPACING.md,
  },
  vendorName: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  vendorCategory: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  menuList: {
    padding: SPACING.md,
  },
  menuItem: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
  },
  menuItemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuItemName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  menuItemDesc: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  menuItemPrice: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quantityButton: {
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  quantityText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  cartModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cartContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cartTitle: {
    fontSize: 20,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  cartItems: {
    maxHeight: 300,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cartItemPrice: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.primary,
  },
  cartSummary: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  summaryValueTotal: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  cartActions: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  clearButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.primary,
  },
  checkoutButton: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  checkoutContainer: {
    flex: 1,
  },
  checkoutScroll: {
    flex: 1,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  addressInput: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderSummary: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryItemName: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  placeOrderButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  trackingContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  trackingCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  trackingTitle: {
    fontSize: 20,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  trackingVendor: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  statusTrack: {
    marginBottom: SPACING.lg,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconActive: {
    backgroundColor: COLORS.primary,
  },
  statusIconInactive: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
    marginLeft: SPACING.md,
  },
  statusLabelActive: {
    color: COLORS.textPrimary,
  },
  statusLine: {
    position: 'absolute',
    left: 20,
    top: 40,
    width: 2,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statusLineActive: {
    backgroundColor: COLORS.primary,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  driverDetails: {
    marginLeft: SPACING.md,
  },
  driverName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  driverPhone: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  estimatedText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  orderItems: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  orderItemName: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  orderItemPrice: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  activeOrdersSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  activeOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activeOrdersTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  activeOrderCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  activeOrderVendor: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  activeOrderStatus: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  activeOrderId: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  activeOrderTotal: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
});
