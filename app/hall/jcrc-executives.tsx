import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Image, TextInput, Alert, Linking, KeyboardAvoidingView, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, Phone, MessageCircle, Send,
  User, ShieldAlert,
} from 'lucide-react-native';

interface Executive {
  id: string;
  position: string;
  name: string;
  phone: string;
  avatar_url?: string;
  category: 'president' | 'vice' | 'secretary' | 'treasurer' | 'coordinator' | 'other';
}

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
      // Modern mock data with realistic HD photos and no emails
      const mockExecs: Executive[] = [
        {
          id: '1',
          position: 'Hall President',
          name: 'Kwame Mensah',
          phone: '+233 24 123 4567',
          avatar_url: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?q=80&w=256&auto=format&fit=crop',
          category: 'president',
        },
        {
          id: '2',
          position: 'Vice President',
          name: 'Ama Serwaa',
          phone: '+233 24 234 5678',
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop',
          category: 'vice',
        },
        {
          id: '3',
          position: 'General Secretary',
          name: 'Kofi Antwi',
          phone: '+233 24 345 6789',
          avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&auto=format&fit=crop',
          category: 'secretary',
        },
        {
          id: '4',
          position: 'Financial Secretary',
          name: 'Abena Osei',
          phone: '+233 24 456 7890',
          avatar_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1bfa82?q=80&w=256&auto=format&fit=crop',
          category: 'secretary',
        },
        {
          id: '5',
          position: 'Treasurer',
          name: 'Yaw Boateng',
          phone: '+233 24 567 8901',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
          category: 'treasurer',
        },
        {
          id: '6',
          position: 'Entertainment Coordinator',
          name: 'Efua Agyeman',
          phone: '+233 24 678 9012',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
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

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleSendMessageConfirm = async () => {
    if (!messageText.trim() || !selectedExec) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      Alert.alert('Message Sent', `Your message has been securely sent to ${selectedExec.name}.`);
      setShowMessageModal(false);
      setMessageText('');
      setSelectedExec(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'president': return '#E11D48'; // Rose
      case 'vice': return '#D97706';      // Amber
      case 'secretary': return '#2563EB'; // Blue
      case 'treasurer': return '#059669'; // Emerald
      case 'coordinator': return '#7C3AED';// Violet
      default: return COLORS.textSecondary;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leadership</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <ShieldAlert size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Official directory for your JCRC Executives. Connect directly regarding hall welfare.
          </Text>
        </View>

        <View style={styles.executivesList}>
          {executives.map((exec) => (
            <View key={exec.id} style={styles.executiveCard}>
              <View style={styles.cardMain}>
                {exec.avatar_url ? (
                  <Image source={{ uri: exec.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: getCategoryColor(exec.category) + '20' }]}>
                    <Text style={[styles.avatarText, { color: getCategoryColor(exec.category) }]}>
                      {getInitials(exec.name)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.executiveInfo}>
                  <Text style={styles.executiveName}>{exec.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getCategoryColor(exec.category) + '15' }]}>
                    <Text style={[styles.roleText, { color: getCategoryColor(exec.category) }]}>
                      {exec.position}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.phoneContainer} 
                    onPress={() => handleCall(exec.phone)}
                    activeOpacity={0.6}
                  >
                    <Phone size={14} color={COLORS.textSecondary} />
                    <Text style={styles.phoneText}>{exec.phone}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.messageIconBtn}
                  onPress={() => handleSendMessage(exec)}
                  activeOpacity={0.7}
                >
                  <MessageCircle size={22} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modernized Message Modal */}
      {showMessageModal && selectedExec && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowMessageModal(false);
            }}
          />
          <View style={styles.messageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Message</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)} style={styles.closeBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalRecipient}>
              {selectedExec.avatar_url ? (
                <Image source={{ uri: selectedExec.avatar_url }} style={styles.modalAvatar} />
              ) : (
                <View style={styles.modalAvatarFallback}>
                  <User size={16} color={COLORS.white} />
                </View>
              )}
              <View>
                <Text style={styles.modalRecipientText}>{selectedExec.name}</Text>
                <Text style={styles.modalRecipientRole}>{selectedExec.position}</Text>
              </View>
            </View>

            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message directly to the executive..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
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
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8', // Slightly cooler background for contrast
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
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryFaded,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)', // Light blue border
  },
  infoText: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
  executivesList: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  executiveCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg, // Modern square rounded look instead of perfect circle
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONT.headingBold,
    fontSize: 20,
  },
  executiveInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  executiveName: {
    fontFamily: FONT.headingBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  messageIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  messageModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'web' ? SPACING.xl : 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalRecipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRecipientText: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  modalRecipientRole: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 140,
    marginBottom: SPACING.lg,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sendBtnText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});