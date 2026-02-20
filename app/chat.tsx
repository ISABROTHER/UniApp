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
import { ChevronLeft, Send, Camera } from 'lucide-react-native';
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
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(threadId || null);
  
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Cross-platform alert fallback
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
      } else if (ownerId) {
        await getOrCreateThread(user.id, ownerId);
      } else {
        // Fallback if neither is provided
        await getOrCreateThread(user.id, 'undefined');
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
          filter: `thread_id=eq.${resolvedThreadId}`,
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

          if (currentUserId && newMsg.receiver_id === currentUserId && !newMsg.read) {
            supabase.from('messages').update({ read: true }).eq('id', newMsg.id).then(() => {});
          }
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
        .from('message_threads')
        .select('participant_1, participant_2')
        .eq('id', tId)
        .maybeSingle();

      if (thread) {
        const otherId = thread.participant_1 === userId ? thread.participant_2 : thread.participant_1;
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
      
      // Fallback logic using the specific Demo Owner UUID from your SQL file
      if (!safeTargetId || safeTargetId === 'undefined' || safeTargetId === 'null') {
        safeTargetId = 'a0000000-0000-0000-0000-000000000001'; 
      }

      setTargetUserId(safeTargetId); 
      
      const { data: member } = await supabase.from('members').select('id, full_name, faculty').eq('id', safeTargetId).maybeSingle();
      if (member) setOtherMember(member as OtherMember);

      const { data: existing } = await supabase
        .from('message_threads')
        .select('id')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${safeTargetId}),and(participant_1.eq.${safeTargetId},participant_2.eq.${userId})`)
        .maybeSingle();

      if (existing) {
        setResolvedThreadId(existing.id);
        await fetchMessages(userId, existing.id);
      } else {
        const { data: newThread } = await supabase
          .from('message_threads')
          .insert({ participant_1: userId, participant_2: safeTargetId })
          .select('id')
          .maybeSingle();

        if (newThread) {
          setResolvedThreadId(newThread.id);
          setMessages([]);
        }
        setLoading(false); 
      }
    } catch (err) {
      console.error('getOrCreateThread error:', err);
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
        .eq('thread_id', tId)
        .order('created_at', { ascending: true });

      setMessages((msgs as Msg[]) || []);
    } catch (err) {
      console.error('fetchMessages error:', err);
    } finally {
      setLoading(false); 
    }

    await supabase.from('messages')
      .update({ read: true })
      .eq('thread_id', tId)
      .eq('receiver_id', userId)
      .eq