import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, TextInput, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, Shield, FileText, Upload,
  Printer, Truck, Package, AlertCircle, CheckCircle,
  Lock,
} from 'lucide-react-native';

const PAPER_SIZES = ['A4', 'A3', 'Letter', 'Legal'];
const BINDING_OPTIONS = [
  { value: 'none', label: 'No Binding' },
  { value: 'staple', label: 'Staple' },
  { value: 'spiral', label: 'Spiral' },
  { value: 'comb', label: 'Comb' },
];

const MOCK_FILES = [
  { name: 'Assignment_3.pdf', size_kb: 342, pages: 8, type: 'pdf' },
  { name: 'Research_Paper.docx', size_kb: 215, pages: 14, type: 'doc' },
  { name: 'Presentation.pdf', size_kb: 1204, pages: 22, type: 'pdf' },
  { name: 'Lab_Report.pdf', size_kb: 580, pages: 11, type: 'pdf' },
];

type PrintShop = {
  id: string;
  name: string;
  price_per_page_bw: number;
  price_per_page_color: number;
  supports_delivery: boolean;
  supports_pickup: boolean;
};

export default function PrintNewScreen() {
  const router = useRouter();
  const { shopId, shopName } = useLocalSearchParams<{ shopId: string; shopName: string }>();
  const [shop, setShop] = useState<PrintShop | null>(null);
  const [step, setStep] = useState<'file' | 'settings' | 'review'>('file');

  const [selectedFile, setSelectedFile] = useState<typeof MOCK_FILES[0] | null>(null);
  const [docName, setDocName] = useState('');
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState('1');
  const [colorMode, setColorMode] = useState<'black_white' | 'color'>('black_white');
  const [paperSize, setPaperSize] = useState('A4');
  const [binding, setBinding] = useState('none');
  const [doubleSided, setDoubleSided] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [safePrintAgreed, setSafePrintAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shopId) {
      supabase.from('print_shops').select('*').eq('id', shopId).maybeSingle().then(({ data }) => {
        if (data) setShop(data as PrintShop);
      });
    }
  }, [shopId]);

  const pricePerPage = colorMode === 'color'
    ? (shop?.price_per_page_color ?? 2)
    : (shop?.price_per_page_bw ?? 0.5);

  const effectivePages = doubleSided ? Math.ceil(pages / 2) : pages;
  const totalPrice = effectivePages * parseInt(copies || '1', 10) * pricePerPage;

  const pickFile = (file: typeof MOCK_FILES[0]) => {
    setSelectedFile(file);
    setDocName(file.name.replace(/\.[^/.]+$/, ''));
    setPages(file.pages);
  };

  const submit = async () => {
    if (!selectedFile || !shopId) { setError('Please select a file first.'); return; }
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) { setError('Please enter a delivery address.'); return; }
    setSubmitting(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('You must be logged in.'); setSubmitting(false); return; }

    const pickupCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const estimated = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: job, error: jobErr } = await supabase.from('print_jobs').insert({
      user_id: user.id,
      shop_id: shopId,
      document_name: docName,
      file_name: selectedFile.name,
      file_size_kb: selectedFile.size_kb,
      file_url: `mock://files/${selectedFile.name}`,
      page_count: pages,
      copies: parseInt(copies || '1', 10),
      color_mode: colorMode,
      paper_size: paperSize,
      binding,
      double_sided: doubleSided,
      delivery_type: deliveryType,
      delivery_address: deliveryType === 'delivery' ? deliveryAddress : null,
      total_price: totalPrice,
      status: 'pending',
      pickup_code: pickupCode,
      estimated_ready_at: estimated,
      special_instructions: instructions || null,
      safe_print_agreed: safePrintAgreed,
      sender_file_kept: false,
    }).select().maybeSingle();

    if (jobErr || !job) { setError('Failed to place order. Please try again.'); setSubmitting(false); return; }

    await supabase.from('print_job_tracking').insert([
      { job_id: job.id, status: 'pending', message: 'Your print job was received by the shop.' },
    ]);

    setSubmitting(false);
    router.replace(`/print-job?id=${job.id}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>New Print Job</Text>
          <Text style={styles.headerSub}>{shopName}</Text>
        </View>
        <View style={styles.shieldBadge}>
          <Shield size={14} color={COLORS.white} fill={COLORS.white} />
        </View>
      </View>

      <View style={styles.stepRow}>
        {(['file', 'settings', 'review'] as const).map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive, (
              (step === 'settings' && i === 0) || (step === 'review' && i <= 1)
            ) && styles.stepDotDone]}>
              <Text style={[styles.stepNum, (step === s || (step === 'settings' && i === 0) || (step === 'review' && i <= 1)) && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>{s === 'file' ? 'File' : s === 'settings' ? 'Settings' : 'Review'}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {step === 'file' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Document</Text>
            <View style={styles.uploadBox}>
              <Upload size={28} color={COLORS.accent} strokeWidth={1.5} />
              <Text style={styles.uploadTitle}>Upload from device</Text>
              <Text style={styles.uploadSub}>PDF, Word, PowerPoint, Images</Text>
              <Text style={styles.uploadHint}>Up to 50 MB per file</Text>
            </View>

            <Text style={styles.orDivider}>— or choose a recent file —</Text>

            {MOCK_FILES.map((file, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.fileRow, selectedFile?.name === file.name && styles.fileRowSelected]}
                onPress={() => pickFile(file)}
                activeOpacity={0.8}
              >
                <View style={[styles.fileIcon, { backgroundColor: file.type === 'pdf' ? COLORS.error + '14' : COLORS.accent + '14' }]}>
                  <FileText size={18} color={file.type === 'pdf' ? COLORS.error : COLORS.accent} strokeWidth={1.8} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <Text style={styles.fileMeta}>{file.pages} pages · {file.size_kb < 1024 ? `${file.size_kb} KB` : `${(file.size_kb / 1024).toFixed(1)} MB`}</Text>
                </View>
                {selectedFile?.name === file.name && (
                  <CheckCircle size={18} color={COLORS.success} fill={COLORS.success} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.safePrintBox}>
              <View style={styles.safePrintRow}>
                <Shield size={16} color={COLORS.success} />
                <Text style={styles.safePrintTitle}>Safe Print Protection</Text>
                <Switch
                  value={safePrintAgreed}
                  onValueChange={setSafePrintAgreed}
                  trackColor={{ false: COLORS.border, true: COLORS.success + '80' }}
                  thumbColor={safePrintAgreed ? COLORS.success : COLORS.textTertiary}
                />
              </View>
              <Text style={styles.safePrintDesc}>
                Your file will be permanently deleted from both sides 10 minutes after printing is confirmed. You can choose to keep your own copy before that window closes.
              </Text>
            </View>
          </View>
        )}

        {step === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Name</Text>
            <TextInput
              style={styles.textInput}
              value={docName}
              onChangeText={setDocName}
              placeholder="e.g. Assignment 3 - Chemistry"
              placeholderTextColor={COLORS.textTertiary}
            />

            <Text style={styles.sectionTitle}>Print Mode</Text>
            <View style={styles.toggleRow}>
              {(['black_white', 'color'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.toggleBtn, colorMode === mode && styles.toggleBtnActive]}
                  onPress={() => setColorMode(mode)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleBtnText, colorMode === mode && styles.toggleBtnTextActive]}>
                    {mode === 'black_white' ? 'Black & White' : 'Full Colour'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Paper Size</Text>
            <View style={styles.chipRow}>
              {PAPER_SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[styles.chip, paperSize === size && styles.chipActive]}
                  onPress={() => setPaperSize(size)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, paperSize === size && styles.chipTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Binding</Text>
            <View style={styles.chipRow}>
              {BINDING_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, binding === opt.value && styles.chipActive]}
                  onPress={() => setBinding(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, binding === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Double-Sided</Text>
              <Switch
                value={doubleSided}
                onValueChange={setDoubleSided}
                trackColor={{ false: COLORS.border, true: COLORS.accent + '80' }}
                thumbColor={doubleSided ? COLORS.accent : COLORS.textTertiary}
              />
            </View>

            <Text style={styles.sectionTitle}>Number of Copies</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setCopies(c => String(Math.max(1, parseInt(c || '1') - 1)))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterVal}>{copies}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setCopies(c => String(parseInt(c || '1') + 1))}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Delivery Method</Text>
            <View style={styles.toggleRow}>
              {[
                { v: 'pickup' as const, icon: Package, label: 'Pickup' },
                { v: 'delivery' as const, icon: Truck, label: 'Delivery' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.v}
                  style={[styles.toggleBtn, deliveryType === opt.v && styles.toggleBtnActive]}
                  onPress={() => setDeliveryType(opt.v)}
                  activeOpacity={0.8}
                >
                  <opt.icon size={14} color={deliveryType === opt.v ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.toggleBtnText, deliveryType === opt.v && styles.toggleBtnTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {deliveryType === 'delivery' && (
              <>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Room number, hall, hostel name..."
                  placeholderTextColor={COLORS.textTertiary}
                />
              </>
            )}

            <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Any special notes for the printer..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
            />
          </View>
        )}

        {step === 'review' && (
          <View style={styles.section}>
            <View style={styles.priceLockBanner}>
              <Lock size={15} color={COLORS.success} />
              <Text style={styles.priceLockText}>
                Price locked at <Text style={styles.priceLockAmount}>GH₵{totalPrice.toFixed(2)}</Text> — will not change after you confirm.
              </Text>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>Order Summary</Text>
              <ReviewRow label="Document" value={docName || selectedFile?.name || '—'} />
              <ReviewRow label="Pages" value={`${pages} pages × ${copies} copies`} />
              <ReviewRow label="Mode" value={colorMode === 'color' ? 'Full Colour' : 'Black & White'} />
              <ReviewRow label="Paper" value={`${paperSize}${doubleSided ? ' · Double-sided' : ''}`} />
              <ReviewRow label="Binding" value={BINDING_OPTIONS.find(b => b.value === binding)?.label || 'None'} />
              <ReviewRow label="Delivery" value={deliveryType === 'pickup' ? 'Pickup in-store' : `Delivery → ${deliveryAddress}`} />
              <View style={styles.divider} />
              <View style={styles.reviewTotalRow}>
                <Text style={styles.reviewTotalLabel}>Total</Text>
                <Text style={styles.reviewTotalValue}>GH₵{totalPrice.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.safePrintConfirm}>
              <Shield size={20} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.safePrintConfirmTitle}>Safe Print Agreement</Text>
                <Text style={styles.safePrintConfirmText}>
                  By placing this order, you and the print shop agree that your file will be permanently deleted from both sides within 10 minutes of printing confirmation. You may pause deletion of your own copy before the timer expires.
                </Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {step === 'settings' && selectedFile && (
          <View style={styles.livePriceBar}>
            <View style={styles.livePriceLeft}>
              <Lock size={13} color={COLORS.success} />
              <Text style={styles.livePriceLabel}>Locked price</Text>
            </View>
            <View style={styles.livePriceBreakdown}>
              <Text style={styles.livePriceBreakText}>
                {pages}pg × {copies} {parseInt(copies) > 1 ? 'copies' : 'copy'}
                {doubleSided ? ' × ½ (2-sided)' : ''}
                {' '}× GH₵{pricePerPage}
              </Text>
              <Text style={styles.livePriceTotal}>GH₵{totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        )}
        <View style={styles.bottomBtnRow}>
          {step !== 'file' && (
            <TouchableOpacity
              style={styles.backStepBtn}
              onPress={() => setStep(step === 'review' ? 'settings' : 'file')}
              activeOpacity={0.8}
            >
              <Text style={styles.backStepBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, (step === 'file' && !selectedFile) && styles.nextBtnDisabled, submitting && styles.nextBtnDisabled]}
            onPress={() => {
              if (step === 'file') {
                if (!selectedFile) { setError('Please select a file.'); return; }
                setError('');
                setStep('settings');
              } else if (step === 'settings') {
                setStep('review');
              } else {
                submit();
              }
            }}
            disabled={(step === 'file' && !selectedFile) || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {step === 'review' ? (submitting ? 'Placing Order...' : `Pay GH₵${totalPrice.toFixed(2)} · Confirm`) : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONT.heading, fontSize: 17, color: COLORS.textPrimary },
  headerSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  shieldBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },

  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.white, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  stepNum: { fontFamily: FONT.bold, fontSize: 12, color: COLORS.textTertiary },
  stepNumActive: { color: COLORS.white },
  stepLabel: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  stepLabelActive: { fontFamily: FONT.semiBold, color: COLORS.primary },

  section: { padding: SPACING.md },
  sectionTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },

  uploadBox: { borderWidth: 1.5, borderColor: COLORS.accent + '50', borderStyle: 'dashed', borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', gap: 6, backgroundColor: COLORS.accent + '06' },
  uploadTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  uploadSub: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary },
  uploadHint: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },

  orDivider: { textAlign: 'center', fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary, marginVertical: SPACING.md },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  fileRowSelected: { borderColor: COLORS.success, backgroundColor: COLORS.success + '06' },
  fileIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  fileMeta: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  safePrintBox: { backgroundColor: COLORS.success + '10', borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.success + '30' },
  safePrintRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  safePrintTitle: { flex: 1, fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary },
  safePrintDesc: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, lineHeight: 19 },

  textInput: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 11, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  toggleBtnText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  toggleBtnTextActive: { color: COLORS.primary, fontFamily: FONT.semiBold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  chipText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.textPrimary },
  counterVal: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.textPrimary, minWidth: 30, textAlign: 'center' },

  reviewCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 0.5, borderColor: COLORS.border },
  reviewCardTitle: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: SPACING.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reviewLabel: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  reviewValue: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, flex: 2, textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  reviewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTotalLabel: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary },
  reviewTotalValue: { fontFamily: FONT.bold, fontSize: 20, color: COLORS.primary },

  safePrintConfirm: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.success + '10', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.success + '30' },
  safePrintConfirmTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLORS.textPrimary, marginBottom: 4 },
  safePrintConfirmText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, lineHeight: 19 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorLight, borderRadius: RADIUS.sm, padding: 10, marginTop: SPACING.sm },
  errorText: { fontFamily: FONT.medium, fontSize: 13, color: COLORS.error, flex: 1 },

  priceLockBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.success + '12', borderRadius: RADIUS.md,
    padding: 12, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.success + '30',
  },
  priceLockText: { flex: 1, fontFamily: FONT.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  priceLockAmount: { fontFamily: FONT.bold, color: COLORS.success },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopWidth: 0.5, borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : 32,
    gap: SPACING.sm,
  },
  livePriceBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.success + '10', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.success + '25',
  },
  livePriceLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  livePriceLabel: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.success },
  livePriceBreakdown: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePriceBreakText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textTertiary },
  livePriceTotal: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.textPrimary },
  bottomBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  backStepBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  backStepBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textSecondary },
  nextBtn: { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  nextBtnDisabled: { backgroundColor: COLORS.textTertiary, shadowOpacity: 0, elevation: 0 },
  nextBtnText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.white },
});
