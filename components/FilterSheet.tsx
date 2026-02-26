import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Animated, Dimensions,
} from 'react-native';
import { COLORS, FONT, SPACING, ROOM_TYPES } from '@/lib/constants';
import { X, RotateCcw } from 'lucide-react-native';

const { height: SH } = Dimensions.get('window');

export type SortOption = 'best_match' | 'lowest_price' | 'most_beds' | 'closest' | 'verified_first';

export interface Filters {
  priceMin: number;
  priceMax: number;
  roomTypes: string[];
  amenities: string[];
  verifiedOnly: boolean;
  showSoldOut: boolean;
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: Filters = {
  priceMin: 0,
  priceMax: 2000,
  roomTypes: [],
  amenities: [],
  verifiedOnly: false,
  showSoldOut: false,
  sortBy: 'best_match',
};

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (filters: Filters) => void;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'best_match', label: 'Best match' },
  { key: 'verified_first', label: 'Verified first' },
  { key: 'lowest_price', label: 'Lowest price' },
  { key: 'most_beds', label: 'Most rooms available' },
  { key: 'closest', label: 'Closest to campus' },
];

const ESSENTIAL_AMENITIES = ['WiFi', 'Security', 'Water (24hr)', 'Electricity (24hr)', 'Generator Backup', 'Air Conditioning'];

export default function FilterSheet({ visible, onClose, filters, onApply }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const slideAnim = useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters & Sort</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.chipGrid}>
                {SORT_OPTIONS.map((option) => {
                  const isSelected = localFilters.sortBy === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setLocalFilters(prev => ({ ...prev, sortBy: option.key }))}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range (GH₵/month)</Text>
              <View style={styles.priceRangeRow}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceInputLabel}>Min</Text>
                  <Text style={styles.priceInputValue}>{localFilters.priceMin}</Text>
                </View>
                <Text style={styles.priceSeparator}>-</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.priceInputLabel}>Max</Text>
                  <Text style={styles.priceInputValue}>{localFilters.priceMax}</Text>
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Room Type</Text>
              <View style={styles.chipGrid}>
                {ROOM_TYPES.filter(t => t !== 'All').map((type) => {
                  const isSelected = localFilters.roomTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          roomTypes: isSelected
                            ? prev.roomTypes.filter(t => t !== type)
                            : [...prev.roomTypes, type]
                        }));
                      }}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Essential Amenities</Text>
              <View style={styles.chipGrid}>
                {ESSENTIAL_AMENITIES.map((amenity) => {
                  const isSelected = localFilters.amenities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          amenities: isSelected
                            ? prev.amenities.filter(a => a !== amenity)
                            : [...prev.amenities, amenity]
                        }));
                      }}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {amenity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.filterSectionTitle}>Verified only</Text>
                <TouchableOpacity
                  style={[styles.toggle, localFilters.verifiedOnly && styles.toggleActive]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                >
                  <View style={[styles.toggleDot, localFilters.verifiedOnly && styles.toggleDotActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.filterSectionTitle}>Show fully booked</Text>
                <TouchableOpacity
                  style={[styles.toggle, localFilters.showSoldOut && styles.toggleActive]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, showSoldOut: !prev.showSoldOut }))}
                >
                  <View style={[styles.toggleDot, localFilters.showSoldOut && styles.toggleDotActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <RotateCcw size={18} color={COLORS.textSecondary} />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SH * 0.85,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sheetTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  filterSection: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterSectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  priceInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  priceInputLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  priceInputValue: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  priceSeparator: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  applyBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
});
