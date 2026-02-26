import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, UTILITY_TOPUP_AMOUNTS } from '@/lib/constants';
import { UtilityMeter, UtilityTopup } from '@/lib/types';
import { ArrowLeft, Zap, Droplets, Plus, Clock, CheckCircle, XCircle, Users } from 'lucide-react-native';
import PaystackModal from '@/components/PaystackModal';

type TabType = 'meters' | 'topup' | 'history';

export default function UtilitiesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('meters');
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [topups, setTopups] = useState<UtilityTopup[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<UtilityMeter | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingMeter, setAddingMeter] = useState(false);
  const [newMeterNumber, setNewMeterNumber] = useState('');
  const [newMeterType, setNewMeterType] = useState<'ecg' | 'gwcl'>('ecg');
  const [newMeterNick, setNewMeterNick] = useState('');
  const [payModalVisible, setPayModalVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: ms }, { data: ts }] = await Promise.all([
      supabase.from('utility_meters').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('utility_topups').select('*, utility_meters(meter_number, nickname, meter_type)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]);

    const meterList = (ms as UtilityMeter[]) || [];
    setMeters(meterList);
    setTopups((ts as UtilityTopup[]) || []);
    if (meterList.length > 0 && !selectedMeter) setSelectedMeter(meterList[0]);
    setLoading(false);
  };

  const addMeter = async () => {
    if (!newMeterNumber.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('utility_meters').insert({
      user_id: user.id,
      meter_type: newMeterType,
      meter_number: newMeterNumber.trim(),
      nickname: newMeterNick.trim() || null,
      is_default: meters.length === 0,
    }).select().maybeSingle();
    if (data) {
      setAddingMeter(false);
      setNewMeterNumber('');
      setNewMeterNick('');
      fetchData();
    }
  };

  const handleTopup = async () => {
    const amount = parseFloat(customAmount || topupAmount);
    if (!selectedMeter || !amount || amount < 1) return;
    setPayModalVisible(true);
  };

  const handlePaymentSuccess = async (ref: string) => {
    setPayModalVisible(false);
    const amount = parseFloat(customAmount || topupAmount);
    if (!selectedMeter || !amount) return;
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProcessing(false); return; }

    const token = selectedMeter.meter_type === 'ecg'
      ? Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('').replace(/(.{4})/g, '$1 ').trim()
      : null;

    await supabase.from('utility_topups').insert({
      user_id: user.id,
      meter_id: selectedMeter.id,
      meter_type: selectedMeter.meter_type,
      amount,
      vend_token: token,
      status: 'success',
      payment_reference: ref,
    });

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'utility_topup',
      title: `${selectedMeter.meter_type === 'ecg' ? '⚡ ECG' : '💧 GWCL'} Top-Up Successful`,
      message: `GH₵${amount} added to meter ${selectedMeter.meter_number}.${token ? ` Token: ${token}` : ''}`,
      read: false,
    });

    setProcessing(false);
    setTopupAmount('');
    setCustomAmount('');
    fetchData();
    setTab('history');
  };

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle size={16} color={COLORS.success} />;
    if (status === 'failed') return <XCircle size={16} color={COLORS.error} />;
    return <Clock size={16} color={COLORS.warning} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Utilities</Text>
      </View>

      <View style={styles.tabRow}>
        {([['meters', 'My Meters'], ['topup', 'Top Up'], ['history', 'History']] as [TabType, string][]).map(([t, label]) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : tab === 'meters' ? (
          <>
            <View style={styles.infoRow}>
              <View style={[styles.utilCard, { backgroundColor: '#FEF9C3' }]}>
                <Zap size={22} color={COLORS.warning} />
                <Text style={styles.utilCardLabel}>ECG Electric</Text>
                <Text style={styles.utilCardSub}>Prepaid electricity tokens</Text>
              </View>
              <View style={[styles.utilCard, { backgroundColor: '#EFF6FF' }]}>
                <Droplets size={22} color={COLORS.accent} />
                <Text style={styles.utilCardLabel}>GWCL Water</Text>
                <Text style={styles.utilCardSub}>Ghana Water bill top-ups</Text>
              </View>
            </View>

            {meters.map((m) => (
              <View key={m.id} style={styles.meterCard}>
                <View style={[styles.meterIcon, { backgroundColor: m.meter_type === 'ecg' ? '#FEF9C3' : '#EFF6FF' }]}>
                  {m.meter_type === 'ecg' ? <Zap size={20} color={COLORS.warning} /> : <Droplets size={20} color={COLORS.accent} />}
                </View>
                <View style={styles.meterInfo}>
                  <Text style={styles.meterNum}>{m.meter_number}</Text>
                  <Text style={styles.meterNick}>{m.nickname || (m.meter_type === 'ecg' ? 'ECG Meter' : 'GWCL Meter')}</Text>
                </View>
                {m.is_default && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>}
                <TouchableOpacity onPress={() => { setSelectedMeter(m); setTab('topup'); }} style={styles.topupSmallBtn}>
                  <Text style={styles.topupSmallText}>Top Up</Text>
                </TouchableOpacity>
              </View>
            ))}

            {addingMeter ? (
              <View style={styles.addMeterForm}>
                <Text style={styles.formTitle}>Add Meter</Text>
                <View style={styles.typeRow}>
                  {(['ecg', 'gwcl'] as const).map((t) => (
                    <TouchableOpacity key={t} style={[styles.typeChip, newMeterType === t && styles.typeChipActive]} onPress={() => setNewMeterType(t)}>
                      <Text style={[styles.typeChipText, newMeterType === t && styles.typeChipTextActive]}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} value={newMeterNumber} onChangeText={setNewMeterNumber} placeholder="Meter Number" placeholderTextColor={COLORS.textTertiary} />
                <TextInput style={styles.input} value={newMeterNick} onChangeText={setNewMeterNick} placeholder="Nickname (optional)" placeholderTextColor={COLORS.textTertiary} />
                <View style={styles.formBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddingMeter(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={addMeter}><Text style={styles.saveBtnText}>Save Meter</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddingMeter(true)}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addBtnText}>Add New Meter</Text>
              </TouchableOpacity>
            )}
          </>
        ) : tab === 'topup' ? (
          <>
            <Text style={styles.sectionTitle}>Select Meter</Text>
            {meters.length === 0 ? (
              <TouchableOpacity style={styles.noMeterBtn} onPress={() => setTab('meters')}>
                <Text style={styles.noMeterText}>No meters added yet. Add a meter first.</Text>
              </TouchableOpacity>
            ) : (
              meters.map((m) => (
                <TouchableOpacity key={m.id} style={[styles.meterCard, selectedMeter?.id === m.id && styles.meterCardActive]} onPress={() => setSelectedMeter(m)}>
                  <View style={[styles.meterIcon, { backgroundColor: m.meter_type === 'ecg' ? '#FEF9C3' : '#EFF6FF' }]}>
                    {m.meter_type === 'ecg' ? <Zap size={20} color={COLORS.warning} /> : <Droplets size={20} color={COLORS.accent} />}
                  </View>
                  <View style={styles.meterInfo}>
                    <Text style={styles.meterNum}>{m.meter_number}</Text>
                    <Text style={styles.meterNick}>{m.nickname || m.meter_type.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {selectedMeter && (
              <>
                <Text style={styles.sectionTitle}>Amount (GH₵)</Text>
                <View style={styles.amountsGrid}>
                  {UTILITY_TOPUP_AMOUNTS.map((amt) => (
                    <TouchableOpacity key={amt} style={[styles.amtChip, topupAmount === String(amt) && styles.amtChipActive]} onPress={() => { setTopupAmount(String(amt)); setCustomAmount(''); }}>
                      <Text style={[styles.amtChipText, topupAmount === String(amt) && styles.amtChipTextActive]}>GH₵{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={customAmount}
                  onChangeText={(v) => { setCustomAmount(v); setTopupAmount(''); }}
                  placeholder="Or enter custom amount"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                />
                {selectedMeter.meter_type === 'ecg' && (
                  <View style={styles.noteCard}>
                    <Zap size={14} color={COLORS.warning} />
                    <Text style={styles.noteText}>ECG prepaid token will be generated and displayed after payment.</Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Split with Roommates</Text>
                <TouchableOpacity style={styles.splitBtn}>
                  <Users size={16} color={COLORS.accent} />
                  <Text style={styles.splitBtnText}>Invite roommates to split this bill</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.topupBtn, processing && styles.topupBtnDisabled]}
                  onPress={handleTopup}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.topupBtnText}>{processing ? 'Processing...' : `Top Up GH₵${customAmount || topupAmount || '0'}`}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          topups.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No History</Text>
              <Text style={styles.emptySubtitle}>Your top-up history will appear here.</Text>
            </View>
          ) : (
            topups.map((t) => (
              <View key={t.id} style={styles.histCard}>
                <View style={styles.histLeft}>
                  {statusIcon(t.status)}
                  <View style={styles.histInfo}>
                    <Text style={styles.histMeter}>{(t as any).utility_meters?.nickname || (t as any).utility_meters?.meter_number || t.meter_type.toUpperCase()}</Text>
                    <Text style={styles.histDate}>{t.created_at.slice(0, 10)}</Text>
                    {t.vend_token && <Text style={styles.histToken}>Token: {t.vend_token}</Text>}
                  </View>
                </View>
                <Text style={[styles.histAmount, { color: t.status === 'failed' ? COLORS.error : COLORS.success }]}>GH₵{t.amount}</Text>
              </View>
            ))
          )
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <PaystackModal
        visible={payModalVisible}
        amount={parseFloat(customAmount || topupAmount || '0')}
        label={`${selectedMeter?.meter_type === 'ecg' ? 'ECG' : 'GWCL'} Meter Top-Up`}
        onSuccess={handlePaymentSuccess}
        onClose={() => setPayModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary },

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background },
  tabBtnActive: { backgroundColor: COLORS.primaryFaded },
  tabLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  content: { padding: SPACING.md },
  loadingText: { textAlign: 'center', marginTop: 60, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  infoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  utilCard: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 6 },
  utilCardLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  utilCardSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  meterCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border },
  meterCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  meterIcon: { width: 42, height: 42, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  meterInfo: { flex: 1 },
  meterNum: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  meterNick: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  defaultBadge: { backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  defaultBadgeText: { fontFamily: FONT.medium, fontSize: 10, color: COLORS.success },
  topupSmallBtn: { backgroundColor: COLORS.primaryFaded, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  topupSmallText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.primary },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.md, paddingVertical: 14, gap: 8, marginTop: SPACING.sm },
  addBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.primary },

  addMeterForm: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  formTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primaryFaded, borderColor: COLORS.primary },
  typeChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  typeChipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },
  input: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 46, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  formBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.primary },
  saveBtnText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },

  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  noMeterBtn: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  noMeterText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.warning },
  amountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  amtChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  amtChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  amtChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  amtChipTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.warningLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm },
  noteText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  splitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  splitBtnText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.accent },
  topupBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', elevation: 3, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  topupBtnDisabled: { opacity: 0.6 },
  topupBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  histCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  histLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  histInfo: { flex: 1 },
  histMeter: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  histDate: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary },
  histToken: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.success, marginTop: 2 },
  histAmount: { fontFamily: FONT.bold, fontSize: 16 },
}); 