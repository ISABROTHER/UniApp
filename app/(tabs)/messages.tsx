import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Search, Edit, Menu, MessageSquare } from 'lucide-react-native';

import { RealtimeChannel } from '@supabase/supabase-js';

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
  return (name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatTime(ts: string | null) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

type Thread = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  last_message_preview?: string;
  other_member: { id: string; full_name: string } | null;
  unread_count: number;
};

export default function MessagesScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchThreads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); setRefreshing(false); return; }
      setCurrentUserId(user.id);

      const { data: rawThreads } = await supabase
        .from('message_threads')
        .select('id, participant_1, participant_2, last_message_at')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (!rawThreads || rawThreads.length === 0) {
        setThreads([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const otherIds = rawThreads.map((t: any) =>
        t.participant_1 === user.id ? t.participant_2 : t.participant_1
      );

      const { data: members } = await supabase
        .from('members')
        .select('id, full_name')
        .in('id', otherIds);

      const memberMap: Record<string, { id: string; full_name: string }> = {};
      (members || []).forEach((m: any) => { memberMap[m.id] = m; });

      const enriched: Thread[] = await Promise.all(
        rawThreads.map(async (t: any) => {
          const otherId = t.participant_1 === user.id ? t.participant_2 : t.participant_1;
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', t.id)
            .eq('receiver_id', user.id)
            .eq('read', false);

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('thread_id', t.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...t,
            other_member: memberMap[otherId] || { id: otherId, full_name: 'Hostel Owner' },
            unread_count: count ?? 0,
            last_message_preview: lastMsg?.content || '',
          };
        })
      );

      setThreads(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchThreads(); }, []));

  useEffect(() => {
    if (!currentUserId) return;

    channelRef.current = supabase
      .channel('messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === currentUserId || newMsg.receiver_id === currentUserId) {
            fetchThreads();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_threads',
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId]);

  const filtered = threads.filter((t) => {
    if (!search.trim()) return true;
    const name = t.other_member?.full_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const activeContacts = threads.slice(0, 8);

  return (
    <View style={styles.container}>
      {/* 1. Standardized Glassmorphic Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Menu size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Inbox</Text>
        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Edit size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 2. Glassmorphic Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor={COLORS.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchThreads(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Active Users Horizontal Scroll */}
        {activeContacts.length > 0 && !search && (
          <View style={styles.activeSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeRow}>
              {activeContacts.map((t) => {
                const name = t.other_member?.full_name || 'User';
                const color = getAvatarColor(name);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.activeItem}
                    onPress={() => router.push(`/chat?threadId=${t.id}&name=${encodeURIComponent(name)}` as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.activeAvatar, { backgroundColor: color }]}>
                      <Text style={styles.activeAvatarText}>{getInitials(name)}</Text>
                      {t.unread_count > 0 && <View style={styles.activeDot} />}
                    </View>
                    <Text style={styles.activeName} numberOfLines={1}>{name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Empty State */}
        {filtered.length === 0 && !loading && (
          <View style={styles.emptyStateCard}>
             <View style={styles.emptyIconBg}>
               <MessageSquare size={36} color={COLORS.textTertiary} />
             </View>
             <Text style={styles.emptyTitle}>No messages yet</Text>
             <Text style={styles.emptySubtitle}>
               Open a hostel listing and tap "Message Owner" to start chatting.
             </Text>
          </View>
        )}

        {/* 3. Glassmorphic Chat List */}
        <View style={styles.chatListContainer}>
          {filtered.map((t) => {
            const name = t.other_member?.full_name || 'Hostel Owner';
            const color = getAvatarColor(name);
            const hasUnread = t.unread_count > 0;

            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.item, hasUnread && styles.itemUnread]}
                onPress={() => router.push(`/chat?threadId=${t.id}&name=${encodeURIComponent(name)}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: color }]}>
                  <Text style={styles.avatarText}>{getInitials(name)}</Text>
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTop}>
                    <Text style={[styles.itemName, hasUnread && styles.itemNameBold]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.itemTime, hasUnread && styles.itemTimeBold]}>
                      {formatTime(t.last_message_at)}
                    </Text>
                  </View>
                  <View style={styles.itemBottom}>
                    <Text style={[styles.itemPreview, hasUnread && styles.itemPreviewBold]} numberOfLines={1}>
                      {t.last_message_preview || 'Start a conversation'}
                    </Text>
                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{t.unread_count > 99 ? '99+' : t.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F7F9' 
  },

  // EXACT MATCH: Standardized Header
  header: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  pageTitle: { 
    fontFamily: FONT.heading, 
    fontSize: 18, 
    color: COLORS.textPrimary 
  },
  headerIcon: { 
    width: 40, height: 40, 
    borderRadius: RADIUS.full, 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    justifyContent: 'center', alignItems: 'center' 
  },

  // Glassmorphic Search Bar
  searchWrap: { 
    paddingHorizontal: SPACING.md, 
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm, 
    backgroundColor: 'transparent' 
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)', 
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  searchInput: { 
    flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary, padding: 0 
  },

  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  activeSection: { 
    paddingBottom: SPACING.md, paddingTop: SPACING.sm 
  },
  activeRow: { 
    paddingHorizontal: SPACING.md, gap: 20 
  },
  activeItem: { 
    alignItems: 'center', width: 64 
  },
  activeAvatar: { 
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3
  },
  activeAvatarText: { 
    fontFamily: FONT.bold, fontSize: 20, color: COLORS.white 
  },
  activeDot: { 
    position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.white 
  },
  activeName: { 
    fontFamily: FONT.medium, fontSize: 13, color: COLORS.textPrimary, textAlign: 'center' 
  },

  chatListContainer: { 
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md
  },
  
  // Premium Glassmorphic Chat Cards
  item: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.92)', 
    borderRadius: RADIUS.xl, 
    padding: SPACING.md, 
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  itemUnread: {
    borderColor: 'rgba(220,20,60,0.15)', 
    backgroundColor: 'rgba(220,20,60,0.02)',
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.primary,
  },
  avatar: { 
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginRight: 14 
  },
  avatarText: { 
    fontFamily: FONT.bold, fontSize: 18, color: COLORS.white 
  },
  itemContent: { 
    flex: 1, minWidth: 0 
  },
  itemTop: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 
  },
  itemName: { 
    flex: 1, fontFamily: FONT.medium, fontSize: 16, color: COLORS.textPrimary, marginRight: 8 
  },
  itemNameBold: { 
    fontFamily: FONT.bold 
  },
  itemTime: { 
    fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary 
  },
  itemTimeBold: {
    color: COLORS.primary, fontFamily: FONT.medium
  },
  itemBottom: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' 
  },
  itemPreview: { 
    flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, marginRight: 8 
  },
  itemPreviewBold: { 
    fontFamily: FONT.semiBold, color: COLORS.textPrimary 
  },
  unreadBadge: { 
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2
  },
  unreadText: { 
    fontFamily: FONT.bold, fontSize: 11, color: COLORS.white 
  },

  // Premium Empty State (Matching Notifications)
  emptyStateCard: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  emptyIconBg: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { 
    fontFamily: FONT.heading, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 
  },
  emptySubtitle: { 
    fontFamily: FONT.regular, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 
  },
});