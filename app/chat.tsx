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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ChevronLeft, Send, Camera, Check, CheckCheck } from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type OtherMember = { id: string; full_name: string; faculty?: string };

export default function ChatScreen() {
  const router = useRouter();
  const { threadId, name, ownerId } = useLocalSearchParams<{ threadId: string; name: string; ownerId: string }>();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherMember, setOtherMember] = useState<OtherMember | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(threadId || null);

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      if (threadId) {
        await loadThread(user.id, threadId);
      } else if (ownerId && ownerId !== 'undefined' && ownerId !== 'null') {
        await getOrCreateThread(user.id, ownerId);
      } else {
        await getOrCreateThread(user.id, 'a0000000-0000-0000-0000-000000000001');
      }
    })();
  }, [threadId, ownerId]);

  useEffect(() => {
    if (!resolvedThreadId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`chat_${resolvedThreadId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${resolvedThreadId}`,
        },
        (payload) => {
          const newMsg = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            if (prev.some((m) => m.id.startsWith('temp-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id)) {
              return prev.map((m) =>
                m.id.startsWith('temp-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id
                  ? newMsg
                  : m
              );
            }
            return [...prev, newMsg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

          if (currentUserId && newMsg.sender_id !== currentUserId && !newMsg.is_read) {
            supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', newMsg.id).then(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${resolvedThreadId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Msg;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [resolvedThreadId, currentUserId]);

  const loadThread = async (userId: string, tId: string) => {
    try {
      const { data: thread } = await supabase
        .from('conversations')
        .select('participant_a, participant_b')
        .eq('id', tId)
        .maybeSingle();

      if (thread) {
        const otherId = thread.participant_a === userId ? thread.participant_b : thread.participant_a;
        setTargetUserId(otherId);
        await fetchOtherMember(otherId);
      }
      await fetchMessages(userId, tId);
    } catch (err) {
      console.error('loadThread error:', err);
      setLoading(false);
    }
  };

  const getOrCreateThread = async (userId: string, targetOwnerId: string) => {
    try {
      let safeTargetId = targetOwnerId;

      if (!safeTargetId || safeTargetId === 'undefined' || safeTargetId === 'null') {
        safeTargetId = 'a0000000-0000-0000-0000-000000000001';
      }

      setTargetUserId(safeTargetId);

      const { data: member } = await supabase.from('members').select('id, full_name, faculty').eq('id', safeTargetId).maybeSingle();
      if (member) setOtherMember(member as OtherMember);

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_a.eq.${userId},participant_b.eq.${safeTargetId}),and(participant_a.eq.${safeTargetId},participant_b.eq.${userId})`)
        .maybeSingle();

      if (existing) {
        setResolvedThreadId(existing.id);
        await fetchMessages(userId, existing.id);
      } else {
        const { data: newThread, error } = await supabase
          .from('conversations')
          .insert({ participant_a: userId, participant_b: safeTargetId })
          .select('id')
          .maybeSingle();

        if (error) {
          showAlert('Error', 'Could not start conversation. Please try again.');
          console.error('Thread creation error:', error);
        } else if (newThread) {
          setResolvedThreadId(newThread.id);
          setMessages([]);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('getOrCreateThread error:', err);
      showAlert('Error', 'Failed to load chat. Please try again.');
      setLoading(false);
    }
  };

  const fetchOtherMember = async (otherId: string) => {
    const { data } = await supabase.from('members').select('id, full_name, faculty').eq('id', otherId).maybeSingle();
    if (data) setOtherMember(data as OtherMember);
  };

  const fetchMessages = async (userId: string, tId: string) => {
    try {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', tId)
        .order('created_at', { ascending: true });

      setMessages((msgs as Msg[]) || []);
    } catch (err) {
      console.error('fetchMessages error:', err);
    } finally {
      setLoading(false);
    }

    await supabase.from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', tId)
      .neq('sender_id', userId)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content) return;

    if (!currentUserId) {
      showAlert('Error', 'You must be logged in to send messages.');
      return;
    }

    if (!targetUserId) {
      showAlert('Error', 'No recipient found. The hostel owner may not be available.');
      return;
    }

    if (!resolvedThreadId) {
      showAlert('Error', 'Chat not ready. Please wait a moment and try again.');
      return;
    }

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Msg = {
      id: tempId,
      conversation_id: resolvedThreadId,
      sender_id: currentUserId,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    const { error } = await supabase.from('messages').insert({
      conversation_id: resolvedThreadId,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      console.error('Send message error:', error);
      showAlert('Send Failed', 'Your message could not be sent. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
    }

    setSending(false);
  };

  const displayName = name || otherMember?.full_name || 'Chat';
  const avatarColor = getAvatarColor(displayName);

  const renderMessage = ({ item, index }: { item: Msg; index: number }) => {
    const isMe = item.sender_id === currentUserId;
    const prevMsg = messages[index - 1];
    const showDateLabel = !prevMsg || new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

    return (
      <View>
        {showDateLabel && (
          <View style={styles.dateLabelWrap}>
            <Text style={styles.dateLabel}>{formatDateLabel(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
          {!isMe && (
            <View style={[styles.avatarSmall, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarSmallText}>{getInitials(displayName)}</Text>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
            
            <View style={[styles.msgFooter, isMe ? styles.msgFooterMe : styles.msgFooterOther]}>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatMsgTime(item.created_at)}</Text>
              
              {isMe && (
                <View style={styles.readStatus}>
                  {item.is_read ? (
                    <CheckCheck size={14} color="#4ADE80" />
                  ) : (
                    <Check size={14} color="rgba(255,255,255,0.7)" />
                  )}
                </View>
              )}
            </View>

          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          {otherMember?.faculty && <Text style={styles.headerSub}>{otherMember.faculty}</Text>}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.cameraBtn}>
          <Camera size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Send size={20} color={text.trim() && !sending ? COLORS.white : COLORS.textTertiary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 16 : 56,
    paddingBottom: 12,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: { padding: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.white },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: FONT.semiBold, fontSize: 16, color: COLORS.textPrimary },
  headerSub: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary },

  messagesList: { padding: SPACING.md, paddingBottom: 8 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textTertiary },

  dateLabelWrap: { alignItems: 'center', marginVertical: 12 },
  dateLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textTertiary, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },

  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  avatarSmall: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarSmallText: { fontFamily: FONT.semiBold, fontSize: 10, color: COLORS.white },

  bubble: { maxWidth: SW * 0.72, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.lg },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, lineHeight: 21 },
  bubbleTextMe: { color: COLORS.white },
  
  msgFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  msgFooterMe: { justifyContent: 'flex-end' },
  msgFooterOther: { justifyContent: 'flex-start' },
  bubbleTime: { fontFamily: FONT.regular, fontSize: 10, color: COLORS.textTertiary },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  readStatus: { marginLeft: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  cameraBtn: { padding: 8 },
  input: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.background },
});