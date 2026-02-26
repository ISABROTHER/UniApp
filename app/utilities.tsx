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
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Plus, Zap, Droplet, X, ArrowLeft, CreditCard } from 'lucide-react-native';

type MeterType = 'ecg' | 'gwcl';

type UtilityMeter = {
  id: string;
  meter_type: MeterType;
  meter_number: string;
  nickname: string | null;
  is_default: boolean;
  created_at: string;
};

type UtilityTopup = {
  id: string;
  meter_id: string;
  meter_type: MeterType;
  amount: number;
  vend_token: string | null;
  status: string;
  created_at: string;
};

export default function UtilitiesScreen() {
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [topups, setTopups] = useState<UtilityTopup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [addMeterOpen, setAddMeterOpen] = useState(false);
  const [meterType, setMeterType] = useState<MeterType>('ecg');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterNickname, setMeterNickname] = useState('');
  const [addMeterError, setAddMeterError] = useState<string | null>(null);
  const [addingMeter, setAddingMeter] = useState(false);

  const [topupOpen, setTopupOpen] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<UtilityMeter | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupError, setTopupError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) return;

      const [metersRes, topupsRes] = await Promise.all([
        supabase
          .from('utility_meters')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('utility_topups')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (metersRes.data) setMeters(metersRes.data as UtilityMeter[]);
      if (topupsRes.data) setTopups(topupsRes.data as UtilityTopup[]);
    } catch {
      setMeters([]);
      setTopups([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData({ silent: true });
    setRefreshing(false);
  }, [fetchData]);

  const openAddMeter = useCallback(() => {
    setAddMeterError(null);
    setMeterType('ecg');
    setMeterNumber('');
    setMeterNickname('');
    setAddMeterOpen(true);
  }, []);

  const closeAddMeter = useCallback(() => {
    if (!addingMeter) setAddMeterOpen(false);
  }, [addingMeter]);

  const submitAddMeter = useCallback(async () => {
    if (addingMeter) return;

    const number = meterNumber.trim();
    if (number.length === 0) {
      setAddMeterError('Enter meter number.');
      return;
    }

    setAddingMeter(true);
    setAddMeterError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) {
        setAddMeterError('Please sign in.');
        return;
      }

      const { error } = await supabase.from('utility_meters').insert({
        user_id: userId,
        meter_type: meterType,
        meter_number: number,
        nickname: meterNickname.trim() || null,
        is_default: meters.length === 0,
      });

      if (error) throw error;

      setAddMeterOpen(false);
      await fetchData({ silent: true });
    } catch {
      setAddMeterError('Could not add meter. Try again.');
    } finally {
      setAddingMeter(false);
    }
  }, [addingMeter, fetchData, meterNickname, meterNumber, meterType, meters.length]);

  const openTopup = useCallback((meter: UtilityMeter) => {
    setTopupError(null);
    setSelectedMeter(meter);
    setTopupAmount('');
    setTopupOpen(true);
  }, []);

  const closeTopup = useCallback(() => {
    if (!processing) setTopupOpen(false);
  }, [processing]);

  const submitTopup = useCallback(async () => {
    if (processing || !selectedMeter) return;

    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopupError('Enter a valid amount.');
      return;
    }

    setProcessing(true);
    setTopupError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) {
        setTopupError('Please sign in.');
        return;
      }

      const { error } = await supabase.from('utility_topups').insert({
        user_id: userId,
        meter_id: selectedMeter.id,
        meter_type: selectedMeter.meter_type,
        amount,
        status: 'pending',
      });

      if (error) throw error;

      setTopupOpen(false);
      await fetchData({ silent: true });
    } catch {
      setTopupError('Could not process topup. Try again.');
    } finally {
      setProcessing(false);
    }
  }, [fetchData, processing, selectedMeter, topupAmount]);

  const getMeterIcon = (type: MeterType) => {
    return type === 'ecg' ? (
      <Zap size={20} color="#F59E0B" />
    ) : (
      <Droplet size={20} color="#3B82F6" />
    );
  };

  const getMeterLabel = (type: MeterType) => {
    return type === 'ecg' ? 'ECG Electricity' : 'GWCL Water';
  };

  const formatAmount = (value: number) => {
    return `₵${value.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Utilities</Text>
          <Text style={styles.subtitle}>Manage ECG & GWCL top-ups</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Meters</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddMeter} activeOpacity={0.85}>
              <Plus size={16} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add Meter</Text>
            </TouchableOpacity>
          </View>

          {loading && meters.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>Loading meters...</Text>
            </View>
          ) : meters.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>No meters added</Text>
              <Text style={styles.stateSubtitle}>Add your ECG or GWCL meter to get started</Text>
              <TouchableOpacity style={styles.stateCta} onPress={openAddMeter} activeOpacity={0.85}>
                <Plus size={18} color={COLORS.white} />
                <Text style={styles.stateCtaText}>Add First Meter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            meters.map((meter) => (
              <View key={meter.id} style={styles.meterCard}>
                <View style={styles.meterTop}>
                  <View style={styles.meterLeft}>
                    <View style={styles.meterIconBox}>{getMeterIcon(meter.meter_type)}</View>
                    <View style={styles.meterInfo}>
                      <Text style={styles.meterName}>
                        {meter.nickname || getMeterLabel(meter.meter_type)}
                      </Text>
                      <Text style={styles.meterNumber}>{meter.meter_number}</Text>
                    </View>
                  </View>
                  {meter.is_default ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.topupBtn}
                  onPress={() => openTopup(meter)}
                  activeOpacity={0.85}
                >
                  <CreditCard size={18} color={COLORS.white} />
                  <Text style={styles.topupBtnText}>Top Up</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Top-Ups</Text>
          {topups.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateSubtitle}>No top-ups yet</Text>
            </View>
          ) : (
            topups.map((topup) => (
              <View key={topup.id} style={styles.topupCard}>
                <View style={styles.topupLeft}>
                  {getMeterIcon(topup.meter_type)}
                  <View>
                    <Text style={styles.topupLabel}>{getMeterLabel(topup.meter_type)}</Text>
                    <Text style={styles.topupDate}>
                      {new Date(topup.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.topupRight}>
                  <Text style={styles.topupAmount}>{formatAmount(Number(topup.amount))}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      topup.status === 'success'
                        ? styles.statusSuccess
                        : topup.status === 'failed'
                          ? styles.statusFailed
                          : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>{topup.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>

      <Modal visible={addMeterOpen} transparent animationType="slide" onRequestClose={closeAddMeter}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Meter</Text>
                <TouchableOpacity
                  onPress={closeAddMeter}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {addMeterError ? <Text style={styles.modalError}>{addMeterError}</Text> : null}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={styles.label}>Meter Type</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      style={[styles.typeBtn, meterType === 'ecg' ? styles.typeBtnActive : null]}
                      onPress={() => setMeterType('ecg')}
                      activeOpacity={0.85}
                    >
                      <Zap size={18} color={meterType === 'ecg' ? COLORS.white : '#F59E0B'} />
                      <Text
                        style={[styles.typeText, meterType === 'ecg' ? styles.typeTextActive : null]}
                      >
                        ECG
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, meterType === 'gwcl' ? styles.typeBtnActive : null]}
                      onPress={() => setMeterType('gwcl')}
                      activeOpacity={0.85}
                    >
                      <Droplet size={18} color={meterType === 'gwcl' ? COLORS.white : '#3B82F6'} />
                      <Text
                        style={[styles.typeText, meterType === 'gwcl' ? styles.typeTextActive : null]}
                      >
                        GWCL
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Meter Number</Text>
                  <TextInput
                    value={meterNumber}
                    onChangeText={setMeterNumber}
                    placeholder="Enter meter number"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Nickname (Optional)</Text>
                  <TextInput
                    value={meterNickname}
                    onChangeText={setMeterNickname}
                    placeholder="e.g., Hostel Room, Apartment"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, addingMeter ? styles.submitBtnDisabled : null]}
                  onPress={submitAddMeter}
                  activeOpacity={0.85}
                  disabled={addingMeter}
                >
                  <Text style={styles.submitBtnText}>{addingMeter ? 'Adding...' : 'Add Meter'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={topupOpen} transparent animationType="slide" onRequestClose={closeTopup}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Top Up Meter</Text>
                <TouchableOpacity
                  onPress={closeTopup}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {topupError ? <Text style={styles.modalError}>{topupError}</Text> : null}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                {selectedMeter ? (
                  <View style={styles.meterPreview}>
                    {getMeterIcon(selectedMeter.meter_type)}
                    <View>
                      <Text style={styles.previewLabel}>
                        {selectedMeter.nickname || getMeterLabel(selectedMeter.meter_type)}
                      </Text>
                      <Text style={styles.previewNumber}>{selectedMeter.meter_number}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.field}>
                  <Text style={styles.label}>Amount (₵)</Text>
                  <TextInput
                    value={topupAmount}
                    onChangeText={setTopupAmount}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                    keyboardType="decimal-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, processing ? styles.submitBtnDisabled : null]}
                  onPress={submitTopup}
                  activeOpacity={0.85}
                  disabled={processing}
                >
                  <Text style={styles.submitBtnText}>{processing ? 'Processing...' : 'Top Up Now'}</Text>
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
    paddingTop: Platform.OS === 'ios' ? 56 : SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerRight: { width: 40 },
  title: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  subtitle: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  content: { flex: 1 },
  contentContainer: { padding: SPACING.lg },

  section: { marginBottom: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  addBtnText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.white },

  stateBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stateText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
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
    marginTop: SPACING.xs,
  },
  stateCtaText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  meterCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  meterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  meterLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  meterIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meterInfo: { flex: 1 },
  meterName: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  meterNumber: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  defaultBadge: {
    backgroundColor: COLORS.primaryFaded,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.xs,
  },
  defaultText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.primary },

  topupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  topupBtnText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.white },

  topupCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topupLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  topupLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },
  topupDate: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  topupRight: { alignItems: 'flex-end', gap: 4 },
  topupAmount: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.textPrimary },
  statusBadge: { paddingVertical: 2, paddingHorizontal: SPACING.xs, borderRadius: RADIUS.xs },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontFamily: FONT.medium, fontSize: 10, textTransform: 'capitalize' },

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
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FONT.bold, fontSize: 16, color: COLORS.textPrimary },
  modalError: { marginTop: SPACING.sm, fontFamily: FONT.medium, fontSize: 13, color: COLORS.error },

  modalBody: { paddingTop: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.md },
  field: { gap: 6 },
  label: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary },

  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },
  typeTextActive: { color: COLORS.white },

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

  meterPreview: {
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  previewNumber: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

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
