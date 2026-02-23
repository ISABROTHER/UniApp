import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ShieldCheck, Lock, BadgeCheck, X, ChevronRight } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { BOOKING_PROTECTION_GUARANTEE } from '@/lib/constants';

const PILLAR_ICONS = {
  'shield-check': ShieldCheck,
  'lock': Lock,
  'badge-check': BadgeCheck,
};

interface Props {
  compact?: boolean;
}

export default function ProtectedBookingBadge({ compact = false }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, compact && styles.badgeCompact]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <ShieldCheck size={compact ? 14 : 16} color={COLORS.success} />
        <Text style={[styles.badgeText, compact && styles.badgeTextCompact]}>
          Protected Booking
        </Text>
        <ChevronRight size={12} color={COLORS.success} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <ShieldCheck size={28} color={COLORS.success} />
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetTitle}>{BOOKING_PROTECTION_GUARANTEE.title}</Text>
            <Text style={styles.sheetSubtitle}>
              StudentNest guarantees every booking on verified hostels.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.pillarList}>
              {BOOKING_PROTECTION_GUARANTEE.pillars.map((pillar, idx) => {
                const Icon = PILLAR_ICONS[pillar.icon as keyof typeof PILLAR_ICONS] ?? ShieldCheck;
                return (
                  <View key={idx} style={styles.pillarRow}>
                    <View style={styles.pillarIconWrap}>
                      <Icon size={20} color={COLORS.success} />
                    </View>
                    <View style={styles.pillarText}>
                      <Text style={styles.pillarTitle}>{pillar.title}</Text>
                      <Text style={styles.pillarDesc}>{pillar.description}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.footerNote}>
              <Text style={styles.footerNoteText}>
                Protected bookings are only available on hostels with verified owners.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeCompact: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.success,
  },
  badgeTextCompact: {
    fontSize: 11,
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sheetIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  pillarList: {
    marginBottom: SPACING.md,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pillarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillarText: {
    flex: 1,
  },
  pillarTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  pillarDesc: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  footerNote: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  footerNoteText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.info,
    textAlign: 'center',
  },
}); 
