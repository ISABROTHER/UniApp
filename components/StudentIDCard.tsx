import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '@/lib/constants';
import { Member } from '@/lib/types';
import QRCode from '@/components/QRCode';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - SPACING.md * 2, 380);
const CARD_H = CARD_W * 0.618;

interface Props {
  member: Member | null;
  digitalID: {
    id: string;
    issued_at: string;
    expires_at: string;
    qr_code_data: string;
  } | null;
  isFlipped: boolean;
}

const BARCODE_PATTERN = [3,1,2,1,3,1,1,2,3,1,2,1,2,3,1,1,3,2,1,1,2,1,3,1,2,1,1,3,2,1,2,1,3,1,1,2,1,2,3,1];

function LiveClock() {
  const [t, setT] = React.useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <Text style={styles.clockText}>
      {t.getHours().toString().padStart(2, '0')}
      <Text style={styles.clockColon}>:</Text>
      {t.getMinutes().toString().padStart(2, '0')}
      <Text style={styles.clockColon}>:</Text>
      {t.getSeconds().toString().padStart(2, '0')}
    </Text>
  );
}

function HolographicOverlay() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-CARD_W * 1.2, CARD_W * 0.3, -CARD_W * 1.2],
  });

  return (
    <Animated.View
      style={[styles.holoOverlay, { transform: [{ translateX }, { rotate: '25deg' }] }]}
      pointerEvents="none"
    />
  );
}

function SecurityMicrotext({ text }: { text: string }) {
  const repeated = (text + ' ').repeat(40);
  return (
    <View style={styles.microtextWrap} pointerEvents="none">
      <Text style={styles.microtext} numberOfLines={1}>{repeated}</Text>
    </View>
  );
}

function ChipSVG() {
  return (
    <Svg width={36} height={28} viewBox="0 0 36 28">
      <Rect x={0} y={0} width={36} height={28} rx={3} fill="#C9A94E" />
      <Rect x={1} y={1} width={34} height={26} rx={2.5} fill="#D4B65A" />
      <Rect x={4} y={4} width={28} height={20} rx={1} fill="#C9A94E" stroke="#B89A3E" strokeWidth={0.5} />
      <Path d="M4 14h28M18 4v20M10 4v20M26 4v20" stroke="#B89A3E" strokeWidth={0.3} />
      <Path d="M4 9h28M4 19h28" stroke="#B89A3E" strokeWidth={0.3} />
    </Svg>
  );
}

function ContactlessIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 16.5a5.5 5.5 0 000-9" stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 19a8 8 0 000-14" stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M15.5 21.5a10.5 10.5 0 000-19" stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export default function StudentIDCard({ member, digitalID, isFlipped }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const qrValue = useMemo(() => {
    if (digitalID?.qr_code_data) return digitalID.qr_code_data;
    return JSON.stringify({ id: member?.id, name: member?.full_name, ts: Date.now() });
  }, [digitalID, member]);

  if (!isFlipped) {
    return (
      <View style={styles.card}>
        <View style={styles.frontGradientBg}>
          <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.4" stopColor="#F8FAFC" />
                <Stop offset="1" stopColor="#F1F5F9" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={CARD_W} height={CARD_H} rx={14} fill="url(#cardBg)" />
            <Circle cx={CARD_W * 0.85} cy={CARD_H * 0.15} r={CARD_H * 0.6} fill="rgba(0,0,0,0.015)" />
            <Circle cx={CARD_W * 0.9} cy={CARD_H * 0.2} r={CARD_H * 0.4} fill="rgba(0,0,0,0.01)" />
          </Svg>

          <HolographicOverlay />
          <SecurityMicrotext text="STUDENT IDENTITY CARD OFFICIAL DOCUMENT VERIFIED" />

          <View style={styles.frontContent}>
            <View style={styles.frontTopRow}>
              <View style={styles.frontHeaderLeft}>
                <View style={styles.uniShield}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#006B3F" opacity={0.9} />
                    <Path d="M12 6l-4 2.5v3c0 2.78 1.92 5.37 4 6 2.08-.63 4-3.22 4-6v-3L12 6z" fill="#FFFFFF" />
                  </Svg>
                </View>
                <View style={styles.frontHeaderTexts}>
                  <Text style={styles.frontUniName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                    {(member?.university || 'UNIVERSITY').toUpperCase()}
                  </Text>
                  <Text style={styles.frontCardLabel}>STUDENT IDENTIFICATION</Text>
                </View>
              </View>
              <View style={styles.liveIndicator}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Text style={styles.liveLabel}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.goldLine} />

            <View style={styles.frontMiddle}>
              <View style={styles.photoSection}>
                <View style={styles.photoBorder}>
                  <Image
                    source={{ uri: member?.avatar_url || 'https://i.imgur.com/h286QnR.jpeg' }}
                    style={styles.photo}
                  />
                </View>
                <View style={styles.chipArea}>
                  <ChipSVG />
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {member?.full_name?.toUpperCase() || 'STUDENT NAME'}
                </Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoField}>
                    <Text style={styles.fieldLabel}>STUDENT ID</Text>
                    <Text style={styles.fieldValue}>{member?.student_id || '---'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoFieldFull}>
                    <Text style={styles.fieldLabel}>PROGRAMME</Text>
                    <Text style={styles.fieldValueSm} numberOfLines={1}>
                      {member?.traditional_hall || 'Undergraduate Programme'}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoField}>
                    <Text style={styles.fieldLabel}>LEVEL</Text>
                    <Text style={styles.fieldValueSm}>{member?.level || '100'}</Text>
                  </View>
                  <View style={styles.infoField}>
                    <Text style={styles.fieldLabel}>GENDER</Text>
                    <Text style={styles.fieldValueSm}>{(member?.gender || 'N/A').toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.frontBottom}>
              <View style={styles.barcodeSection}>
                <View style={styles.barcodeStrip}>
                  {BARCODE_PATTERN.map((w, i) => (
                    <View key={i} style={[styles.barLine, { width: w }]} />
                  ))}
                </View>
                <Text style={styles.barcodeNumber}>{member?.student_id || ''}</Text>
              </View>
              <View style={styles.bottomRight}>
                <ContactlessIcon />
                <LiveClock />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.backBg}>
        <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="backBg" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor="#F8FAFC" />
              <Stop offset="1" stopColor="#FFFFFF" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={CARD_W} height={CARD_H} rx={14} fill="url(#backBg)" />
        </Svg>

        <View style={styles.magStripe} />

        <View style={styles.backContent}>
          <View style={styles.backTop}>
            <View style={styles.qrSection}>
              <View style={styles.qrContainer}>
                <QRCode value={qrValue} size={80} color="#0A1628" bg="#FFFFFF" />
              </View>
              <Text style={styles.qrLabel}>SCAN TO VERIFY</Text>
            </View>

            <View style={styles.backInfoSection}>
              {digitalID && (
                <>
                  <View style={styles.backInfoRow}>
                    <Text style={styles.backInfoLabel}>DATE OF ISSUE</Text>
                    <Text style={styles.backInfoValue}>{fmtDate(digitalID.issued_at)}</Text>
                  </View>
                  <View style={styles.backInfoRow}>
                    <Text style={styles.backInfoLabel}>EXPIRY DATE</Text>
                    <Text style={styles.backInfoValue}>{fmtDate(digitalID.expires_at)}</Text>
                  </View>
                  <View style={styles.backInfoRow}>
                    <Text style={styles.backInfoLabel}>CAMPUS</Text>
                    <Text style={styles.backInfoValue}>MAIN CAMPUS</Text>
                  </View>
                  <View style={styles.backInfoRow}>
                    <Text style={styles.backInfoLabel}>CARD ID</Text>
                    <Text style={styles.backInfoMono}>{digitalID.id.substring(0, 8).toUpperCase()}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.sigLabel}>AUTHORIZED SIGNATURE</Text>
            <Text style={styles.sigName} numberOfLines={1} adjustsFontSizeToFit>
              {member?.full_name}
            </Text>
          </View>

          <View style={styles.backFooter}>
            <Text style={styles.disclaimer}>
              This card is the property of {member?.university || 'the institution'}. If found, return to the Office of Student Affairs.
            </Text>
            {digitalID && (
              <Text style={styles.verCode}>VER: {digitalID.id.substring(0, 12).toUpperCase()}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  frontGradientBg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  holoOverlay: {
    position: 'absolute',
    top: -30,
    width: 60,
    height: CARD_H + 60,
    backgroundColor: 'rgba(255,255,255,0.4)',
    zIndex: 5,
  },
  microtextWrap: {
    position: 'absolute',
    bottom: CARD_H * 0.38,
    left: 0,
    right: 0,
    zIndex: 2,
    overflow: 'hidden',
    opacity: 0.1,
  },
  microtext: {
    fontSize: 4,
    fontFamily: 'Courier',
    color: '#0F172A',
    letterSpacing: 1,
  },
  frontContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  frontTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frontHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uniShield: {
    marginRight: 8,
  },
  frontHeaderTexts: {
    flex: 1,
  },
  frontUniName: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  frontCardLabel: {
    fontSize: 5.5,
    fontFamily: FONT.semiBold,
    color: '#006B3F',
    letterSpacing: 2,
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 107, 63, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 107, 63, 0.2)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#006B3F',
    marginRight: 4,
  },
  liveLabel: {
    fontSize: 6,
    fontFamily: FONT.bold,
    color: '#006B3F',
    letterSpacing: 0.8,
  },
  goldLine: {
    height: 0.5,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
    marginVertical: 6,
  },
  frontMiddle: {
    flexDirection: 'row',
    flex: 1,
  },
  photoSection: {
    marginRight: 12,
  },
  photoBorder: {
    width: CARD_H * 0.42,
    height: CARD_H * 0.42 * 1.25,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chipArea: {
    marginTop: 6,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 6,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
    gap: 12,
  },
  infoField: {
    flex: 1,
  },
  infoFieldFull: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 5.5,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  fieldValueSm: {
    fontSize: 9,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  frontBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barcodeSection: {},
  barcodeStrip: {
    flexDirection: 'row',
    height: 18,
    alignItems: 'flex-end',
    overflow: 'hidden',
    opacity: 0.8,
  },
  barLine: {
    height: '100%',
    backgroundColor: '#0F172A',
    marginRight: 1,
  },
  barcodeNumber: {
    fontSize: 6,
    fontFamily: 'Courier',
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 2,
    marginTop: 2,
  },
  bottomRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  clockText: {
    fontSize: 8,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  clockColon: {
    color: '#94A3B8',
  },

  backBg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  magStripe: {
    width: '100%',
    height: 30,
    backgroundColor: '#0F172A',
    marginTop: 12,
  },
  backContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  backTop: {
    flexDirection: 'row',
  },
  qrSection: {
    alignItems: 'center',
    marginRight: 14,
  },
  qrContainer: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrLabel: {
    fontSize: 6,
    fontFamily: FONT.bold,
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 4,
  },
  backInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  backInfoRow: {
    marginBottom: 6,
  },
  backInfoLabel: {
    fontSize: 5.5,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 1,
  },
  backInfoValue: {
    fontSize: 9,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  backInfoMono: {
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  signatureBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginVertical: 4,
  },
  sigLabel: {
    fontSize: 5,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 2,
  },
  sigName: {
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
    fontSize: 14,
    color: '#0F172A',
    fontStyle: 'italic',
  },
  backFooter: {
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 4,
  },
  disclaimer: {
    fontSize: 5,
    fontFamily: FONT.regular,
    color: '#475569',
    lineHeight: 7.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  verCode: {
    fontSize: 5.5,
    fontFamily: 'Courier',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});