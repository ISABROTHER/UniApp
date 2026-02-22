import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, LAUNDRY_TRACKING_STEPS, LAUNDRY_PASS_PLANS, QUICK_TOPUP_AMOUNTS, LAUNDRY_STATUS_COLORS } from '@/lib/constants';
import { LaundryOrder, LaundryWallet, LaundryProvider, LaundryPass, LaundryPreferences } from '@/lib/types';
import { ShoppingBag, Wallet, Package, CreditCard, Settings, Plus, Check, Phone, Star, Zap, Leaf, DoorOpen, ChevronRight } from 'lucide-react-native';
import PaystackModal from '@/components/PaystackModal';

const TABS = [
  { key: 'Book', label: 'Book', icon: ShoppingBag },
  { key: 'Orders', label: 'Orders', icon: Package },
  { key: 'Wallet', label: 'Wallet', icon: Wallet },
  { key: 'Pass', label: 'Pass', icon: CreditCard },
  { key: 'Preferences', label: 'Prefs', icon: Settings },
];

function AnimatedTab({ tabKey, label, icon: Icon, active, onPress }: {
  tabKey: string; label: string; icon: typeof ShoppingBag;
  active: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevActive = useRef(active);

  if (prevActive.current !== active) {
    prevActive.current = active;
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.tabTouch}>
      <Animated.View style={[styles.tab, active && styles.tabActive, { transform: [{ scale }] }]}>
        <Icon size={16} color={active ? COLORS.white : COLORS.textSecondary} strokeWidth={active ? 2.2 : 1.8} />
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ToggleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function LaundryScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Book');
  const [providers, setProviders] = useState<LaundryProvider[]>([]);
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [wallet, setWallet] = useState<LaundryWallet | null>(null);
  const [activePass, setActivePass] = useState<LaundryPass | null>(null);
  const [prefs, setPrefs] = useState<LaundryPreferences | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<LaundryProvider | null>(null);
  const [weight, setWeight] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isExpress, setIsExpress] = useState(false);
  const [isEco, setIsEco] = useState(false);
  const [isDoor, setIsDoor] = useState(true);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);

  const fetchAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [provRes, ordRes, walRes, passRes, prefRes] = await Promise.all([
        supabase.from('laundry_providers').select('*').eq('is_active', true).order('rating', { ascending: false }),
        supabase.from('laundry_orders').select('*, laundry_providers(name, phone, rating)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('laundry_wallet').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('laundry_passes').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('laundry_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      setProviders((provRes.data || []) as LaundryProvider[]);
      setOrders((ordRes.data || []) as LaundryOrder[]);
      setWallet(walRes.data as LaundryWallet | null);
      setActivePass(passRes.data as LaundryPass | null);
      setPrefs(prefRes.data as LaundryPreferences | null);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const calcPrice = () => {
    if (!selectedProvider || !weight) return 0;
    const base = parseFloat(weight) * selectedProvider.price_per_kg;
    const express = isExpress ? base * 0.5 : 0;
    const eco = isEco ? -base * 0.1 : 0;
    return Math.max(0, base + express + eco);
  };

  const handleBookPickup = async () => {
    setBookingError('');
    if (!selectedProvider) return setBookingError('Please select a provider');
    if (!weight || isNaN(parseFloat(weight))) return setBookingError('Enter a valid weight');
    if (!pickupAddress.trim()) return setBookingError('Enter pickup address');
    if (!deliveryAddress.trim()) return setBookingError('Enter delivery address');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const total = calcPrice();
    const { error } = await supabase.from('laundry_orders').insert({
      user_id: user.id,
      provider_id: selectedProvider.id,
      weight_kg: parseFloat(weight),
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      delivery_type: isDoor ? 'door' : 'drop_point',
      express: isExpress,
      eco_wash: isEco,
      total_price: total,
      status: 'pending',
      escrow_held: true,
    });

    if (error) return setBookingError(error.message);
    setBookingSuccess(true);
    setWeight(''); setPickupAddress(''); setDeliveryAddress('');
    setIsExpress(false); setIsEco(false);
    fetchAll();
    setTimeout(() => setBookingSuccess(false), 4000);
  };

  const handleTopup = async () => {
    const amount = topupAmount ?? parseFloat(customAmount);
    if (!amount || amount <= 0) return;
    setPayModalVisible(true);
  };

  const handlePaymentSuccess = async (ref: string) => {
    setPayModalVisible(false);
    const amount = topupAmount ?? parseFloat(customAmount);
    if (!amount || amount <= 0) return;
    setTopupLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setTopupLoading(false); return; }

    const newBalance = (wallet?.balance || 0) + amount;
    if (!wallet) {
      await supabase.from('laundry_wallet').insert({ user_id: user.id, balance: amount });
    } else {
      await supabase.from('laundry_wallet').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    }
    await supabase.from('laundry_transactions').insert({
      user_id: user.id, type: 'topup', amount,
      description: 'Wallet top-up', reference: ref, balance_after: newBalance,
    });
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'wallet_topup',
      title: '👝 Laundry Wallet Funded',
      message: `GH₵${amount.toFixed(2)} added. New balance: GH₵${newBalance.toFixed(2)}.`,
      read: false,
    });
    setTopupLoading(false);
    setTopupAmount(null);
    setCustomAmount('');
    fetchAll();
  };

  const handleBuyPass = async (plan: typeof LAUNDRY_PASS_PLANS[0]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + (plan.id === 'semester' ? 5 : 1));
    await supabase.from('laundry_passes').insert({
      user_id: user.id, plan_name: plan.id, washes_total: plan.washes,
      price_paid: plan.price, valid_until: validUntil.toISOString().split('T')[0],
    });
    fetchAll();
  };

  const handleSavePrefs = async (updates: Partial<LaundryPreferences>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const merged = { ...(prefs || {}), ...updates };
    if (prefs) {
      await supabase.from('laundry_preferences').update(merged).eq('user_id', user.id);
    } else {
      await supabase.from('laundry_preferences').insert({ user_id: user.id, ...merged });
    }
    fetchAll();
  };

  const currentPrefs = prefs || { detergent_type: 'regular', wash_temperature: 'warm', fold_style: 'standard', ironing_enabled: false };
  const getStepIndex = (status: string) => LAUNDRY_TRACKING_STEPS.findIndex((s) => s.step === status);

  return (
    <View style={[styles.container]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.pageTitle}>Laundry</Text>
            <Text style={styles.pageSubtitle}>Clean clothes, zero hassle</Text>
          </View>
          {wallet && (
            <View style={styles.walletPill}>
              <Wallet size={14} color={COLORS.primary} />
              <Text style={styles.walletPillText}>GH₵{wallet.balance.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <AnimatedTab
              key={t.key}
              tabKey={t.key}
              label={t.label}
              icon={t.icon}
              active={activeTab === t.key}
              onPress={() => setActiveTab(t.key)}
            />
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {activeTab === 'Book' && (
          <>
            {bookingSuccess && (
              <View style={styles.successBanner}>
                <View style={styles.successIcon}><Check size={18} color={COLORS.white} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>Order Placed!</Text>
                  <Text style={styles.successSub}>A rider will be assigned shortly.</Text>
                </View>
              </View>
            )}

            {bookingError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{bookingError}</Text>
              </View>
            ) : null}

            <SectionHeader title="Choose Provider" />
            {providers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Package size={32} color={COLORS.textTertiary} />
                <Text style={styles.emptyText}>No providers available</Text>
              </View>
            ) : (
              providers.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.providerCard, selectedProvider?.id === p.id && styles.providerCardActive]}
                  onPress={() => setSelectedProvider(p)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.providerAvatar, selectedProvider?.id === p.id && styles.providerAvatarActive]}>
                    <Text style={styles.providerAvatarText}>{p.name[0]}</Text>
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{p.name}</Text>
                    <View style={styles.providerMetaRow}>
                      <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
                      <Text style={styles.providerMetaText}>{p.rating.toFixed(1)} ({p.review_count})</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.providerMetaText}>GH₵{p.price_per_kg}/kg</Text>
                    </View>
                    {p.phone && (
                      <View style={styles.providerMetaRow}>
                        <Phone size={11} color={COLORS.textTertiary} />
                        <Text style={styles.providerPhoneText}>{p.phone}</Text>
                      </View>
                    )}
                  </View>
                  {selectedProvider?.id === p.id && (
                    <View style={styles.selectedCheck}>
                      <Check size={14} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}

            <SectionHeader title="Order Details" />
            <View style={styles.formCard}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 3.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Pickup Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  placeholder="Where should we collect from?"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Delivery Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Where should we deliver to?"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </View>

            <SectionHeader title="Add-ons" />
            <View style={styles.addonsGrid}>
              <TouchableOpacity
                style={[styles.addonCard, isExpress && styles.addonCardActive]}
                onPress={() => setIsExpress(!isExpress)}
                activeOpacity={0.8}
              >
                <View style={[styles.addonIconBox, isExpress && styles.addonIconBoxActive]}>
                  <Zap size={20} color={isExpress ? COLORS.white : COLORS.warning} />
                </View>
                <Text style={[styles.addonLabel, isExpress && styles.addonLabelActive]}>Express</Text>
                <Text style={[styles.addonPrice, isExpress && styles.addonPriceActive]}>+50%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addonCard, isEco && styles.addonCardActive]}
                onPress={() => setIsEco(!isEco)}
                activeOpacity={0.8}
              >
                <View style={[styles.addonIconBox, isEco && { backgroundColor: COLORS.success }]}>
                  <Leaf size={20} color={isEco ? COLORS.white : COLORS.success} />
                </View>
                <Text style={[styles.addonLabel, isEco && styles.addonLabelActive]}>Eco Wash</Text>
                <Text style={[styles.addonPrice, isEco && styles.addonPriceActive]}>-10%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addonCard, isDoor && styles.addonCardActive]}
                onPress={() => setIsDoor(!isDoor)}
                activeOpacity={0.8}
              >
                <View style={[styles.addonIconBox, isDoor && styles.addonIconBoxActive]}>
                  <DoorOpen size={20} color={isDoor ? COLORS.white : COLORS.accent} />
                </View>
                <Text style={[styles.addonLabel, isDoor && styles.addonLabelActive]}>Door Delivery</Text>
                <Text style={[styles.addonPrice, isDoor && styles.addonPriceActive]}>Included</Text>
              </TouchableOpacity>
            </View>

            {calcPrice() > 0 && (
              <View style={styles.priceSummaryCard}>
                <Text style={styles.priceSummaryLabel}>Estimated Total</Text>
                <Text style={styles.priceSummaryValue}>GH₵{calcPrice().toFixed(2)}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.bookBtn} onPress={handleBookPickup} activeOpacity={0.85}>
              <ShoppingBag size={20} color={COLORS.white} />
              <Text style={styles.bookBtnText}>Book Pickup</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'Orders' && (
          <>
            {orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyStateTitle}>No orders yet</Text>
                <Text style={styles.emptyStateSub}>Your laundry orders will appear here.</Text>
              </View>
            ) : (
              orders.map((order) => {
                const stepIdx = getStepIndex(order.status);
                const statusColor = LAUNDRY_STATUS_COLORS[order.status] || COLORS.textSecondary;
                const prov = order.provider as any;
                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderAvatarSmall}>
                        <Text style={styles.orderAvatarText}>{(prov?.name || 'P')[0]}</Text>
                      </View>
                      <View style={styles.orderHeaderInfo}>
                        <Text style={styles.orderProvider}>{prov?.name || 'Provider'}</Text>
                        <Text style={styles.orderWeight}>{order.weight_kg}kg · GH₵{order.total_price}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {order.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {(order.express || order.eco_wash) && (
                      <View style={styles.orderTags}>
                        {order.express && <View style={styles.expressTag}><Zap size={10} color={COLORS.warning} /><Text style={styles.expressTagText}>Express</Text></View>}
                        {order.eco_wash && <View style={styles.ecoTag}><Leaf size={10} color={COLORS.success} /><Text style={styles.ecoTagText}>Eco</Text></View>}
                      </View>
                    )}

                    <View style={styles.trackingBar}>
                      {LAUNDRY_TRACKING_STEPS.map((s, idx) => (
                        <View key={s.step} style={styles.trackStep}>
                          <View style={[styles.trackDot, idx <= stepIdx && styles.trackDotActive]} />
                          {idx < LAUNDRY_TRACKING_STEPS.length - 1 && (
                            <View style={[styles.trackLine, idx < stepIdx && styles.trackLineActive]} />
                          )}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.trackStatus}>
                      {LAUNDRY_TRACKING_STEPS[stepIdx]?.label || 'Processing'} · Step {stepIdx + 1}/{LAUNDRY_TRACKING_STEPS.length}
                    </Text>

                    {order.rider_name && (
                      <View style={styles.riderInfo}>
                        <Phone size={12} color={COLORS.textTertiary} />
                        <Text style={styles.riderText}>{order.rider_name} · {order.rider_phone}</Text>
                      </View>
                    )}

                    {order.status === 'delivered' && !order.delivered_at && (
                      <TouchableOpacity style={styles.confirmBtn} onPress={async () => {
                        await supabase.from('laundry_orders').update({
                          status: 'completed',
                          delivered_at: new Date().toISOString(),
                          escrow_held: false,
                          escrow_released_at: new Date().toISOString(),
                        }).eq('id', order.id);
                        fetchAll();
                      }}>
                        <Check size={15} color={COLORS.white} />
                        <Text style={styles.confirmBtnText}>Confirm Delivery</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'Wallet' && (
          <>
            <View style={styles.walletHeroCard}>
              <View style={styles.walletHeroTop}>
                <Wallet size={24} color={COLORS.white} strokeWidth={1.5} />
                <Text style={styles.walletHeroLabel}>Laundry Wallet</Text>
              </View>
              <Text style={styles.walletHeroBalance}>GH₵{(wallet?.balance || 0).toFixed(2)}</Text>
              <Text style={styles.walletHeroSub}>Available balance</Text>
            </View>

            <SectionHeader title="Top Up" />
            <View style={styles.topupGrid}>
              {QUICK_TOPUP_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.topupChip, topupAmount === a && styles.topupChipActive]}
                  onPress={() => { setTopupAmount(a); setCustomAmount(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.topupChipText, topupAmount === a && styles.topupChipTextActive]}>GH₵{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formCard}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Custom Amount (GH₵)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={customAmount}
                  onChangeText={(v) => { setCustomAmount(v); setTopupAmount(null); }}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.bookBtn} onPress={handleTopup} activeOpacity={0.85}>
              <Plus size={20} color={COLORS.white} />
              <Text style={styles.bookBtnText}>{topupLoading ? 'Processing...' : 'Top Up Wallet'}</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'Pass' && (
          <>
            {activePass && (
              <View style={styles.activePassCard}>
                <View style={styles.activePassRow}>
                  <View>
                    <Text style={styles.activePassLabel}>Active Pass</Text>
                    <Text style={styles.activePassName}>{activePass.plan_name.charAt(0).toUpperCase() + activePass.plan_name.slice(1)} Plan</Text>
                  </View>
                  <View style={styles.activePassWashesBadge}>
                    <Text style={styles.activePassWashesNum}>{activePass.washes_total - activePass.washes_used}</Text>
                    <Text style={styles.activePassWashesLabel}>washes left</Text>
                  </View>
                </View>
                <View style={styles.activePassProgress}>
                  <View style={[styles.activePassProgressFill, { width: `${((activePass.washes_total - activePass.washes_used) / activePass.washes_total) * 100}%` }]} />
                </View>
                <Text style={styles.activePassExpiry}>Expires {new Date(activePass.valid_until).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
            )}

            <SectionHeader title="Subscription Plans" />
            {LAUNDRY_PASS_PLANS.map((plan) => (
              <View key={plan.id} style={[styles.planCard, plan.badge === 'Best Value' && styles.planCardHighlight]}>
                {plan.badge && (
                  <View style={[styles.planBadge, plan.badge === 'Best Value' && styles.planBadgeGold]}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <View style={styles.planLeft}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDesc}>{plan.description}</Text>
                  </View>
                  <View style={styles.planPriceBox}>
                    <Text style={styles.planPrice}>GH₵{plan.price}</Text>
                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.planBtn} onPress={() => handleBuyPass(plan)} activeOpacity={0.85}>
                  <Text style={styles.planBtnText}>Subscribe</Text>
                  <ChevronRight size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {activeTab === 'Preferences' && (
          <>
            <SectionHeader title="Wash Settings" />
            <View style={styles.prefCard}>
              <Text style={styles.prefGroupLabel}>Detergent</Text>
              <View style={styles.prefChipRow}>
                {(['regular', 'sensitive', 'eco'] as const).map((d) => (
                  <ToggleChip
                    key={d}
                    label={d.charAt(0).toUpperCase() + d.slice(1)}
                    active={currentPrefs.detergent_type === d}
                    onPress={() => handleSavePrefs({ detergent_type: d })}
                  />
                ))}
              </View>

              <View style={styles.prefDivider} />

              <Text style={styles.prefGroupLabel}>Temperature</Text>
              <View style={styles.prefChipRow}>
                {(['cold', 'warm', 'hot'] as const).map((t) => (
                  <ToggleChip
                    key={t}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                    active={currentPrefs.wash_temperature === t}
                    onPress={() => handleSavePrefs({ wash_temperature: t })}
                  />
                ))}
              </View>

              <View style={styles.prefDivider} />

              <Text style={styles.prefGroupLabel}>Fold Style</Text>
              <View style={styles.prefChipRow}>
                {(['standard', 'flat', 'rolled'] as const).map((f) => (
                  <ToggleChip
                    key={f}
                    label={f.charAt(0).toUpperCase() + f.slice(1)}
                    active={currentPrefs.fold_style === f}
                    onPress={() => handleSavePrefs({ fold_style: f })}
                  />
                ))}
              </View>

              <View style={styles.prefDivider} />

              <View style={styles.prefToggleRow}>
                <View>
                  <Text style={styles.prefGroupLabel}>Ironing</Text>
                  <Text style={styles.prefToggleSub}>Iron clothes after wash</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, currentPrefs.ironing_enabled && styles.toggleActive]}
                  onPress={() => handleSavePrefs({ ironing_enabled: !currentPrefs.ironing_enabled })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.toggleKnob, currentPrefs.ironing_enabled && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <PaystackModal
        visible={payModalVisible}
        amount={topupAmount ?? parseFloat(customAmount || '0')}
        label="Laundry Wallet Top-Up"
        onSuccess={handlePaymentSuccess}
        onClose={() => setPayModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  pageTitle: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary },
  pageSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  walletPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryFaded, paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: RADIUS.full,
  },
  walletPillText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.primary },

  tabRow: {
    flexDirection: 'row', gap: SPACING.xs,
    paddingTop: 2,
  },
  tabTouch: { flex: 1 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: RADIUS.md,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white, fontFamily: FONT.semiBold },

  content: { padding: SPACING.md },

  sectionHeader: {
    fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.success, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  successIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  successTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
  successSub: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  errorBanner: {
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: `${COLORS.error}30`,
  },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  providerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border, gap: SPACING.sm,
  },
  providerCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  providerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center',
  },
  providerAvatarActive: { backgroundColor: COLORS.primary },
  providerAvatarText: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.white },
  providerInfo: { flex: 1 },
  providerName: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 4 },
  providerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  providerMetaText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  providerPhoneText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textTertiary },
  selectedCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  formField: { padding: SPACING.md },
  fieldLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary,
    paddingVertical: 4,
  },
  fieldDivider: { height: 1, backgroundColor: COLORS.borderLight },

  addonsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  addonCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  addonCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  addonIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center',
  },
  addonIconBoxActive: { backgroundColor: COLORS.primary },
  addonLabel: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textPrimary, textAlign: 'center' },
  addonLabelActive: { color: COLORS.primary },
  addonPrice: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textTertiary },
  addonPriceActive: { color: COLORS.primary },

  priceSummaryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  priceSummaryLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  priceSummaryValue: { fontFamily: FONT.headingBold, fontSize: 22, color: COLORS.primary },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 16, marginTop: SPACING.xs,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  bookBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textTertiary },

  emptyState: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.sm },
  emptyStateTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary },
  emptyStateSub: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },

  orderCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  orderAvatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center',
  },
  orderAvatarText: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.white },
  orderHeaderInfo: { flex: 1 },
  orderProvider: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  orderWeight: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FONT.semiBold, fontSize: 11 },
  orderTags: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  expressTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.warningLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  expressTagText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.warning },
  ecoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  ecoTagText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.success },

  trackingBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  trackStep: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  trackDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.borderLight },
  trackDotActive: { backgroundColor: COLORS.primary },
  trackLine: { flex: 1, height: 2, backgroundColor: COLORS.borderLight },
  trackLineActive: { backgroundColor: COLORS.primary },
  trackStatus: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  riderInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  riderText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.success, borderRadius: RADIUS.md,
    paddingVertical: 10, marginTop: SPACING.sm,
  },
  confirmBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  walletHeroCard: {
    backgroundColor: COLORS.navy, borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.sm,
  },
  walletHeroTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  walletHeroLabel: { fontFamily: FONT.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  walletHeroBalance: { fontFamily: FONT.headingBold, fontSize: 40, color: COLORS.white, marginBottom: 4 },
  walletHeroSub: { fontFamily: FONT.regular, fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  topupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  topupChip: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
  },
  topupChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  topupChipText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  topupChipTextActive: { color: COLORS.white },

  activePassCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.sm,
  },
  activePassRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  activePassLabel: { fontFamily: FONT.medium, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  activePassName: { fontFamily: FONT.headingBold, fontSize: 20, color: COLORS.white },
  activePassWashesBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 8 },
  activePassWashesNum: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.white },
  activePassWashesLabel: { fontFamily: FONT.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  activePassProgress: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: SPACING.sm, overflow: 'hidden' },
  activePassProgressFill: { height: '100%', backgroundColor: COLORS.white, borderRadius: 3 },
  activePassExpiry: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  planCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  planCardHighlight: { borderColor: COLORS.warning, borderWidth: 1.5 },
  planBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 5,
    borderBottomLeftRadius: RADIUS.md,
  },
  planBadgeGold: { backgroundColor: COLORS.warning },
  planBadgeText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.white },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm, paddingRight: 80 },
  planLeft: { flex: 1 },
  planName: { fontFamily: FONT.semiBold, fontSize: 17, color: COLORS.textPrimary, marginBottom: 3 },
  planDesc: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  planPriceBox: { alignItems: 'flex-end' },
  planPrice: { fontFamily: FONT.headingBold, fontSize: 24, color: COLORS.primary },
  planPeriod: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginTop: -2 },
  planBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11,
  },
  planBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },

  prefCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  prefGroupLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  prefChipRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.sm },
  prefDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  prefToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  prefToggleSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.white },

  toggle: {
    width: 50, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border, paddingHorizontal: 3,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
});