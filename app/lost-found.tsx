import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Plus,
  MapPin,
  Clock,
  Tag,
  MessageCircle,
  X,
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type ItemType = 'lost' | 'found';
type Category = 'All' | 'Electronics' | 'Clothing' | 'Documents' | 'Keys' | 'Bags' | 'Other';
type Status = 'active' | 'claimed' | 'resolved';

interface LostFoundItem {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  description: string;
  category: string;
  location: string;
  image_url?: string;
  contact_method: 'in_app' | 'phone';
  status: Status;
  created_at: string;
}

export default function LostFoundScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ItemType>('lost');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LostFoundItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    type: 'lost' as ItemType,
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    contact_method: 'in_app' as 'in_app' | 'phone',
  });

  const categories: Category[] = ['All', 'Electronics', 'Clothing', 'Documents', 'Keys', 'Bags', 'Other'];

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [activeTab, selectedCategory, items, searchQuery]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items.filter(item => item.type === activeTab);

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const handleCreatePost = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('lost_found_items').insert({
        user_id: user.id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: formData.location.trim(),
        contact_method: formData.contact_method,
        status: 'active',
      });

      if (error) throw error;

      Alert.alert('Success', 'Your post has been created');
      setIsModalVisible(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'lost',
      title: '',
      description: '',
      category: 'Electronics',
      location: '',
      contact_method: 'in_app',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const openChat = (item: LostFoundItem) => {
    if (item.contact_method === 'in_app') {
      router.push(`/messages?userId=${item.user_id}`);
    } else {
      Alert.alert('Contact', 'Phone contact method selected. Direct messaging not available.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lost & Found</Text>
        <TouchableOpacity
          onPress={() => {
            setFormData({ ...formData, type: activeTab });
            setIsModalVisible(true);
          }}
          style={styles.addButton}
        >
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.activeTab]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.tabText, activeTab === 'lost' && styles.activeTabText]}>Lost</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'found' && styles.activeTab]}
          onPress={() => setActiveTab('found')}
        >
          <Text style={[styles.tabText, activeTab === 'found' && styles.activeTabText]}>Found</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.activeCategoryChip,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.activeCategoryChipText,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchItems} />}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No {activeTab} items found{selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </Text>
          </View>
        ) : (
          filteredItems.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: item.type === 'lost' ? COLORS.error : COLORS.success },
                  ]}
                >
                  <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
                </View>
                <View style={styles.timeContainer}>
                  <Clock size={14} color={COLORS.textSecondary} />
                  <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
                </View>
              </View>

              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.itemMeta}>
                <View style={styles.metaItem}>
                  <MapPin size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{item.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Tag size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{item.category}</Text>
                </View>
              </View>

              {item.user_id !== user?.id && (
                <TouchableOpacity style={styles.contactButton} onPress={() => openChat(item)}>
                  <MessageCircle size={18} color={COLORS.white} />
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Create {formData.type === 'lost' ? 'Lost' : 'Found'} Post
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsModalVisible(false);
                  resetForm();
                }}
              >
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'lost' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type: 'lost' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === 'lost' && styles.typeButtonTextActive,
                    ]}
                  >
                    Lost
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'found' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type: 'found' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === 'found' && styles.typeButtonTextActive,
                    ]}
                  >
                    Found
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Black iPhone 14"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.title}
                onChangeText={text => setFormData({ ...formData, title: text })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide details..."
                placeholderTextColor={COLORS.textTertiary}
                value={formData.description}
                onChangeText={text => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modalCategoryContainer}
              >
                {categories.filter(c => c !== 'All').map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      formData.category === category && styles.activeCategoryChip,
                    ]}
                    onPress={() => setFormData({ ...formData, category })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === category && styles.activeCategoryChipText,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Library 2nd Floor"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.location}
                onChangeText={text => setFormData({ ...formData, location: text })}
              />

              <Text style={styles.label}>Contact Method</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.contact_method === 'in_app' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, contact_method: 'in_app' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.contact_method === 'in_app' && styles.typeButtonTextActive,
                    ]}
                  >
                    In-App Message
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.contact_method === 'phone' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, contact_method: 'phone' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.contact_method === 'phone' && styles.typeButtonTextActive,
                    ]}
                  >
                    Phone
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleCreatePost}>
                <Text style={styles.submitButtonText}>Create Post</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingTop: SPACING.xl + 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
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
    height: 44,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  categoryContainer: {
    marginTop: SPACING.md,
  },
  categoryContent: {
    paddingHorizontal: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCategoryChip: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  categoryChipText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activeCategoryChipText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    marginTop: SPACING.md,
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  typeBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: COLORS.white,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  itemTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  itemDescription: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  contactButtonText: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalScroll: {
    padding: SPACING.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalCategoryContainer: {
    marginBottom: SPACING.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButtonText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.white,
  },
});
