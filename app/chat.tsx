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
import { ChevronLeft, Send, Camera } from 'lucide-react-native';

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
      {/* Thread Header Match */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#007AFF" />
          <Text style={styles.backLabel}>Chats</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <Text style={styles.settingsLabel}>Settings</Text>
        </TouchableOpacity>
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
                {/* Chat Bubbles Match */}
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
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Chat Input Match */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.7}>
          <Camera size={24} color="#8E8E93" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Start typing..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={sendMessage}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Send size={20} color={text.trim() ? "#007AFF" : "#C7C7CC"} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 70 },
  backLabel: { fontFamily: FONT.medium, fontSize: 17, color: '#007AFF', marginLeft: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontFamily: FONT.semiBold, fontSize: 17, color: '#000' },
  headerRight: { minWidth: 70, alignItems: 'flex-end' },
  settingsLabel: { fontFamily: FONT.medium, fontSize: 17, color: '#007AFF' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONT.regular, fontSize: 14, color: '#8E8E93' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyAvatarText: { fontFamily: FONT.bold, fontSize: 24, color: '#fff' },
  emptyName: { fontFamily: FONT.semiBold, fontSize: 20, color: '#000', marginBottom: 8 },
  emptyHint: { fontFamily: FONT.regular, fontSize: 15, color: '#8E8E93' },

  messageList: { paddingVertical: 16, paddingHorizontal: 16 },
  dateSeparator: { alignItems: 'center', marginVertical: 16 },
  dateSeparatorText: { fontFamily: FONT.medium, fontSize: 12, color: '#8E8E93' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0 },
  msgAvatarText: { fontFamily: FONT.bold, fontSize: 12, color: '#fff' },
  msgAvatarSpacer: { width: 40 },

  bubble: { maxWidth: SW * 0.75, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  myBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  myBubbleMid: { borderBottomRightRadius: 20 },
  theirBubble: { backgroundColor: '#E5E5EA', borderBottomLeftRadius: 4 },
  theirBubbleMid: { borderBottomLeftRadius: 20 },

  bubbleText: { fontFamily: FONT.regular, fontSize: 16, lineHeight: 22 },
  myText: { color: '#fff' },
  theirText: { color: '#000' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7',
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  cameraBtn: { marginRight: 12 },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  input: {
    flex: 1, fontFamily: FONT.regular, fontSize: 16, color: '#000',
    maxHeight: 100, paddingTop: 8, paddingBottom: 8,
  },
  sendBtn: { marginLeft: 8 },
});