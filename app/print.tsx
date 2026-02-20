import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft,
  Shield,
  Upload,
  FileText,
  Printer,
  MapPin,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Star,
  ChevronRight,
  Wallet,
  AlertCircle,
  Trash2,
  MessageSquare,
  Copy,
  FileCheck,
  Lock,
  BadgeCheck,
  Zap,
  Gift,
} from 'lucide-react-native';

const PRINT_STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Printing', icon: Printer },
  { key: 'ready', label: 'Ready', icon: FileCheck },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
  { key: 'completed', label: 'Delivered', icon: CheckCircle },
];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  processing: COLORS.accent,
  ready: COLORS.teal,
  out_for_delivery: COLORS.primary,
  completed: COLORS.success,
  cancelled: COLORS.error,
};

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [shopsRes, jobsRes, walletRes] = await Promise.all([
        supabase
          .from('print_shops')
          .select('*')
          .eq('is_active', true)
          .order('rating', { ascending: false }),
        supabase
          .from('print_jobs')
          .select('*, shop:print_shops(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const activeJobs = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
  const pastJobs = jobs.filter((j) => ['completed', 'cancelled'].includes(j.status));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const freeJobsLeft = Math.max(0, 3 - completedJobCount);
  const showIncentive = freeJobsLeft > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <View style={styles.shieldBadge}>
            <Shield size={14} color={COLORS.white} fill={COLORS.white} />
          </View>
          <View>
            <Text style={styles.headerText}>Safe Print</Text>
            <Text style={styles.headerSubText}>Secure campus printing</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.walletChip} activeOpacity={0.8}>
          <Wallet size={13} color={COLORS.accent} />
          <Text style={styles.walletText}>GH₵{wallet.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'new' && styles.tabBtnActive]}
          onPress={() => setTab('new')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabBtnText, tab === 'new' && styles.tabBtnTextActive]}>
            Print Centres
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'jobs' && styles.tabBtnActive]}
          onPress={() => setTab('jobs')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabBtnText, tab === 'jobs' && styles.tabBtnTextActive]}>
            My Prints {activeJobs.length > 0 ? `(${activeJobs.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        contentInsetAdjustmentBehavior="automatic"
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <View style={styles.loadingCard}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading Safe Print…</Text>
            </View>
          </View>
        ) : tab === 'new' ? (
          <>
            {showIncentive && (
              <View style={styles.incentiveBanner}>
                <View style={styles.incentiveLeft}>
                  <View style={styles.incentiveIconWrap}>
                    <Gift size={20} color={COLORS.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incentiveTitle}>
                      {freeJobsLeft === 3 ? 'First 3 prints on us!' : `${freeJobsLeft} free print${freeJobsLeft > 1 ? 's' : ''} left`}
                    </Text>
                    <Text style={styles.incentiveSub}>
                      Get your first 3 jobs done free — no catch, no code needed.
                    </Text>
                  </View>
                </View>
                <View style={styles.incentivePips}>
                  {[0, 1, 2].map(i => (
                    <View
                      key={i}
                      style={[styles.incentivePip, i < (3 - freeJobsLeft) && styles.incentivePipDone]}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.trustRow}>
              {[
                { icon: Lock, label: 'Price locked\nbefore you pay', color: COLORS.accent },
                { icon: BadgeCheck, label: 'Payment\nprotected', color: COLORS.success },
                { icon: Zap, label: 'Live order\ntracking', color: COLORS.warning },
                { icon: Shield, label: 'File auto-\ndeleted', color: COLORS.primary },
              ].map((item, i) => (
                <View key={i} style={styles.trustItem}>
                  <View style={[styles.trustIcon, { backgroundColor: item.color + '18' }]}>
                    <item.icon size={16} color={item.color} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.trustLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Print Centres Near You</Text>
              <Text style={styles.sectionHint}>Tap a centre to start</Text>
            </View>

            {shops.length === 0 ? (
              <View style={styles.emptyInline}>
                <View style={styles.emptyInlineIcon}>
                  <Printer size={20} color={COLORS.textTertiary} />
                </View>
                <Text style={styles.emptyInlineText}>No active print centres found yet.</Text>
              </View>
            ) : (
              shops.map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={styles.shopCard}
                  onPress={() =>
                    router.push(
                      `/print-new?shopId=${shop.id}&shopName=${encodeURIComponent(shop.name)}` as any
                    )
                  }
                  activeOpacity={0.88}
                >
                  <View style={styles.shopIconWrap}>
                    <Printer size={22} color={COLORS.primary} strokeWidth={1.8} />
                  </View>

                  <View style={styles.shopInfo}>
                    <View style={styles.shopTopRow}>
                      <Text style={styles.shopName} numberOfLines={1}>
                        {shop.name}
                      </Text>
                      <View style={styles.shopRating}>
                        <Star size={11} color={COLORS.gold} fill={COLORS.gold} />
                        <Text style={styles.shopRatingText}>{shop.rating.toFixed(1)}</Text>
                        <Text style={styles.shopReviewText}>({shop.review_count})</Text>
                      </View>
                    </View>

                    <View style={styles.shopMeta}>
                      <MapPin size={11} color={COLORS.textTertiary} />
                      <Text style={styles.shopMetaText} numberOfLines={1}>
                        {shop.location}
                      </Text>
                    </View>

                    <View style={styles.shopPriceRow}>
                      <View style={styles.pricePill}>
                        <Text style={styles.pricePillLabel}>B&W</Text>
                        <Text style={styles.pricePillValue}>GH₵{shop.price_per_page_bw}/pg</Text>
                      </View>
                      <View style={[styles.pricePill, styles.pricePillColor]}>
                        <Text style={[styles.pricePillLabel, { color: COLORS.accent }]}>Colour</Text>
                        <Text style={[styles.pricePillValue, { color: COLORS.accent }]}>GH₵{shop.price_per_page_color}/pg</Text>
                      </View>
                    </View>

                    <View style={styles.shopTags}>
                      {shop.supports_delivery && (
                        <View style={styles.shopTag}>
                          <Truck size={10} color={COLORS.accent} />
                          <Text style={styles.shopTagText}>Delivery</Text>
                        </View>
                      )}
                      {shop.supports_pickup && (
                        <View style={styles.shopTag}>
                          <Package size={10} color={COLORS.teal} />
                          <Text style={styles.shopTagText}>Pickup</Text>
                        </View>
                      )}
                      <View style={styles.shopTag}>
                        <Clock size={10} color={COLORS.textTertiary} />
                        <Text style={styles.shopTagText} numberOfLines={1}>
                          {shop.operating_hours}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.shopRight}>
                    <ChevronRight size={16} color={COLORS.textTertiary} />
                  </View>
                </TouchableOpacity>
              ))
            )}

            <View style={styles.vsWhatsAppCard}>
              <Text style={styles.vsTitle}>Why not just use WhatsApp?</Text>
              <View style={styles.vsRow}>
                <View style={styles.vsCol}>
                  <Text style={styles.vsColHeader}>WhatsApp</Text>
                  {['No price guarantee', 'No payment protection', 'No order tracking', 'Files stay forever', 'No dispute resolution'].map(t => (
                    <View key={t} style={styles.vsItem}>
                      <Text style={styles.vsItemIconBad}>✕</Text>
                      <Text style={styles.vsItemTextBad}>{t}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.vsDivider} />
                <View style={styles.vsCol}>
                  <Text style={[styles.vsColHeader, { color: COLORS.primary }]}>Safe Print</Text>
                  {['Price locked upfront', 'Prepaid & protected', 'Live job tracking', 'Auto-deleted in 10m', 'Ratings & accountability'].map(t => (
                    <View key={t} style={styles.vsItem}>
                      <Text style={styles.vsItemIconGood}>✓</Text>
                      <Text style={styles.vsItemTextGood}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {activeJobs.length === 0 && pastJobs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Printer size={36} color={COLORS.accent} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No print jobs yet</Text>
                <Text style={styles.emptyText}>Choose a print centre to upload your first document.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('new')} activeOpacity={0.9}>
                  <Text style={styles.emptyBtnText}>Find a Print Centre</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {activeJobs.length > 0 && (
                  <>
                    <Text style={styles.sectionTitleSolo}>Active Jobs</Text>
                    {activeJobs.map((job) => (
                      <JobCard key={job.id} job={job} router={router} onRefresh={fetchData} />
                    ))}
                  </>
                )}

                {pastJobs.length > 0 && (
                  <>
                    <Text style={styles.sectionTitleSolo}>Completed</Text>
                    {pastJobs.map((job) => (
                      <JobCard key={job.id} job={job} router={router} onRefresh={fetchData} />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function JobCard({ job, router, onRefresh }: { job: PrintJob; router: any; onRefresh: () => void }) {
  const stepIdx = getStepIndex(job.status);
  const statusColor = STATUS_COLORS[job.status] || COLORS.textTertiary;
  const isComplete = job.status === 'completed' || job.status === 'cancelled';
  const countdown = deletionCountdown(job.deletion_scheduled_at);
  const fileDeleted = !!job.file_deleted_at;

  const toggleKeepFile = async () => {
    await supabase.from('print_jobs').update({ sender_file_kept: !job.sender_file_kept }).eq('id', job.id);
    onRefresh();
  };

  const statusLabel = PRINT_STATUS_STEPS.find((s) => s.key === job.status)?.label || job.status;

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/print-job?id=${job.id}` as any)}
      activeOpacity={0.9}
    >
      <View style={styles.jobTop}>
        <View style={styles.jobIconWrap}>
          <FileText size={18} color={COLORS.accent} strokeWidth={1.8} />
        </View>

        <View style={styles.jobInfo}>
          <Text style={styles.jobName} numberOfLines={1}>
            {job.document_name}
          </Text>
          <Text style={styles.jobMeta} numberOfLines={1}>
            {job.page_count}p · {job.copies} {job.copies > 1 ? 'copies' : 'copy'} ·{' '}
            {job.color_mode === 'color' ? 'Colour' : 'B&W'}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {!isComplete && stepIdx >= 0 && (
        <View style={styles.progressBar}>
          {PRINT_STATUS_STEPS.map((step, i) => {
            const isDone = i <= stepIdx;
            const isLineDone = i < stepIdx;
            return (
              <View key={step.key} style={styles.progressStepWrap}>
                <View style={[styles.progressDot, isDone && { backgroundColor: statusColor }]} />
                {i < PRINT_STATUS_STEPS.length - 1 && (
                  <View style={[styles.progressLine, isLineDone && { backgroundColor: statusColor }]} />
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.jobFooter}>
        <Text style={styles.jobTime}>{timeSince(job.created_at)}</Text>

        <Text style={styles.jobPrice}>GH₵{job.total_price.toFixed(2)}</Text>

        {job.pickup_code && !isComplete && (
          <View style={styles.pickupCodeWrap}>
            <Copy size={11} color={COLORS.accent} />
            <Text style={styles.pickupCode}>{job.pickup_code}</Text>
          </View>
        )}

        {countdown && !fileDeleted && (
          <View style={styles.deletionTimer}>
            <Trash2 size={10} color={COLORS.error} />
            <Text style={styles.deletionTimerText}>{countdown}</Text>
          </View>
        )}

        {fileDeleted && (
          <View style={styles.deletedBadge}>
            <Shield size={10} color={COLORS.success} />
            <Text style={styles.deletedBadgeText}>File Deleted</Text>
          </View>
        )}

        <View style={styles.jobActions}>
          <TouchableOpacity
            style={styles.jobActionBtn}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/print-chat?jobId=${job.id}` as any);
            }}
            activeOpacity={0.85}
          >
            <MessageSquare size={14} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {job.printer_confirmed_at && !fileDeleted && !job.sender_file_kept && (
        <View style={styles.safePrintNotice}>
          <AlertCircle size={13} color={COLORS.warning} />
          <Text style={styles.safePrintNoticeText} numberOfLines={2}>
            File will auto-delete {countdown || 'soon'}
          </Text>
          <TouchableOpacity onPress={toggleKeepFile} style={styles.keepBtn} activeOpacity={0.9}>
            <Text style={styles.keepBtnText}>Keep my copy</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  scrollContent: { paddingBottom: 36 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginHorizontal: 10 },
  shieldBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, lineHeight: 20 },
  headerSubText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginTop: 1 },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  walletText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '30' },
  tabBtnText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  loadingWrap: { padding: SPACING.md },
  loadingCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },

  incentiveBanner: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  incentiveLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  incentiveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incentiveTitle: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.white, marginBottom: 2 },
  incentiveSub: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17 },
  incentivePips: { flexDirection: 'row', gap: 6, paddingLeft: 50 },
  incentivePip: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  incentivePipDone: { backgroundColor: COLORS.white },

  trustRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustLabel: {
    fontFamily: FONT.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },

  sectionTitleRow: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  sectionHint: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  sectionTitleSolo: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  emptyInline: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyInlineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyInlineText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  shopCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  shopIconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '18',
  },
  shopInfo: { flex: 1, gap: 6 },
  shopTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  shopName: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  shopMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopMetaText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, flex: 1 },
  shopRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  shopRatingText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textPrimary },
  shopReviewText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  shopPriceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pricePillColor: { borderColor: COLORS.accent + '30', backgroundColor: COLORS.accent + '08' },
  pricePillLabel: { fontFamily: FONT.medium, fontSize: 10, color: COLORS.textSecondary },
  pricePillValue: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.textPrimary },
  shopTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  shopTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: '100%',
  },
  shopTagText: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textSecondary },
  shopRight: { justifyContent: 'center', paddingLeft: 8 },

  vsWhatsAppCard: {
    margin: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  vsTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, marginBottom: SPACING.md },
  vsRow: { flexDirection: 'row', gap: SPACING.md },
  vsCol: { flex: 1, gap: 6 },
  vsColHeader: { fontFamily: FONT.bold, fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  vsDivider: { width: 1, backgroundColor: COLORS.border },
  vsItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  vsItemIconBad: { fontSize: 11, color: COLORS.error, marginTop: 1, width: 12 },
  vsItemIconGood: { fontSize: 11, color: COLORS.success, marginTop: 1, width: 12 },
  vsItemTextBad: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },
  vsItemTextGood: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textPrimary, flex: 1, lineHeight: 16 },

  jobCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  jobTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  jobIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '14',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '18',
  },
  jobInfo: { flex: 1, minWidth: 0 },
  jobName: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  jobMeta: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, maxWidth: 130 },
  statusPillText: { fontFamily: FONT.semiBold, fontSize: 11 },

  progressBar: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, paddingHorizontal: 4 },
  progressStepWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  progressLine: { flex: 1, height: 2, backgroundColor: COLORS.border },

  jobFooter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  jobTime: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  jobPrice: { fontFamily: FONT.bold, fontSize: 12, color: COLORS.textPrimary },
  pickupCodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent + '14',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent + '18',
  },
  pickupCode: { fontFamily: FONT.bold, fontSize: 12, color: COLORS.accent, letterSpacing: 1 },
  deletionTimer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deletionTimerText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.error },
  deletedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deletedBadgeText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success },
  jobActions: { marginLeft: 'auto' as any },
  jobActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  safePrintNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '14',
    borderRadius: RADIUS.sm,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '22',
  },
  safePrintNoticeText: { flex: 1, fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary },
  keepBtn: { backgroundColor: COLORS.warning + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  keepBtnText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.warning },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontFamily: FONT.semiBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 13, borderRadius: RADIUS.lg },
  emptyBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
});
 