import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ArrowLeft, ChevronRight, User, Hash, GraduationCap, Building2, Phone, FileText } from 'lucide-react-native';
import UniversityPicker from '@/components/UniversityPicker';
import HallPicker from '@/components/HallPicker';

export default function EditProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [university, setUniversity] = useState<string | null>(null);
  const [traditionalHall, setTraditionalHall] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [universityPickerVisible, setUniversityPickerVisible] = useState(false);
  const [hallPickerVisible, setHallPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to edit your profile');
        router.back();
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('members')
        .select('full_name, student_id, university, traditional_hall, phone, bio')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Profile fetch error:', fetchError);
      } else if (data) {
        setFullName(data.full_name || '');
        setStudentId(data.student_id || '');
        setUniversity(data.university || null);
        setTraditionalHall(data.traditional_hall || null);
        setPhone(data.phone || '');
        setBio(data.bio || '');
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUniversitySelect = (universityName: string) => {
    setUniversity(universityName);
    setTraditionalHall(null);
    setError(null);
  };

  const handleHallSelect = (hallName: string) => {
    setTraditionalHall(hallName);
  };

  const validateForm = (): boolean => {
    setError(null);

    if (!university) {
      setError('Please select your university or institution');
      return false;
    }

    if (fullName.trim().length === 0) {
      Alert.alert(
        'Missing Information',
        'Your profile will be more complete with your full name. Continue without it?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => saveProfile() },
        ]
      );
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to save your profile');
        return;
      }

      const updates = {
        full_name: fullName.trim() || null,
        student_id: studentId.trim() || null,
        university: university,
        traditional_hall: traditionalHall || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('members')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Your profile has been updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      saveProfile();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>
              Full Name <Text style={styles.optional}>(Recommended)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <User size={20} color={COLORS.textTertiary} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Mensah"
                placeholderTextColor={COLORS.textTertiary}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Student ID</Text>
            <View style={styles.inputContainer}>
              <Hash size={20} color={COLORS.textTertiary} />
              <TextInput
                value={studentId}
                onChangeText={setStudentId}
                placeholder="10123456"
                placeholderTextColor={COLORS.textTertiary}
                style={styles.input}
                keyboardType="default"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              University or Institution <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setUniversityPickerVisible(true)}
              activeOpacity={0.7}
            >
              <GraduationCap size={20} color={university ? COLORS.primary : COLORS.textTertiary} />
              <Text style={[styles.pickerButtonText, university && styles.pickerButtonTextSelected]}>
                {university || 'Select your university'}
              </Text>
              <ChevronRight size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Required • Select from approved list of Ghanaian institutions
            </Text>
          </View>

          {university && (
            <View style={styles.field}>
              <Text style={styles.label}>Traditional Hall</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setHallPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Building2 size={20} color={traditionalHall ? COLORS.primary : COLORS.textTertiary} />
                <Text style={[styles.pickerButtonText, traditionalHall && styles.pickerButtonTextSelected]}>
                  {traditionalHall || 'Select your hall (optional)'}
                </Text>
                <ChevronRight size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Optional • Select your hall of residence if applicable
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color={COLORS.textTertiary} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="0244123456"
                placeholderTextColor={COLORS.textTertiary}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <FileText size={20} color={COLORS.textTertiary} style={styles.textAreaIcon} />
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={COLORS.textTertiary}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Profile Information</Text>
            <Text style={styles.infoText}>
              • University selection is required{'\n'}
              • Traditional hall is optional{'\n'}
              • Changing university will reset your hall selection{'\n'}
              • All information can be updated anytime
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <UniversityPicker
        visible={universityPickerVisible}
        selectedUniversity={university}
        onSelect={handleUniversitySelect}
        onClose={() => setUniversityPickerVisible(false)}
      />

      <HallPicker
        visible={hallPickerVisible}
        universityName={university}
        selectedHall={traditionalHall}
        onSelect={handleHallSelect}
        onClose={() => setHallPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md + 2,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: '#DC2626',
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.error,
  },
  optional: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm + 2 : SPACING.sm,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 0,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm + 2,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    gap: SPACING.sm,
  },
  pickerButtonText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textTertiary,
  },
  pickerButtonTextSelected: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
  },
  helperText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: SPACING.xl * 2,
  },
});