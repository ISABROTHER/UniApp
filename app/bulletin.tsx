import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Plus,
  Pin,
  Trash2,
  X,
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Category = 'announcement' | 'job' | 'event' | 'service' | 'general';

interface BulletinPost {
  id: string;
  user_id: string;
  university: string;
  title: string;
  content: string;
  category: Category;
  image_url: string | null;
  is_pinned: boolean;
  expires_at: string | null;
  status: string;
  created_at: string;
  author_name: string;
}

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Announcement', value: 'announcement' },
  { label: 'Job', value: 'job' },
  { label: 'Event', value: 'event' },
  { label: 'Service', value: 'service' },
  { label: 'General', value: 'general' },
];

const CATEGORY_COLORS: Record<Category, string> = {
  announcement: COLORS.primary,
  job: COLORS.accent,
  event: COLORS.success,
  service: COLORS.warning,
  general: COLORS.textSecondary,
};

export default function BulletinScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BulletinPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general' as Category,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, selectedCategory, searchQuery]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          *,
          members!bulletin_posts_user_id_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPosts = data.map((post: any) => ({
        ...post,
        author_name: post.members?.full_name || 'Anonymous',
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load bulletin posts');
    }
  };

  const filterPosts = () => {
    let filtered = posts;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        post =>
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query)
      );
    }

    setFilteredPosts(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase.from('bulletin_posts').insert({
        user_id: user?.id,
        university: user?.university,
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        category: newPost.category,
        is_pinned: false,
        status: 'active',
      });

      if (error) throw error;

      setIsCreateModalVisible(false);
      setNewPost({ title: '', content: '', category: 'general' });
      await fetchPosts();
      Alert.alert('Success', 'Post created successfully');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bulletin_posts')
                .update({ status: 'removed' })
                .eq('id', postId);

              if (error) throw error;

              await fetchPosts();
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderCategoryBadge = (category: Category) => {
    return (
      <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[category] + '20' }]}>
        <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[category] }]}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Text>
      </View>
    );
  };

  const renderPostCard = (post: BulletinPost) => {
    const isOwnPost = post.user_id === user?.id;

    return (
      <View key={post.id} style={styles.postCard}>
        {post.is_pinned && (
          <View style={styles.pinnedIndicator}>
            <Pin size={14} color={COLORS.primary} fill={COLORS.primary} />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}

        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            {renderCategoryBadge(post.category)}
          </View>
          {isOwnPost && (
            <TouchableOpacity
              onPress={() => handleDeletePost(post.id)}
              style={styles.deleteButton}
            >
              <Trash2 size={18} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postContent} numberOfLines={3}>
          {post.content}
        </Text>

        <View style={styles.postFooter}>
          <Text style={styles.authorName}>{post.author_name}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(post.created_at)}</Text>
        </View>
      </View>
    );
  };

  const renderCreateModal = () => {
    return (
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter post title"
                placeholderTextColor={COLORS.textTertiary}
                value={newPost.title}
                onChangeText={(text) => setNewPost({ ...newPost, title: text })}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelector}>
                {CATEGORIES.slice(1).map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categorySelectorItem,
                      newPost.category === cat.value && styles.categorySelectorItemActive,
                      { borderColor: CATEGORY_COLORS[cat.value as Category] },
                      newPost.category === cat.value && { backgroundColor: CATEGORY_COLORS[cat.value as Category] + '20' },
                    ]}
                    onPress={() => setNewPost({ ...newPost, category: cat.value as Category })}
                  >
                    <Text
                      style={[
                        styles.categorySelectorText,
                        newPost.category === cat.value && { color: CATEGORY_COLORS[cat.value as Category], fontFamily: FONT.semiBold },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="Write your post content here..."
                placeholderTextColor={COLORS.textTertiary}
                value={newPost.content}
                onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreatePost}
              >
                <Text style={styles.createButtonText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bulletin Board</Text>
        <TouchableOpacity
          onPress={() => setIsCreateModalVisible(true)}
          style={styles.addButton}
        >
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryPill,
              selectedCategory === category.value && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(category.value)}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === category.value && styles.categoryPillTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No posts found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different search term' : 'Be the first to create a post!'}
            </Text>
          </View>
        ) : (
          filteredPosts.map(renderPostCard)
        )}
      </ScrollView>

      {renderCreateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.headingBold,
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  categoryFilter: {
    marginTop: SPACING.md,
    maxHeight: 50,
  },
  categoryFilterContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  categoryPillTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  pinnedText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.primary,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  postHeaderLeft: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  postTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  postContent: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONT.headingBold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  titleInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categorySelectorItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
  },
  categorySelectorItemActive: {
    borderWidth: 1.5,
  },
  categorySelectorText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  contentInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    minHeight: 160,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
  },
  createButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
});
