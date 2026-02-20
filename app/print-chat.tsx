import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Platform, KeyboardAvoidingView, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ArrowLeft, Send, Shield, FileText, Lock } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');

type ChatMsg = {
  id: string;
  job_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  read: boolean;
  created_at: string;
};

type PrintJob = {
  id: string;
  document_name: string;
  status: string;
  shop: { name: string } | null;
};

function formatMsgTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function PrintChatScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [job, setJob] = useState<PrintJob | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [jobRes, msgsRes] = await Promise.all([
        supabase.from('print_jobs').select('id, document_name, status, shop:print_shops(name)').eq('id', jobId).maybeSingle(),
        supabase.from('print_chat_messages').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
      ]);

      if (jobRes.data) setJob(jobRes.data as PrintJob);
      setMessages((msgsRes.data || []) as ChatMsg[]);
      setLoading(false);
    })();
  }, [jobId]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUserId || !jobId) return;
    const content = text.trim();
    setText('');

    const { data: msg } = await supabase.from('print_chat_messages').insert({
      job_id: jobId,
      sender_id: currentUserId,
      sender_role: 'student',
      content,
      read: false,
    }).select().maybeSingle();

    if (msg) {
      setMessages(prev => [...prev, msg as ChatMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const shopName = job?.shop?.name || 'Print Shop';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.accent} strokeWidth={2.5} />
          <Text style={styles.backLabel}>Job</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <Shield size={14} color={COLORS.white} fill={COLORS.white} />
          </View>
          <Text style={styles.headerName} numberOfLines={1}>{shopName}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Safe Print · Secure Chat</Text>
        </View>
        <View style={styles.lockBadge}>
          <Lock size={13} color={COLORS.success} />
        </View>
      </View>

      {job && (
        <View style={styles.jobBanner}>
          <FileText size={14} color={COLORS.accent} />
          <Text style={styles.jobBannerText} numberOfLines={1}>{job.document_name}</Text>
          <View style={[styles.jobStatusDot, { backgroundColor: job.status === 'completed' ? COLORS.success : COLORS.accent }]} />
          <Text style={styles.jobStatusText}>{job.status}</Text>
        </View>
      )}

      <View style={styles.secureBadge}>
        <Lock size={10} color={COLORS.success} />
        <Text style={styles.secureBadgeText}>Messages are tied to this print job and deleted when the job is closed</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Shield size={28} color={COLORS.success} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Secure Print Chat</Text>
          <Text style={styles.emptyText}>
            Chat with {shopName} about your print job. Messages are securely linked to this order only.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === currentUserId;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const showDate = !prevMsg || item.created_at.slice(0, 10) !== prevMsg.created_at.slice(0, 10);
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== item.sender_id;

            return (
              <View>
                {showDate && (
                  <View style={styles.dateSep}>
                    <Text style={styles.dateSepText}>{formatDateLabel(item.created_at)}</Text>
                  </View>
                )}
                <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
                  {!isMine && isLastInGroup && (
                    <View style={styles.shopAvatar}>
                      <Shield size={10} color={COLORS.white} fill={COLORS.white} />
                    </View>
                  )}
                  {!isMine && !isLastInGroup && <View style={styles.avatarSpacer} />}
                  <View style={[
                    styles.bubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                    isMine && !isLastInGroup && styles.myBubbleMid,
                    !isMine && !isLastInGroup && styles.theirBubbleMid,
                  ]}>
                    {!isMine && <Text style={styles.senderRole}>{shopName}</Text>}
                    <Text style={[styles.bubbleText, isMine ? styles.myText : styles.theirText]}>{item.content}</Text>
                    <Text style={[styles.bubbleTime, isMine ? styles.myTime : styles.theirTime]}>{formatMsgTime(item.created_at)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message the print shop..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={sendMessage}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Send size={16} color={text.trim() ? COLORS.accent : COLORS.textTertiary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backLabel: { fontFamily: FONT.medium, fontSize: 16, color: COLORS.accent },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerAvatarWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  headerName: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  headerSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.success },
  lockBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success + '14', justifyContent: 'center', alignItems: 'center' },

  jobBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accent + '10', paddingHorizontal: SPACING.md, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  jobBannerText: { flex: 1, fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary },
  jobStatusDot: { width: 7, height: 7, borderRadius: 4 },
  jobStatusText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },

  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.success + '0C', paddingHorizontal: SPACING.md, paddingVertical: 6, justifyContent: 'center' },
  secureBadgeText: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.success },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.success + '14', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONT.semiBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  messageList: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  dateSep: { alignItems: 'center', marginVertical: SPACING.md },
  dateSepText: { fontFamily: FONT.medium, fontSize: 11, color: COLORS.textTertiary, backgroundColor: '#DDD', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3, paddingHorizontal: 4 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  shopAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  avatarSpacer: { width: 32 },

  bubble: { maxWidth: SW * 0.72, borderRadius: 18, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 6 },
  myBubble: { backgroundColor: COLORS.accent, borderBottomRightRadius: 4 },
  myBubbleMid: { borderBottomRightRadius: 18 },
  theirBubble: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4 },
  theirBubbleMid: { borderBottomLeftRadius: 18 },

  senderRole: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.success, marginBottom: 2 },
  bubbleText: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22 },
  myText: { color: COLORS.white },
  theirText: { color: COLORS.textPrimary },
  bubbleTime: { fontFamily: FONT.regular, fontSize: 10, marginTop: 3, textAlign: 'right' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  theirTime: { color: COLORS.textTertiary },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: COLORS.white, borderTopWidth: 0.5, borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'web' ? SPACING.sm : 28, gap: SPACING.sm,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary,
    maxHeight: 100, borderWidth: 1, borderColor: COLORS.border, minHeight: 36,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
