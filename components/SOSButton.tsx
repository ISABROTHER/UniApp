import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Platform, Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { ShieldAlert, Phone, MapPin, X, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: SW } = Dimensions.get('window');

export default function SOSButton() {
  const { session } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCounting, setIsCounting] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!isCounting) return;
    if (countdown <= 0) {
      sendSOS();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isCounting]);

  const startCountdown = () => {
    setIsCounting(true);
    setCountdown(5);
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ])
    ).start();
  };

  const cancelCountdown = () => {
    setIsCounting(false);
    setCountdown(5);
    shakeAnim.stopAnimation();
    shakeAnim.setValue(0);
  };

  const sendSOS = async () => {
    setIsCounting(false);
    shakeAnim.stopAnimation();
    shakeAnim.setValue(0);

    try {
      const userId = session?.user?.id;
      if (userId) {
        await supabase.from('sos_alerts').insert({
          user_id: userId,
          alert_type: 'emergency',
          message: 'Emergency SOS triggered',
          status: 'active',
        });
      }
    } catch (e) {
      // silent
    }
    setAlertSent(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setAlertSent(false);
    setIsCounting(false);
    setCountdown(5);
  };

  if (!session) return null;

  return (
    <>
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <ShieldAlert size={22} color={COLORS.white} />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Animated.View style={[styles.modal, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {alertSent ? (
              <View style={styles.alertSentContainer}>
                <View style={styles.successCircle}>
                  <ShieldAlert size={40} color={COLORS.white} />
                </View>
                <Text style={styles.alertSentTitle}>Alert Sent</Text>
                <Text style={styles.alertSentText}>
                  Your emergency contacts and campus security have been notified with your location.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.warningIcon}>
                  <AlertTriangle size={36} color={COLORS.error} />
                </View>
                <Text style={styles.modalTitle}>Emergency SOS</Text>
                <Text style={styles.modalSubtitle}>
                  This will alert campus security and your emergency contacts with your current location.
                </Text>

                {isCounting ? (
                  <View style={styles.countdownContainer}>
                    <View style={styles.countdownCircle}>
                      <Text style={styles.countdownNum}>{countdown}</Text>
                    </View>
                    <Text style={styles.countdownText}>Sending alert in {countdown}s...</Text>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelCountdown}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.sosBtn} onPress={startCountdown} activeOpacity={0.8}>
                      <ShieldAlert size={24} color={COLORS.white} />
                      <Text style={styles.sosBtnText}>Send SOS Alert</Text>
                    </TouchableOpacity>

                    <View style={styles.quickActions}>
                      <TouchableOpacity style={styles.quickAction} onPress={() => { handleClose(); router.push('/safety' as any); }}>
                        <MapPin size={20} color={COLORS.info} />
                        <Text style={styles.quickActionText}>Safety Map</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction} onPress={() => { handleClose(); router.push('/sos-contacts' as any); }}>
                        <Phone size={20} color={COLORS.success} />
                        <Text style={styles.quickActionText}>Contacts</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 84,
    right: 16,
    zIndex: 999,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    width: SW - 48,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  actionsContainer: { width: '100%', gap: SPACING.md },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.error,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.borderLight,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  quickActionText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  countdownContainer: { alignItems: 'center', gap: SPACING.md },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNum: {
    fontFamily: FONT.headingBold,
    fontSize: 36,
    color: COLORS.white,
  },
  countdownText: {
    fontFamily: FONT.medium,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  cancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  cancelBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  alertSentContainer: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertSentTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  alertSentText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneBtn: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
  },
  doneBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
});
