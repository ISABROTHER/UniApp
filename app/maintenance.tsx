import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS, MAINTENANCE_PRIORITIES } from '@/lib/constants';
import { MaintenanceRequest } from '@/lib/types';
import { ArrowLeft, Wrench, Plus, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

type TabType = 'requests' | 'new';

export default function MaintenanceScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('requests');
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [hostelName, setHostelName] = useState('');

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, []));

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase.from('maintenance_requests')
      .select('*, hostels(name, address)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setRequests((data as MaintenanceRequest[]) || []);
    setLoading(false);
  };

  const submitRequest = async () => {
    setError('');
    if (!title.trim()) return setError('Please enter a title');
    if (!description.trim()) return setError('Please describe the issue');

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data: booking } = await supabase.from('bookings')
      .select('hostel_id')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'checked_in'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: err } = await supabase.from('maintenance_requests').insert({
      user_id: user.id,
      hostel_id: booking?.hostel_id || null,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'open',
    });

    setSubmitting(false);
    if (err) { setError(err.message); return; }

    setTitle('');
    setDescription('');
    setPriority('medium');
    setTab('requests');
    fetchRequests();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={16} color={COLORS.warning} />;
      case 'in_progress': return <AlertTriangle size={16} color={COLORS.accent} />;
      case 'resolved': return <CheckCircle size={16} color={COLORS.success} />;
      case 'closed': return <XCircle size={16} color={COLORS.textTertiary} />;
      default: return <Clock size={16} color={COLORS.textTertiary} />;
    }
  };

  const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return COLORS.warning;
      case 'in_progress': return COLORS.accent;
      case 'resolved': return COLORS.success;
      default: return COLORS.textTertiary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setTab('new')}>
          <Plus size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {([['requests', 'My Requests'], ['new', 'New Request']] as [TabType, string][]).map(([t, label]) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tab === 'requests' ? (
          loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Wrench size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Requests Yet</Text>
              <Text style={styles.emptySubtitle}>Report maintenance issues with your accommodation and track their resolution.</Text>
              <TouchableOpacity style={styles.newRequestBtn} onPress={() => setTab('new')}>
                <Text style={styles.newRequestBtnText}>Report an Issue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(expanded === r.id ? null : r.id)} activeOpacity={0.8}>
                  <View style={styles.cardHeaderLeft}>
                    {statusIcon(r.status)}
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.cardDate}>{r.created_at.slice(0, 10)}</Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View style={[styles.priorityBadge, { backgroundColor: `${MAINTENANCE_PRIORITIES.find(p => p.value === r.priority)?.color || COLORS.textSecondary}20` }]}>
                      <Text style={[styles.priorityText, { color: MAINTENANCE_PRIORITIES.find(p => p.value === r.priority)?.color || COLORS.textSecondary }]}>
                        {r.priority}
                      </Text>
                    </View>
                    {expanded === r.id ? <ChevronUp size={16} color={COLORS.textTertiary} /> : <ChevronDown size={16} color={COLORS.textTertiary} />}
                  </View>
                </TouchableOpacity>

                {expanded === r.id && (
                  <View style={styles.cardExpanded}>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusRowLabel}>Status</Text>
                      <Text style={[styles.statusValue, { color: statusColor(r.status) }]}>{statusLabel(r.status)}</Text>
                    </View>
                    {(r as any).hostels?.name && (
                      <View style={styles.statusRow}>
                        <Text style={styles.statusRowLabel}>Location</Text>
                        <Text style={styles.statusValue}>{(r as any).hostels.name}</Text>
                      </View>
                    )}
                    <Text style={styles.descLabel}>Description</Text>
                    <Text style={styles.descText}>{r.description}</Text>
                    {r.status === 'open' && (
                      <View style={styles.trackingBanner}>
                        <Clock size={14} color={COLORS.warning} />
                        <Text style={styles.trackingText}>Waiting for owner to acknowledge</Text>
                      </View>
                    )}
                    {r.status === 'in_progress' && (
                      <View style={[styles.trackingBanner, { backgroundColor: COLORS.infoLight }]}>
                        <AlertTriangle size={14} color={COLORS.info} />
                        <Text style={[styles.trackingText, { color: COLORS.info }]}>Repair in progress</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Report an Issue</Text>
            <Text style={styles.formSubtitle}>Describe the problem and we'll notify your hostel owner.</Text>

            <Text style={styles.fieldLabel}>Issue Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Broken door lock, Water leak"
              placeholderTextColor={COLORS.textTertiary}
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {MAINTENANCE_PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.priorityChip, priority === p.value && { backgroundColor: `${p.color}20`, borderColor: p.color }]}
                  onPress={() => setPriority(p.value as typeof priority)}
                >
                  <Text style={[styles.priorityChipText, priority === p.value && { color: p.color, fontFamily: FONT.semiBold }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail. Include location within the hostel..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={5}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={submitRequest} disabled={submitting} activeOpacity={0.8}>
              <Wrench size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: COLORS.textPrimary, flex: 1 },
  newBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center' },

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background },
  tabBtnActive: { backgroundColor: COLORS.primaryFaded },
  tabLabel: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontFamily: FONT.semiBold },

  content: { padding: SPACING.md },
  loadingText: { textAlign: 'center', marginTop: 60, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  newRequestBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md },
  newRequestBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, justifyContent: 'space-between' },
  cardHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardHeaderInfo: { flex: 1 },
  cardTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  cardDate: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  priorityText: { fontFamily: FONT.semiBold, fontSize: 10, textTransform: 'capitalize' },
  cardExpanded: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  statusRowLabel: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  statusValue: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary },
  descLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary, marginTop: SPACING.sm, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  trackingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.warningLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  trackingText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.warning },

  form: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  formTitle: { fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 4 },
  formSubtitle: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  fieldLabel: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 46, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textPrimary },
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: SPACING.sm },
  priorityRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.sm },
  priorityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  priorityChipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary, textTransform: 'capitalize' },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, marginTop: SPACING.md, gap: 8, elevation: 3, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.white },
});
