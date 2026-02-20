import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ArrowLeft, Send, Camera } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');

const BUBBLE_COLORS = [
  '#DC143C', '#4A90E2', '#16A34A', '#F59E0B', '#0CC0B0',
  '#EA580C', '#7C3AED', '#0284C7', '#1A2332',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BUBBLE_COLORS[Math.abs(hash) % BUBBLE_COLORS.length];
}

function getInitials(name: string) {
  return (name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short' });
}

type Msg = {
  id: string;
  thread_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type OtherMember = { id: string; full_name: string; faculty?: string };

export default function ChatScreen() {
  const router = useRouter();
  const { threadId, name, ownerId } = useLocalSearchParams<{ threadId: string; name: string; ownerId: string }>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherMember, setOtherMember] = useState<OtherMember | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(threadId || null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (threadId) {
        await loadThread(user.id, threadId);
      } else if (ownerId) {
        await getOrCreateThread(user.id, ownerId);
      }
    })();
  }, [threadId, ownerId]);

  const loadThread = async (userId: string, tId: string) => {
    const { data: thread } = await supabase
      .from('message_threads')
      .select('participant_1, participant_2')
      .eq('id', tId)
      .maybeSingle();

    if (thread) {
      const otherId = thread.participant_1 === userId ? thread.participant_2 : thread.participant_1;
      await fetchOtherMember(otherId);
    }
    await fetchMessages(userId, tId);
  };

  const getOrCreateThread = async (userId: string, targetOwnerId: string) => {
    const { data: member } = await supabase.from('members').select('id, full_name, faculty').eq('id', targetOwnerId).maybeSingle();
    if (member) setOtherMember(member as OtherMember);

    const { data: existing } = await supabase
      .from('message_threads')
      .select('id')
      .or(`and(participant_1.eq.${userId},participant_2.eq.${targetOwnerId}),and(participant_1.eq.${targetOwnerId},participant_2.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      setResolvedThreadId(existing.id);
      await fetchMessages(userId, existing.id);
    } else {
      const { data: newThread } = await supabase
        .from('message_threads')
        .insert({ participant_1: userId, participant_2: targetOwnerId })
        .select('id')
        .maybeSingle();
      if (newThread) {
        setResolvedThreadId(newThread.id);
        setMessages([]);
        setLoading(false);
      }
    }
  };

  const fetchOtherMember = async (otherId: string) => {
    const { data } = await supabase.from('members').select('id, full_name, faculty').eq('id', otherId).maybeSingle();
    if (data) setOtherMember(data as OtherMember);
  };

  const fetchMessages = async (userId: string, tId: string) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', tId)
      .order('created_at', { ascending: true });

    setMessages((msgs as Msg[]) || []);
    setLoading(false);

    await supabase.from('messages')
      .update({ read: true })
      .eq('thread_id', tId)
      .eq('receiver_id', userId)
      .eq('read', false);
  };

  const sendMessage = async () => {
    const tId = resolvedThreadId;
    if (!text.trim() || !currentUserId || !tId) return;
    const content = text.trim();
    setText('');

    const receiverId = otherMember?.id;
    if (!receiverId) return;

    const { data: msg } = await supabase.from('messages').insert({
      thread_id: tId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      content,
      read: false,
    }).select().maybeSingle();

    if (msg) {
      setMessages(prev => [...prev, msg as Msg]);
      await supabase.from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', tId);
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const displayName = otherMember?.full_name || name || 'Chat';
  const avatarColor = getAvatarColor(displayName);
  const initials = getInitials(displayName);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.accent} strokeWidth={2.5} />
          <Text style={styles.backLabel}>Chats</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          {otherMember?.faculty && (
            <Text style={styles.headerSub} numberOfLines={1}>{otherMember.faculty}</Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.emptyAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.emptyName}>{displayName}</Text>
          {otherMember?.faculty && <Text style={styles.emptySub}>{otherMember.faculty}</Text>}
          <Text style={styles.emptyHint}>Say hello to start the conversation</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
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
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>{formatDateLabel(item.created_at)}</Text>
                  </View>
                )}
                <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
                  {!isMine && isLastInGroup && (
                    <View style={[styles.msgAvatar, { backgroundColor: avatarColor }]}>
                      <Text style={styles.msgAvatarText}>{initials}</Text>
                    </View>
                  )}
                  {!isMine && !isLastInGroup && <View style={styles.msgAvatarSpacer} />}
                  <View style={[
                    styles.bubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                    isMine && !isLastInGroup && styles.myBubbleMid,
                    !isMine && !isLastInGroup && styles.theirBubbleMid,
                  ]}>
                    <Text style={[styles.bubbleText, isMine ? styles.myText : styles.theirText]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.bubbleTime, isMine ? styles.myTime : styles.theirTime]}>
                      {formatMsgTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.7}>
          <Camera size={22} color={COLORS.textTertiary} strokeWidth={1.8} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Start typing..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          maxLength={1000}
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backLabel: { fontFamily: FONT.medium, fontSize: 16, color: COLORS.accent },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  headerAvatarText: { fontFamily: FONT.bold, fontSize: 13, color: COLORS.white },
  headerName: { fontFamily: FONT.semiBold, fontSize: 15, color: COLORS.textPrimary },
  headerSub: { fontFamily: FONT.regular, fontSize: 11, color: COLORS.textSecondary },
  headerRight: { minWidth: 70 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  emptyAvatarText: { fontFamily: FONT.bold, fontSize: 24, color: COLORS.white },
  emptyName: { fontFamily: FONT.semiBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: 4 },
  emptySub: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },
  emptyHint: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textTertiary },

  messageList: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  dateSeparator: { alignItems: 'center', marginVertical: SPACING.md },
  dateSeparatorText: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary, backgroundColor: '#DDD', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2, paddingHorizontal: 4 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 6, flexShrink: 0 },
  msgAvatarText: { fontFamily: FONT.bold, fontSize: 10, color: COLORS.white },
  msgAvatarSpacer: { width: 34 },

  bubble: { maxWidth: SW * 0.72, borderRadius: 18, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 6 },
  myBubble: { backgroundColor: COLORS.accent, borderBottomRightRadius: 4 },
  myBubbleMid: { borderBottomRightRadius: 18 },
  theirBubble: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4 },
  theirBubbleMid: { borderBottomLeftRadius: 18 },

  bubbleText: { fontFamily: FONT.regular, fontSize: 16, lineHeight: 22 },
  myText: { color: COLORS.white },
  theirText: { color: COLORS.textPrimary },
  bubbleTime: { fontFamily: FONT.regular, fontSize: 10, marginTop: 3, textAlign: 'right' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  theirTime: { color: COLORS.textTertiary },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: COLORS.white, borderTopWidth: 0.5, borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'web' ? SPACING.sm : 28, gap: SPACING.sm,
  },
  cameraBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary,
    maxHeight: 120, borderWidth: 1, borderColor: COLORS.border, minHeight: 36,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
