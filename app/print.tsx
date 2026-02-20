import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

// --- Constants from your Flutter Design ---
const BRAND_GREEN = '#00B37D';
const TEXT_DARK = '#1F1F1F';
const TEXT_MUTED = '#8A8A8A';
const BG_COLOR = '#F6F7F8';

// --- Mock Data adapted for DigiPrint ---
const PRINT_PLANS = [
  {
    id: '1',
    title: "STANDARD B&W",
    subtitle: "DAILY BLACK & WHITE PRINTING",
    type: "weekly",
    pricePerWeek: "GHS 15",
    maxDailyUse: "20 Pages",
    provider: "UniApp Print Services",
    allowedRoutes: [
      "Main Library Ground Floor",
      "Science Block Annex",
      "A4 Paper Size Only",
    ],
  },
  {
    id: '2',
    title: "PREMIUM COLOR",
    subtitle: "HIGH QUALITY COLOR & B&W",
    type: "monthly",
    pricePerWeek: "GHS 45",
    maxDailyUse: "50 Pages",
    provider: "UniApp Print Services",
    allowedRoutes: [
      "Main Library Ground Floor",
      "All Paper Sizes (A4, A3)",
      "Premium Glossy Paper Included",
    ],
  },
];

// --- Subcomponents ---
const KeyValueRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.keyValueRow}>
    <Text style={styles.keyLabel}>{label}</Text>
    <Text style={styles.valueLabel}>{value}</Text>
  </View>
);

const SubscriptionCard = ({ model }: { model: typeof PRINT_PLANS[0] }) => {
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.cardTitle}>{model.title}</Text>
      <Text style={styles.cardSubtitle}>{model.subtitle}</Text>
      
      <View style={styles.spacingMedium} />

      <KeyValueRow label="Type:" value={model.type} />
      <KeyValueRow label="Price/Week:" value={model.pricePerWeek} />
      <KeyValueRow label="Max Daily Use:" value={model.maxDailyUse} />
      <KeyValueRow label="Provider:" value={model.provider} />

      <View style={styles.spacingSmall} />

      <Text style={styles.routesHeader}>Included Printers / Rules:</Text>
      <View style={styles.spacingTiny} />

      {model.allowedRoutes.length > 0 && (
        <View style={styles.routesList}>
          {model.allowedRoutes.map((route, index) => (
            <View key={index} style={styles.routeItem}>
              <Text style={styles.routeBullet}>•  </Text>
              <Text style={styles.routeText}>{route}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.spacingMedium} />

      <TouchableOpacity style={styles.buyButton} activeOpacity={0.8}>
        <Text style={styles.buyButtonText}>Buy Now</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function DigiPrintScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>DigiPrint Subscriptions</Text>
        <View style={{ width: 40 }} /* Spacer to perfectly center the title */ />
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'all' ? styles.activeTabText : styles.inactiveTabText]}>
            All Subscriptions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my' && styles.activeTab]} 
          onPress={() => setActiveTab('my')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'my' ? styles.activeTabText : styles.inactiveTabText]}>
            My Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* List View */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'all' ? (
          PRINT_PLANS.map((plan) => (
            <SubscriptionCard key={plan.id} model={plan} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>You don't have any active subscriptions yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Header background matches safe area
  },
  
  // --- Header Styles ---
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 56,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  appBarTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },

  // --- Tab Bar Styles ---
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 48,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: BRAND_GREEN,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: BRAND_GREEN,
  },
  inactiveTabText: {
    color: '#9E9E9E',
  },

  // --- List Styles ---
  listContainer: {
    padding: 16,
    backgroundColor: BG_COLOR,
    flexGrow: 1,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: TEXT_MUTED,
    fontWeight: '500',
  },

  // --- Card Styles ---
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4, // Android shadow
  },
  cardTitle: {
    color: TEXT_DARK,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 6,
  },

  // --- Key Value Rows ---
  keyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  keyLabel: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 16, // Adjusted slightly from Flutter's 18 for better RN scaling
    fontWeight: '700',
  },
  valueLabel: {
    color: TEXT_DARK,
    fontSize: 16,
    fontWeight: '500',
  },

  // --- Routes / List ---
  routesHeader: {
    color: TEXT_MUTED,
    fontSize: 16,
    fontWeight: '700',
  },
  routesList: {
    paddingLeft: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  routeBullet: {
    fontSize: 16,
    color: TEXT_DARK,
  },
  routeText: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '500',
  },

  // --- Button ---
  buyButton: {
    width: '100%',
    height: 52,
    backgroundColor: BRAND_GREEN,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // --- Spacers ---
  spacingTiny: { height: 8 },
  spacingSmall: { height: 12 },
  spacingMedium: { height: 14 },
});