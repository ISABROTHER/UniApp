import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, Shield, FileText, Printer, CheckCircle, Clock,
  Truck, Package, Copy, Trash2, MessageSquare, AlertCircle,
  MapPin, Star, ShieldCheck, FileCheck, RefreshCw,
} from 'lucide-react-native';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock, desc: 'Your job has been sent to the print shop.' },
  { key: 'processing', label: 'Printing', icon: Printer, desc: 'The shop is printing your document now.' },
  { key: 'ready', label: 'Ready', icon: FileCheck, desc: 'Your print is ready.' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, desc: 'Your print is on the way.' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, desc: 'Done! Your order has been fulfilled.' },
];

const STATUS_COLOR: Record<string, string> = {
  pending: COLORS.warning,
  processing: COLORS.accent,
  ready: COLORS.teal,
  out_for_delivery: COLORS.primary,
  completed: COLORS.success,
  cancelled: COLORS.error,
};

type TrackingEvent = {
  id: string;
  status: string;
  message: string;
  created_at: string;
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
  shop: {
    id: string;
    name: string;
    location: string;
    rating: number;
    phone: string | null;
  } | null;
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('en-GH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}

function CountdownTimer({ scheduledAt }: { scheduledAt: string }) {
  const [remaining, setRemaining] = useState('');
  const [pct, setPct] = useState(1);

  useEffect(() => {
    const total = 10 * 60 * 1000;
    const tick = () => {
      const left = new Date(scheduledAt).getTime() - Date.now();
      if (left <= 0) { setRemaining('Deleting...'); setPct(0); return; }
      const mins = Math.floor(left / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      setPct(left / total);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  const color = pct > 0.5 ? COLORS.warning : pct > 0.2 ? COLORS.primary : COLORS.error;
  return (
    <View style={ctStyles.wrap}>
      <View style={ctStyles.ring}>
        <Trash2 size={18} color={color} />
      </View>
      <View>
        <Text style={[ctStyles.time, { color }]}>{remaining}</Text>
        <Text style={ctStyles.label}>until file deletion</Text>
      </View>
    </View>
  );
}

const ctStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: COLORS.error + '40', justifyContent: 'center', alignItems: 'center' },
  time: { fontFamily: FONT.bold, fontSize: 20 },
  label: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
});

export default function PrintJobScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<PrintJob | null>(null);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchJob = async () => {
    const { data } = await supabase
      .from('print_jobs')
      .select('*, shop:print_shops(*)')
      .eq('id', id)
      .maybeSingle();
    if (data) setJob(data as PrintJob);

    const { data: logs } = await supabase
      .from('print_job_tracking')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false });

    setTracking((logs || []) as TrackingEvent[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { if (id) fetchJob(); }, [id]);

  const toggleKeepFile = async () => {
    if (!job) return;
    await supabase.from('print_jobs').update({ sender_file_kept: !job.sender_file_kept }).eq('id', id);
    setJob(j => j ? { ...j, sender_file_kept: !j.sender_file_kept } : j);
  };

  const submitRating = async (stars: number) => {
    if (!job || ratingSubmitted) return;
    setRating(stars);
    setRatingSubmitted(true);
    await supabase.from('print_job_ratings').insert({
      job_id: job.id,
      shop_id: job.shop_id,
      stars,
    }).select().maybeSingle();
  };

  if (loading || !job) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  const stepIdx = STEPS.findIndex(s => s.key === job.status);
  const statusColor = STATUS_COLOR[job.status] || COLORS.textTertiary;
  const isActive = !['completed', 'cancelled'].includes(job.status);
  const fileDeleted = !!job.file_deleted_at;
  const showDeletionTimer = job.deletion_scheduled_at && !fileDeleted && !job.sender_file_kept;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Print Job</Text>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push(`/print-chat?jobId=${id}` as any)}
          activeOpacity={0.8}
        >
          <MessageSquare size={18} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJob(); }} tintColor={COLORS.accent} />}
      >
        <View style={styles.statusHero}>
          <View style={[styles.statusIcon, { backgroundColor: statusColor + '20' }]}>
            {React.createElement(STEPS[stepIdx >= 0 ? stepIdx : 0]?.icon || Clock, { size: 28, color: statusColor, strokeWidth: 1.8 })}
          </View>
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {STEPS.find(s => s.key === job.status)?.label || job.status}
          </Text>
          <Text style={styles.statusDesc}>{STEPS.find(s => s.key === job.status)?.desc}</Text>
          {job.pickup_code && isActive && job.delivery_type === 'pickup' && (
            <View style={styles.pickupCodeBox}>
              <Text style={styles.pickupCodeLabel}>Your Pickup Code</Text>
              <Text style={styles.pickupCodeValue}>{job.pickup_code}</Text>
              <Text style={styles.pickupCodeHint}>Show this at the print counter</Text>
            </View>
          )}
        </View>

        {isActive && (
          <View style={styles.progressSection}>
            {STEPS.map((step, i) => {
              const done = i < stepIdx;
              const current = i === stepIdx;
              const pending = i > stepIdx;
              const Icon = step.icon;
              return (
                <View key={step.key} style={styles.progressRow}>
                  <View style={styles.progressLeft}>
                    <View style={[
                      styles.progressCircle,
                      done && { backgroundColor: COLORS.success, borderColor: COLORS.success },
                      current && { borderColor: statusColor, borderWidth: 2.5 },
                    ]}>
                      {done ? (
                        <CheckCircle size={14} color={COLORS.white} fill={COLORS.white} />
                      ) : (
                        <Icon size={13} color={current ? statusColor : COLORS.textTertiary} strokeWidth={1.8} />
                      )}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.progressConnector, done && { backgroundColor: COLORS.success }]} />
                    )}
                  </View>
                  <View style={styles.progressContent}>
                    <Text style={[
                      styles.progressLabel,
                      current && { color: statusColor, fontFamily: FONT.semiBold },
                      done && { color: COLORS.success },
                    ]}>
                      {step.label}
                    </Text>
                    {current && <Text style={styles.progressDesc}>{step.desc}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {showDeletionTimer && job.deletion_scheduled_at && (
          <View style={styles.deletionCard}>
            <CountdownTimer scheduledAt={job.deletion_scheduled_at} />
            <View style={styles.deletionActions}>
              <View style={styles.deletionToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deletionToggleTitle}>Keep my copy</Text>
                  <Text style={styles.deletionToggleSub}>Pause deletion on your side only</Text>
                </View>
                <Switch
                  value={job.sender_file_kept}
                  onValueChange={toggleKeepFile}
                  trackColor={{ false: COLORS.border, true: COLORS.warning + '80' }}
                  thumbColor={job.sender_file_kept ? COLORS.warning : COLORS.textTertiary}
                />
              </View>
              <Text style={styles.deletionNote}>
                The print shop's copy is always automatically deleted regardless of your choice.
              </Text>
            </View>
          </View>
        )}

        {fileDeleted && (
          <View style={styles.deletedCard}>
            <ShieldCheck size={22} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deletedTitle}>File Securely Deleted</Text>
              <Text style={styles.deletedDesc}>Your document has been permanently removed from all systems.</Text>
            </View>
          </View>
        )}

        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>Job Details</Text>
          <DetailRow icon={FileText} label="Document" value={job.document_name} />
          <DetailRow icon={Printer} label="Pages" value={`${job.page_count} pages × ${job.copies} copies`} />
          <DetailRow icon={Package} label="Settings" value={`${job.color_mode === 'color' ? 'Colour' : 'B&W'} · ${job.paper_size}${job.double_sided ? ' · Double-sided' : ''}`} />
          <DetailRow icon={job.delivery_type === 'delivery' ? Truck : Package} label="Delivery" value={job.delivery_type === 'pickup' ? 'Pickup in-store' : `Delivery to: ${job.delivery_address}`} />
          {job.estimated_ready_at && isActive && (
            <DetailRow icon={Clock} label="Est. Ready" value={formatTime(job.estimated_ready_at)} />
          )}
          {job.shop && (
            <>
              <View style={styles.detailDivider} />
              <DetailRow icon={MapPin} label="Print Shop" value={job.shop.name} />
              <DetailRow icon={MapPin} label="Location" value={job.shop.location} />
            </>
          )}
          <View style={styles.detailDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>GH₵{job.total_price.toFixed(2)}</Text>
          </View>
        </View>

        {tracking.length > 0 && (
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Activity Log</Text>
            {tracking.map(t => (
              <View key={t.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: STATUS_COLOR[t.status] || COLORS.textTertiary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logMsg}>{t.message}</Text>
                  <Text style={styles.logTime}>{formatTime(t.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {job.status === 'completed' && (
          <View style={styles.ratingCard}>
            {ratingSubmitted ? (
              <View style={styles.ratingDoneRow}>
                <CheckCircle size={18} color={COLORS.success} fill={COLORS.success} />
                <Text style={styles.ratingDoneText}>Thanks for your rating!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.ratingTitle}>How was your experience?</Text>
                <Text style={styles.ratingSub}>Rate {job.shop?.name ?? 'the print shop'}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <TouchableOpacity key={s} onPress={() => submitRating(s)} activeOpacity={0.7}>
                      <Star
                        size={32}
                        color={COLORS.gold}
                        fill={s <= rating ? COLORS.gold : 'none'}
                        strokeWidth={1.5}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {job.status === 'cancelled' && (
          <View style={styles.retryCard}>
            <AlertCircle size={18} color={COLORS.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.retryTitle}>Order was cancelled</Text>
              <Text style={styles.retrySub}>You were not charged. Try placing a new order.</Text>
            </View>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.push(`/print-new?shopId=${job.shop_id}` as any)}
              activeOpacity={0.85}
            >
              <RefreshCw size={13} color={COLORS.white} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.chatFloatBtn}
          onPress={() => router.push(`/print-chat?jobId=${id}` as any)}
          activeOpacity={0.85}
        >
          <MessageSquare size={16} color={COLORS.white} />
          <Text style={styles.chatFloatBtnText}>Chat with Print Shop</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Icon size={14} color={COLORS.textTertiary} strokeWidth={1.8} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },
  chatBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent + '14', justifyContent: 'center', alignItems: 'center' },

  statusHero: { backgroundColor: COLORS.white, alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.md, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  statusIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  statusLabel: { fontFamily: FONT.bold, fontSize: 22, marginBottom: 4 },
  statusDesc: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  pickupCodeBox: { marginTop: SPACING.md, backgroundColor: COLORS.accent + '10', borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent + '30', minWidth: 200 },
  pickupCodeLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  pickupCodeValue: { fontFamily: FONT.bold, fontSize: 28, color: COLORS.accent, letterSpacing: 4 },
  pickupCodeHint: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },

  progressSection: { backgroundColor: COLORS.white, marginTop: SPACING.sm, padding: SPACING.md, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: COLORS.border },
  progressRow: { flexDirection: 'row', gap: SPACING.sm, minHeight: 52 },
  progressLeft: { alignItems: 'center', width: 32 },
  progressCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  progressConnector: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 4 },
  progressContent: { flex: 1, paddingTop: 6, paddingBottom: 6 },
  progressLabel: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  progressDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginTop: 2, lineHeight: 18 },

  deletionCard: { margin: SPACING.md, backgroundColor: COLORS.error + '08', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.error + '30', gap: SPACING.md },
  deletionActions: { gap: SPACING.sm },
  deletionToggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  deletionToggleTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  deletionToggleSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  deletionNote: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, lineHeight: 17 },

  deletedCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, margin: SPACING.md, backgroundColor: COLORS.success + '10', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.success + '30' },
  deletedTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.success, marginBottom: 2 },
  deletedDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },

  detailCard: { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginTop: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 0.5, borderColor: COLORS.border },
  detailCardTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.md },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  detailLabel: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, width: 80 },
  detailValue: { flex: 1, fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  totalValue: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.primary },

  logRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, alignItems: 'flex-start' },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  logMsg: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  logTime: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  chatFloatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, margin: SPACING.md, borderRadius: RADIUS.lg, paddingVertical: 14 },
  chatFloatBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  ratingCard: { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginTop: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center', gap: 8 },
  ratingTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary },
  ratingSub: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  starsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  ratingDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingDoneText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.success },

  retryCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.error + '08', borderRadius: RADIUS.lg, padding: SPACING.md, marginHorizontal: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.error + '25' },
  retryTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, marginBottom: 2 },
  retrySub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.lg },
  retryBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },
});
