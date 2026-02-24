import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Image, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, Award, Mail, Phone, MessageCircle, Send,
  ChevronRight, User, Shield,
} from 'lucide-react-native';

interface Executive {
  id: string;
  position: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  category: 'president' | 'vice' | 'secretary' | 'treasurer' | 'coordinator' | 'other';
}

const POSITION_HIERARCHY = [
  'Hall President',
  'Vice President',
  'General Secretary',
  'Financial Secretary',
  'Treasurer',
  'Entertainment Coordinator',
  'Sports Coordinator',
  'Welfare Coordinator',
  'Academic Coordinator',
  'Public Relations Officer',
  'Organizing Secretary',
  'Women Commissioner',
];

export default function JCRCExecutivesScreen() {
  const router = useRouter();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState<Executive | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    fetchExecutives();
  }, []);

  const fetchExecutives = async () => {
    try {
      // Mock data - replace with actual Supabase query
      const mockExecs: Executive[] = [
        {
          id: '1',
          position: 'Hall President',
          name: 'Kwame Mensah',
          email: 'president@hall.ucc.edu.gh',
          phone: '+233 24 123 4567',
          category: 'president',
        },
        {
          id: '2',
          position: 'Vice President',
          name: 'Ama Serwaa',
          email: 'vp@hall.ucc.edu.gh',
          phone: '+233 24 234 5678',
          category: 'vice',
        },
        {
          id: '3',
          position: 'General Secretary',
          name: 'Kofi Antwi',
          email: 'secretary@hall.ucc.edu.gh',
          phone: '+233 24 345 6789',
          category: 'secretary',
        },
        {
          id: '4',
          position: 'Financial Secretary',
          name: 'Abena Osei',
          email: 'finance@hall.ucc.edu.gh',
          phone: '+233 24 456 7890',
          category: 'secretary',
        },
        {
          id: '5',
          position: 'Treasurer',
          name: 'Yaw Boateng',
          email: 'treasurer@hall.ucc.edu.gh',
          phone: '+233 24 567 8901',
          category: 'treasurer',
        },
        {
          id: '6',
          position: 'Entertainment Coordinator',
          name: 'Efua Agyeman',
          email: 'entertainment@hall.ucc.edu.gh',
          phone: '+233 24 678 9012',
          category: 'coordinator',
        },
      ];

      setExecutives(mockExecs);
    } catch (error) {
      console.error('Error fetching executives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (exec: Executive) => {
    setSelectedExec(exec);
    setShowMessageModal(true);
  };

  const handleSendMessageConfirm = async () => {
    if (!messageText.trim() || !selectedExec) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      // Here you would send the message via your chat system
      Alert.alert('Success', `Message sent to ${selectedExec.name}`);
      setShowMessageModal(false);
      setMessageText('');
      setSelectedExec(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'president': return '#DC143C';
      case 'vice': return '#F59E0B';
      case 'secretary': return '#3B82F6';
      case 'treasurer': return '#10B981';
      case 'coordinator': return '#8B5CF6';
      default: return COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>JCRC Executives</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Shield size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Connect directly with hall leadership. Send messages for inquiries, concerns, or feedback.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Executive Members</Text>

        {executives.map((exec, index) => (
          <View key={exec.id} style={styles.executiveCard}>
            <View style={styles.executiveHeader}>
              <View style={[
                styles.avatar,
                { backgroundColor: getCategoryColor(exec.category) + '15' }
              ]}>
                {exec.avatar_url ? (
                  <Image source={{ uri: exec.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: getCategoryColor(exec.category) }]}>
                    {getInitials(exec.name)}
                  </Text>
                )}
              </View>

              <View style={styles.executiveInfo}>
                <Text style={styles.executiveName}>{exec.name}</Text>
                <View style={styles.positionBadge}>
                  <Award size={12} color={getCategoryColor(exec.category)} />
                  <Text style={[styles.executivePosition, { color: getCategoryColor(exec.category) }]}>
                    {exec.position}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <Mail size={14} color={COLORS.textSecondary} />
                <Text style={styles.contactText} numberOfLines={1}>{exec.email}</Text>
              </View>
              <View style={styles.contactItem}>
                <Phone size={14} color={COLORS.textSecondary} />
                <Text style={styles.contactText}>{exec.phone}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => handleSendMessage(exec)}
              activeOpacity={0.7}
            >
              <MessageCircle size={16} color={COLORS.primary} />
              <Text style={styles.messageBtnText}>Send Message</Text>
              <ChevronRight size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Message Modal */}
      {showMessageModal && selectedExec && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setShowMessageModal(false)}
          />
          <View style={styles.messageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message {selectedExec.position}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalRecipient}>
              <User size={16} color={COLORS.textSecondary} />
              <Text style={styles.modalRecipientText}>{selectedExec.name}</Text>
            </View>

            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSendMessageConfirm}
              activeOpacity={0.8}
            >
              <Send size={18} color={COLORS.white} />
              <Text style={styles.sendBtnText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  executiveCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  executiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontFamily: FONT.bold,
    fontSize: 20,
  },
  executiveInfo: {
    flex: 1,
  },
  executiveName: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  executivePosition: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
  },
  contactRow: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryFaded,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  messageBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  messageModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'web' ? SPACING.lg : 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontFamily: FONT.semiBold,
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  modalRecipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  modalRecipientText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  messageInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 120,
    marginBottom: SPACING.md,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.white,
  },
});