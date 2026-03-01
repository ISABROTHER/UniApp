import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Search, GraduationCap } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { getGroupedUniversities, University } from '@/lib/universityData';

type UniversityPickerProps = {
  visible: boolean;
  selectedUniversity: string | null;
  onSelect: (universityName: string) => void;
  onClose: () => void;
};

export default function UniversityPicker({
  visible,
  selectedUniversity,
  onSelect,
  onClose,
}: UniversityPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const groupedUniversities = getGroupedUniversities();

  const filteredGroups = Object.entries(groupedUniversities).reduce(
    (acc, [groupName, universities]) => {
      const filtered = universities.filter((uni) =>
        uni.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[groupName] = filtered;
      }
      return acc;
    },
    {} as Record<string, University[]>
  );

  const handleSelect = (universityName: string) => {
    onSelect(universityName);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <GraduationCap size={24} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.headerTitle}>Select University</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color={COLORS.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search universities..."
              placeholderTextColor={COLORS.textTertiary}
              style={styles.searchInput}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.length > 0 && (
            <Text style={styles.resultsCount}>
              {Object.values(filteredGroups).reduce((sum, unis) => sum + unis.length, 0)} results
            </Text>
          )}

          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {Object.keys(filteredGroups).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No universities found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              Object.entries(filteredGroups).map(([groupName, universities]) => (
                <View key={groupName} style={styles.group}>
                  <Text style={styles.groupTitle}>{groupName}</Text>
                  {universities.map((university) => {
                    const isSelected = selectedUniversity === university.name;
                    return (
                      <TouchableOpacity
                        key={university.id}
                        style={[styles.universityItem, isSelected && styles.universityItemSelected]}
                        onPress={() => handleSelect(university.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.universityInfo}>
                          <Text style={[styles.universityName, isSelected && styles.universityNameSelected]}>
                            {university.name}
                          </Text>
                          <Text style={styles.hallsCount}>
                            {university.halls.length} {university.halls.length === 1 ? 'hall' : 'halls'}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <View style={styles.selectedDot} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }),
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    minHeight: 400,
    paddingTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 0,
  },
  resultsCount: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  listContainer: {
    flex: 1,
  },
  group: {
    marginBottom: SPACING.lg,
  },
  groupTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    backgroundColor: '#F9FAFB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  universityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  universityItemSelected: {
    backgroundColor: '#FFF7ED',
    borderBottomColor: COLORS.primary,
  },
  universityInfo: {
    flex: 1,
    gap: 4,
  },
  universityName: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  universityNameSelected: {
    color: COLORS.primary,
  },
  hallsCount: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});