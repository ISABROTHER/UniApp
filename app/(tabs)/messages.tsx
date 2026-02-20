import { useState, useCallback } from 'react';
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
import { Search, Edit, CheckCheck } from 'lucide-react-native';

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

  const filtered = threads.filter((t) => {
    if (!search.trim()) return true;
    const name = t.other_member?.full_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const activeContacts = threads.slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Chats</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Edit size={20} color={COLORS.accent} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={15} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={COLORS.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchThreads(); }}
            tintColor={COLORS.accent}
          />
        }
      >
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

        {filtered.length === 0 && !loading && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Edit size={32} color={COLORS.accent} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Open a hostel listing and tap "Message Owner" to start chatting.
            </Text>
          </View>
        )}

        {filtered.map((t) => {
          const name = t.other_member?.full_name || 'Hostel Owner';
          const color = getAvatarColor(name);
          const hasUnread = t.unread_count > 0;

          return (
            <TouchableOpacity
              key={t.id}
              style={styles.item}
              onPress={() => router.push(`/chat?threadId=${t.id}&name=${encodeURIComponent(name)}` as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.avatar, { backgroundColor: color }]}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemName, hasUnread && styles.itemNameBold]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.itemTime, hasUnread && styles.itemTimeBlue]}>
                    {formatTime(t.last_message_at)}
                  </Text>
                </View>
                <View style={styles.itemBottom}>
                  <Text style={[styles.itemPreview, hasUnread && styles.itemPreviewBold]} numberOfLines={1}>
                    {t.last_message_preview || 'Start a conversation'}
                  </Text>
                  {hasUnread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{t.unread_count > 99 ? '99+' : t.unread_count}</Text>
                    </View>
                  ) : (
                    <CheckCheck size={15} color={COLORS.accent} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
  },
  pageTitle: { fontFamily: FONT.headingBold, fontSize: 28, color: COLORS.textPrimary },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  searchWrap: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, backgroundColor: COLORS.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLORS.textPrimary },

  activeSection: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingBottom: SPACING.md, marginBottom: 4, paddingTop: SPACING.sm },
  activeRow: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
  activeItem: { alignItems: 'center', gap: 6, width: 62 },
  activeAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  activeAvatarText: { fontFamily: FONT.bold, fontSize: 18, color: COLORS.white },
  activeDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent, borderWidth: 2, borderColor: COLORS.white },
  activeName: { fontFamily: FONT.medium, fontSize: 12, color: COLORS.textPrimary, textAlign: 'center' },

  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight, gap: SPACING.md, backgroundColor: COLORS.white },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontFamily: FONT.bold, fontSize: 17, color: COLORS.white },
  itemContent: { flex: 1, minWidth: 0 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  itemName: { flex: 1, fontFamily: FONT.medium, fontSize: 16, color: COLORS.textPrimary, marginRight: 8 },
  itemNameBold: { fontFamily: FONT.semiBold },
  itemTime: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  itemTimeBlue: { color: COLORS.accent },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemPreview: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, marginRight: 8 },
  itemPreviewBold: { fontFamily: FONT.medium, color: COLORS.textPrimary },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadText: { fontFamily: FONT.bold, fontSize: 11, color: COLORS.white },

  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: SPACING.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONT.semiBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
