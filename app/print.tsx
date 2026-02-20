import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, RADIUS } from '@/lib/constants';
import {
  ArrowLeft,
  Wallet,
  Clock,
  Printer,
  FileCheck,
  Truck,
  CheckCircle,
  MessageSquare,
  Copy,
  Trash2,
  Shield,
  AlertCircle,
} from 'lucide-react-native';

// --- Design Constants based on your Flutter UI ---
const BRAND_GREEN = '#00B37D';
const TEXT_DARK = '#1F1F1F';
const TEXT_MUTED = '#8A8A8A';
const BG_COLOR = '#F6F7F8';

const PRINT_STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Printing', icon: Printer },
  { key: 'ready', label: 'Ready', icon: FileCheck },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
  { key: 'completed', label: 'Delivered', icon: CheckCircle },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  ready: '#14B8A6',
  out_for_delivery: BRAND_GREEN,
  completed: BRAND_GREEN,
  cancelled: '#EF4444',
};

// --- Types from original file ---
type PrintShop = {
  id: string;
  name: string;
  location: string;
  campus_proximity: string;
  rating: number;
  review_count: number;
  price_per_page_bw: number;
  price_per_page_color: number;
  supports_delivery: boolean;
  supports_pickup: boolean;
  operating_hours: string;
};

type PrintJob = {
  id: string;
  shop_id: string;
  document_name: string;
  file_name: string;
  file_size_kb: number;
  page_count: number;
  copies: number;
  color_mode: string;
  paper_size: string;
  binding: string;
  double_sided: boolean;
  delivery_type: string;
  delivery_address: string | null;
  total_price: number;
  status: string;
  pickup_code: string | null;
  estimated_ready_at: string | null;
  completed_at: string | null;
  special_instructions: string | null;
  created_at: string;
  file_deleted_at: string | null;
  sender_file_kept: boolean;
  printer_confirmed_at: string | null;
  deletion_scheduled_at: string | null;
  safe_print_agreed: boolean;
  shop?: PrintShop;
};

function getStepIndex(status: string) {
  return PRINT_STATUS_STEPS.findIndex((s) => s.key === status);
}

function timeSince(ts: string) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

function deletionCountdown(scheduledAt: string | null) {
  if (!scheduledAt) return null;
  const remaining = new Date(scheduledAt).getTime() - Date.now();
  if (remaining <= 0) return 'Deleting now...';
  const mins = Math.ceil(remaining / 60000);
  return `${mins}m remaining`;
}

// --- Subcomponents ---
const KeyValueRow = ({ label, value, valueColor = TEXT_DARK }: { label: string; value: string; valueColor?: string }) => (
  <View style={styles.keyValueRow}>
    <Text style={styles.keyLabel}>{label}</Text>
    <Text style={[styles.valueLabel, { color: valueColor }]}>{value}</Text>
  </View>
);

