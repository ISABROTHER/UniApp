import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Home,
  GraduationCap,
  Church,
  Users,
  Heart,
  Briefcase,
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type OrgType = 'student_gov' | 'hall' | 'dept' | 'church' | 'club' | 'religious' | 'service';

interface TypeOption {
  value: OrgType;
  label: string;
  icon: typeof Building2;
  color: string;
}

const ORG_TYPES: TypeOption[] = [
  { value: 'student_gov', label: 'Student Government', icon: Building2, color: '#ef4444' },
  { value: 'hall', label: 'Hall Committee', icon: Home, color: '#3b82f6' },
  { value: 'dept', label: 'Department Association', icon: GraduationCap, color: '#22c55e' },
  { value: 'church', label: 'Church/Ministry', icon: Church, color: '#f59e0b' },
  { value: 'club', label: 'Club/Society', icon: Users, color: '#14b8a6' },
  { value: 'religious', label: 'Non-Student Religious', icon: Heart, color: '#1e3a8a' },
  { value: 'service', label: 'Service Provider', icon: Briefcase, color: '#6b7280' },
];

export default function OrganizationCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [affiliatedHall, setAffiliatedHall] = useState('');
  const [affiliatedDept, setAffiliatedDept] = useState('');
  const [membershipOpen, setMembershipOpen] = useState(true);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!orgType) {
      newErrors.orgType = 'Please select an organization type';
    }

    if (!name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an organization');
      return;
    }

    setLoading(true);

    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          type: orgType,
          description: description.trim() || null,
          category: category.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          affiliated_hall: orgType === 'hall' ? affiliatedHall.trim() || null : null,
          affiliated_department: orgType === 'dept' ? affiliatedDept.trim() || null : null,
          membership_open: membershipOpen,
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      const { error: membershipError } = await supabase
        .from('org_memberships')
        .insert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
        });

      if (membershipError) {
        throw membershipError;
      }

      router.push(`/organization-profile?id=${orgData.id}`);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      Alert.alert('Error', error.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          disabled={loading}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Organization</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Organization Type *</Text>
          <View style={styles.typeGrid}>
            {ORG_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = orgType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    isSelected && {
                      borderColor: COLORS.primary,
                      backgroundColor: `${COLORS.primary}15`,
                    },
                  ]}
                  onPress={() => setOrgType(type.value)}
                  disabled={loading}
                >
                  <Icon size={32} color={isSelected ? COLORS.primary : type.color} />
                  <Text style={[styles.typeLabel, isSelected && { color: COLORS.primary }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.orgType && <Text style={styles.errorText}>{errors.orgType}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Organization Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors({ ...errors, name: '' });
              }
            }}
            placeholder="Enter organization name"
            placeholderTextColor={COLORS.textSecondary}
            editable={!loading}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your organization"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., Campus Ministry, Academic Association"
            placeholderTextColor={COLORS.textSecondary}
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Contact Email</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="contact@organization.com"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="+1 234 567 8900"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        {orgType === 'hall' && (
          <View style={styles.section}>
            <Text style={styles.label}>Affiliated Hall</Text>
            <TextInput
              style={styles.input}
              value={affiliatedHall}
              onChangeText={setAffiliatedHall}
              placeholder="Enter hall name"
              placeholderTextColor={COLORS.textSecondary}
              editable={!loading}
            />
          </View>
        )}

        {orgType === 'dept' && (
          <View style={styles.section}>
            <Text style={styles.label}>Affiliated Department</Text>
            <TextInput
              style={styles.input}
              value={affiliatedDept}
              onChangeText={setAffiliatedDept}
              placeholder="Enter department name"
              placeholderTextColor={COLORS.textSecondary}
              editable={!loading}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Membership</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.toggleButtonLeft,
                membershipOpen && styles.toggleButtonActive,
              ]}
              onPress={() => setMembershipOpen(true)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  membershipOpen && styles.toggleButtonTextActive,
                ]}
              >
                Open
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.toggleButtonRight,
                !membershipOpen && styles.toggleButtonActive,
              ]}
              onPress={() => setMembershipOpen(false)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  !membershipOpen && styles.toggleButtonTextActive,
                ]}
              >
                Closed
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            {membershipOpen
              ? 'Anyone can join this organization'
              : 'Membership requires approval'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.createButtonText}>Create Organization</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'web' ? 20 : 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  typeCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.sm,
  },
  errorText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: '#ef4444',
    marginTop: SPACING.xs,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  toggleButtonLeft: {
    borderRightWidth: 0.5,
    borderRightColor: COLORS.border,
  },
  toggleButtonRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.border,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  helperText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    minHeight: 48,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.white,
  },
});
