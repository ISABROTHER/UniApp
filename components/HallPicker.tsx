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
import { X, Search, Building2 } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { getHallsForUniversity } from '@/lib/universityData';

type HallPickerProps = {
  visible: boolean;
  universityName: string | null;
  selectedHall: string | null;
  onSelect: (hallName: string) => void;
  onClose: () => void;
};

export default function HallPicker({
  visible,
  universityName,
  selectedHall,
  onSelect,
  onClose,
}: HallPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const halls = universityName ? getHallsForUniversity(universityName) : [];

  const filteredHalls = halls.filter((hall) =>
    hall.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayHalls = halls.length === 0 ? ['Not Applicable'] : filteredHalls;

  const handleSelect = (hallName: string) => {
    onSelect(hallName);
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
              <Building2 size={24} color={COLORS.primary} strokeWidth={2} />
              <View>
                <Text style={styles.headerTitle}>Select Traditional Hall</Text>
                {universityName && (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {universityName}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {halls.length > 0 && (
            <>
              <View style={styles.searchContainer}>
                <Search size={18} color={COLORS.textTertiary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search halls..."
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
                  {filteredHalls.length} {filteredHalls.length === 1 ? 'result' : 'results'}
                </Text>
              )}
            </>
          )}

          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {displayHalls.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No halls found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : halls.length === 0 ? (
              <View style={styles.notApplicableContainer}>
                <Building2 size={48} color={COLORS.textTertiary} strokeWidth={1.5} />
                <Text style={styles.notApplicableTitle}>No Official Halls Listed</Text>
                <Text style={styles.notApplicableText}>
                  This institution does not have officially listed traditional halls of residence in our records.
                </Text>
                <TouchableOpacity
                  style={styles.notApplicableButton}
                  onPress={() => handleSelect('Not Applicable')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.notApplicableButtonText}>Select "Not Applicable"</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayHalls.map((hall, index) => {
                const isSelected = selectedHall === hall;
                return (
                  <TouchableOpacity
                    key={`${hall}-${index}`}
                    style={[styles.hallItem, isSelected && styles.hallItemSelected]}
                    onPress={() => handleSelect(hall)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hallName, isSelected && styles.hallNameSelected]}>{hall}</Text>
                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <View style={styles.selectedDot} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
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
    maxHeight: '85%',
    minHeight: 300,
    paddingTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    flex: 1,
    paddingRight: SPACING.md,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  hallItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  hallItemSelected: {
    backgroundColor: '#FFF7ED',
    borderBottomColor: COLORS.primary,
  },
  hallName: {
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  hallNameSelected: {
    color: COLORS.primary,
    fontFamily: FONT.semiBold,
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
  notApplicableContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.xl,
  },
  notApplicableTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  notApplicableText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  notApplicableButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  notApplicableButtonText: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});