export default function PrintScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'new' | 'jobs'>('new');
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [wallet, setWallet] = useState(0);
  const [completedJobCount, setCompletedJobCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [shopsRes, jobsRes, walletRes] = await Promise.all([
        supabase.from('print_shops').select('*').eq('is_active', true).order('rating', { ascending: false }),
        supabase.from('print_jobs').select('*, shop:print_shops(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('print_wallet').select('balance').eq('user_id', user.id).maybeSingle(),
      ]);

      const allJobs = (jobsRes.data || []) as PrintJob[];
      setShops((shopsRes.data || []) as PrintShop[]);
      setJobs(allJobs);
      setWallet(walletRes.data?.balance ?? 0);
      setCompletedJobCount(allJobs.filter(j => j.status === 'completed').length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const activeJobs = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
  const pastJobs = jobs.filter((j) => ['completed', 'cancelled'].includes(j.status));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={styles.container}>
      {/* AppBar matching Flutter design */}
      <View style={[styles.appBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.appBarTitle}>DigiPrint</Text>
        
        <TouchableOpacity style={styles.walletBtn} activeOpacity={0.8}>
          <Wallet size={16} color={BRAND_GREEN} />
          <Text style={styles.walletText}>GH₵{wallet.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>

      {/* TabBar matching Flutter design */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, tab === 'new' && styles.activeTab]} 
          onPress={() => setTab('new')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'new' ? styles.activeTabText : styles.inactiveTabText]}>
            Print Centres
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, tab === 'jobs' && styles.activeTab]} 
          onPress={() => setTab('jobs')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'jobs' ? styles.activeTabText : styles.inactiveTabText]}>
            My Prints {activeJobs.length > 0 ? `(${activeJobs.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GREEN} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={BRAND_GREEN} style={{ marginTop: 40 }} />
        ) : tab === 'new' ? (
          <>
            {shops.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No active print centres found.</Text>
              </View>
            ) : (
              shops.map((shop) => {
                const services = [];
                if (shop.supports_delivery) services.push("Campus Delivery Available");
                if (shop.supports_pickup) services.push("Walk-in Pickup Allowed");
                services.push(`Rating: ${shop.rating} (${shop.review_count} reviews)`);

                return (
                  <View key={shop.id} style={styles.cardContainer}>
                    <Text style={styles.cardTitle}>{shop.name.toUpperCase()}</Text>
                    <Text style={styles.cardSubtitle}>LOCATED AT {shop.location.toUpperCase()}</Text>
                    
                    <View style={styles.spacingMedium} />

                    <KeyValueRow label="B&W Print:" value={`GH₵${shop.price_per_page_bw}/pg`} />
                    <KeyValueRow label="Colour Print:" value={`GH₵${shop.price_per_page_color}/pg`} />
                    <KeyValueRow label="Hours:" value={shop.operating_hours} />

                    <View style={styles.spacingSmall} />

                    {services.length > 0 && (
                      <>
                        <Text style={styles.routesHeader}>Features & Services:</Text>
                        <View style={styles.spacingTiny} />
                        <View style={styles.routesList}>
                          {services.map((svc, index) => (
                            <View key={index} style={styles.routeItem}>
                              <Text style={styles.routeBullet}>•  </Text>
                              <Text style={styles.routeText}>{svc}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    <View style={styles.spacingMedium} />

                    <TouchableOpacity 
                      style={styles.buyButton} 
                      activeOpacity={0.8}
                      onPress={() => router.push(`/print-new?shopId=${shop.id}&shopName=${encodeURIComponent(shop.name)}` as any)}
                    >
                      <Text style={styles.buyButtonText}>Select Centre</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            {jobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>You don't have any print jobs yet.</Text>
              </View>
            ) : (
              jobs.map((job) => (
                <JobCard key={job.id} job={job} router={router} onRefresh={fetchData} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Adapted JobCard using the exact new aesthetic
function JobCard({ job, router, onRefresh }: { job: PrintJob; router: any; onRefresh: () => void }) {
  const stepIdx = getStepIndex(job.status);
  const statusColor = STATUS_COLORS[job.status] || TEXT_MUTED;
  const isComplete = job.status === 'completed' || job.status === 'cancelled';
  const countdown = deletionCountdown(job.deletion_scheduled_at);
  const fileDeleted = !!job.file_deleted_at;
  const statusLabel = PRINT_STATUS_STEPS.find((s) => s.key === job.status)?.label || job.status.toUpperCase();

  const toggleKeepFile = async () => {
    await supabase.from('print_jobs').update({ sender_file_kept: !job.sender_file_kept }).eq('id', job.id);
    onRefresh();
  };

  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={() => router.push(`/print-job?id=${job.id}` as any)}
      activeOpacity={0.9}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>{job.document_name.toUpperCase()}</Text>
      <Text style={styles.cardSubtitle}>SUBMITTED {timeSince(job.created_at).toUpperCase()}</Text>
      
      <View style={styles.spacingMedium} />

      <KeyValueRow label="Status:" value={statusLabel} valueColor={statusColor} />
      <KeyValueRow label="Format:" value={`${job.page_count} Pages, ${job.copies} Copies`} />
      <KeyValueRow label="Color Mode:" value={job.color_mode === 'color' ? 'Colour' : 'Black & White'} />
      <KeyValueRow label="Total Paid:" value={`GH₵${job.total_price.toFixed(2)}`} />

      <View style={styles.spacingSmall} />

      {job.pickup_code && !isComplete && (
        <View style={styles.pickupBox}>
          <Text style={styles.pickupBoxLabel}>PICKUP CODE</Text>
          <Text style={styles.pickupBoxValue}>{job.pickup_code}</Text>
        </View>
      )}

      {/* Progress & Actions */}
      <View style={styles.jobActionsRow}>
        <View style={styles.progressFlex}>
          {!isComplete && stepIdx >= 0 && (
            <Text style={[styles.routesHeader, { color: statusColor }]}>
              {stepIdx + 1} / {PRINT_STATUS_STEPS.length} Steps Complete
            </Text>
          )}
          {fileDeleted ? (
            <Text style={styles.fileStatusDeleted}>File securely deleted</Text>
          ) : countdown ? (
            <Text style={styles.fileStatusWarning}>Deletes in {countdown}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/print-chat?jobId=${job.id}` as any);
          }}
        >
          <MessageSquare size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {job.printer_confirmed_at && !fileDeleted && !job.sender_file_kept && (
        <>
           <View style={styles.spacingSmall} />
           <TouchableOpacity onPress={toggleKeepFile} style={styles.keepBtn} activeOpacity={0.9}>
             <Text style={styles.keepBtnText}>Keep file (Don't auto-delete)</Text>
           </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  
  // --- Header Styles ---
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: Platform.OS === 'android' ? 76 : 60, // Accommodate safe area
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  appBarTitle: {
    fontFamily: FONT.headingBold,
    color: '#000000',
    fontSize: 18,
    alignSelf: 'flex-end',
    paddingBottom: 6,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F7F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  walletText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: BRAND_GREEN,
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
    fontFamily: FONT.semiBold,
    fontSize: 16,
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
    paddingBottom: 40,
    backgroundColor: BG_COLOR,
    flexGrow: 1,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: FONT.regular,
    fontSize: 16,
    color: TEXT_MUTED,
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
    elevation: 4,
  },
  cardTitle: {
    fontFamily: FONT.headingBold,
    color: TEXT_DARK,
    fontSize: 22,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontFamily: FONT.semiBold,
    color: TEXT_MUTED,
    fontSize: 13,
    letterSpacing: 0.3,
    marginTop: 4,
  },

  // --- Key Value Rows ---
  keyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  keyLabel: {
    flex: 1,
    fontFamily: FONT.semiBold,
    color: TEXT_MUTED,
    fontSize: 15,
  },
  valueLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
  },

  // --- Routes / List ---
  routesHeader: {
    fontFamily: FONT.semiBold,
    color: TEXT_MUTED,
    fontSize: 15,
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
    fontFamily: FONT.regular,
    fontSize: 16,
    color: TEXT_DARK,
  },
  routeText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: TEXT_DARK,
  },

  // --- Buttons & Specific Job UI ---
  buyButton: {
    width: '100%',
    height: 52,
    backgroundColor: BRAND_GREEN,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    fontFamily: FONT.semiBold,
    color: '#FFFFFF',
    fontSize: 18,
  },

  jobActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  progressFlex: {
    flex: 1,
  },
  fileStatusDeleted: {
    fontFamily: FONT.semiBold,
    color: BRAND_GREEN,
    fontSize: 13,
    marginTop: 4,
  },
  fileStatusWarning: {
    fontFamily: FONT.semiBold,
    color: '#EF4444',
    fontSize: 13,
    marginTop: 4,
  },
  chatButton: {
    backgroundColor: TEXT_DARK,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupBox: {
    backgroundColor: '#E6F7F2',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  pickupBoxLabel: {
    fontFamily: FONT.semiBold,
    color: BRAND_GREEN,
    fontSize: 11,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  pickupBoxValue: {
    fontFamily: FONT.headingBold,
    color: BRAND_GREEN,
    fontSize: 20,
    letterSpacing: 2,
  },
  keepBtn: {
    width: '100%',
    height: 44,
    backgroundColor: '#F6F7F8',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepBtnText: {
    fontFamily: FONT.semiBold,
    color: TEXT_DARK,
    fontSize: 15,
  },

  // --- Spacers ---
  spacingTiny: { height: 8 },
  spacingSmall: { height: 12 },
  spacingMedium: { height: 14 },
});