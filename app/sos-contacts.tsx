import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Phone, Edit2, Trash2, Star } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

interface EmergencyNumber {
  name: string;
  phone: string;
}

const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { name: 'Campus Security', phone: '0332133720' },
  { name: 'Ghana Police', phone: '191' },
  { name: 'Ambulance', phone: '193' },
  { name: 'Fire Service', phone: '192' },
];

const MAX_CONTACTS = 5;

export default function SOSContactsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    is_primary: false,
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sos_contacts')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.relationship.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (contacts.length >= MAX_CONTACTS && !editingContact) {
      Alert.alert('Error', `Maximum ${MAX_CONTACTS} contacts allowed`);
      return;
    }

    try {
      if (formData.is_primary) {
        await supabase
          .from('sos_contacts')
          .update({ is_primary: false })
          .eq('user_id', user?.id);
      }

      if (editingContact) {
        const { error } = await supabase
          .from('sos_contacts')
          .update({
            name: formData.name,
            phone: formData.phone,
            relationship: formData.relationship,
            is_primary: formData.is_primary,
          })
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sos_contacts')
          .insert({
            user_id: user?.id,
            name: formData.name,
            phone: formData.phone,
            relationship: formData.relationship,
            is_primary: formData.is_primary,
          });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingContact(null);
      setFormData({ name: '', phone: '', relationship: '', is_primary: false });
      fetchContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary,
    });
    setShowForm(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sos_contacts')
                .delete()
                .eq('id', contact.id);

              if (error) throw error;
              fetchContacts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData({ name: '', phone: '', relationship: '', is_primary: false });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Numbers</Text>
          {EMERGENCY_NUMBERS.map((emergency, index) => (
            <View key={index} style={styles.emergencyCard}>
              <View style={styles.emergencyInfo}>
                <Text style={styles.emergencyName}>{emergency.name}</Text>
                <Text style={styles.emergencyPhone}>{emergency.phone}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCall(emergency.phone)}
                style={styles.callButton}
              >
                <Phone size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Personal Contacts ({contacts.length}/{MAX_CONTACTS})
            </Text>
            {!showForm && contacts.length < MAX_CONTACTS && (
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                style={styles.addButton}
              >
                <Plus size={20} color={COLORS.white} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Mother, Friend)"
                placeholderTextColor={COLORS.textTertiary}
                value={formData.relationship}
                onChangeText={(text) => setFormData({ ...formData, relationship: text })}
              />
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, is_primary: !formData.is_primary })}
                style={styles.primaryToggle}
              >
                <View style={[styles.checkbox, formData.is_primary && styles.checkboxActive]}>
                  {formData.is_primary && <Star size={16} color={COLORS.white} fill={COLORS.white} />}
                </View>
                <Text style={styles.primaryLabel}>Set as primary contact</Text>
              </TouchableOpacity>
              <View style={styles.formActions}>
                <TouchableOpacity onPress={handleCancelForm} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveContact} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No personal contacts added yet</Text>
              <Text style={styles.emptySubtext}>
                Add emergency contacts who can be reached quickly
              </Text>
            </View>
          ) : (
            contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <View style={styles.contactHeader}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    onPress={() => handleCall(contact.phone)}
                    style={styles.actionButton}
                  >
                    <Phone size={18} color={COLORS.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEditContact(contact)}
                    style={styles.actionButton}
                  >
                    <Edit2 size={18} color={COLORS.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteContact(contact)}
                    style={styles.actionButton}
                  >
                    <Trash2 size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.headingBold,
    color: COLORS.white,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emergencyPhone: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  callButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.full,
  },
  formCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.xs,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  primaryLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  formActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  contactName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.xs,
    gap: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: FONT.semiBold,
    color: COLORS.warning,
  },
  contactPhone: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  contactRelationship: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
