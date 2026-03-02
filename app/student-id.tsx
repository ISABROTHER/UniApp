import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Easing,
  TextInput,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Shield, 
  Fingerprint, 
  Ticket, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  RotateCw,
  Plus,
  X,
  Smartphone,
  KeyRound,
  ShieldCheck
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import StudentIDCard from '@/components/StudentIDCard';
import EventTicket, { TicketData } from '@/components/EventTicket';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - SPACING.md * 2, 380);
const CARD_H = CARD_W * 0.618;

interface DigitalStudentID {
  id: string;
  user_id: string;
  university: string;
  student_number: string;
  qr_code_data: string;
  issued_at: string;
  expires_at: string;
  is_active: boolean;
}

// Extending TicketData locally to support the 'isNew' UI flag
interface LocalTicketData extends TicketData {
  isNew?: boolean;
}

const INITIAL_MOCK_TICKETS: LocalTicketData[] = [
  {
    id: 'tkt-001',
    event_name: 'Hall Week Cultural Night',
    event_date: '2026-03-15T19:00:00',
    venue: 'Oguaa Hall Forecourt',
    category: 'Hall Week',
    is_free: true,
    price: null,
    status: 'valid',
    attendee_name: '',
    ticket_number: 'HW-2026-0847',
  },
  {
    id: 'tkt-002',
    event_name: 'Tech Career Fair 2026',
    event_date: '2026-03-22T09:00:00',
    venue: 'Sam Jonah Library Auditorium',
    category: 'Career',
    is_free: true,
    price: null,
    status: 'valid',
    attendee_name: '',
    ticket_number: 'CF-2026-1293',
  },
];

export default function StudentIDScreen() {
  const router = useRouter();
  const { member } = useAuth();
  
  // Digital ID State
  const [digitalID, setDigitalID] = useState<DigitalStudentID | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<'id' | 'tickets'>('id');
  
  // Tickets State
  const [localTickets, setLocalTickets] = useState<LocalTicketData[]>(INITIAL_MOCK_TICKETS);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [showAllTickets, setShowAllTickets] = useState(false);

  // Add Ticket Flow State
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [addTicketStep, setAddTicketStep] = useState<1 | 2 | 3>(1);
  const [addPhone, setAddPhone] = useState('');
  const [addOtp, setAddOtp] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingTicket, setPendingTicket] = useState<{event_name: string, ticket_type: string} | null>(null);

  // Animations
  const flipAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDigitalID();
    loadTickets();
  }, []);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const loadDigitalID = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('digital_student_ids')
        .select('*')
        .eq('user_id', member?.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      setDigitalID(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      // Fetch claimed tickets from external API tables
      const { data, error } = await supabase
        .from('external_tickets')
        .select('*')
        .eq('claimed_by_user_id', member?.id)
        .order('claimed_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const dbTickets: LocalTicketData[] = data.map(t => ({
          id: t.id,
          event_name: t.event_name,
          event_date: new Date(Date.now() + 86400000 * 7).toISOString(), // Mocking future date for demo
          venue: 'Campus Grounds',
          category: t.ticket_type,
          is_free: false,
          price: null,
          status: 'valid',
          attendee_name: member?.full_name || 'Student',
          ticket_number: t.external_ticket_id,
          isNew: (Date.now() - new Date(t.claimed_at).getTime()) < 60000, // Mark as new if claimed in last 60s
        }));
        
        setLocalTickets([...dbTickets, ...INITIAL_MOCK_TICKETS]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateDigitalID = async () => {
    try {
      setGenerating(true);
      const qrData = JSON.stringify({
        studentId: member?.student_id,
        name: member?.full_name,
        university: member?.university,
        timestamp: new Date().toISOString(),
      });
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 4);
      const { data, error } = await supabase
        .from('digital_student_ids')
        .insert({
          user_id: member?.id,
          university: member?.university,
          student_number: member?.student_id,
          qr_code_data: qrData,
          issued_at: issuedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setDigitalID(data);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const flipCard = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.parallel([
      Animated.spring(flipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(cardScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
    setIsFlipped(!isFlipped);
  };

  const switchTab = (tab: 'id' | 'tickets') => {
    setActiveTab(tab);
    Animated.spring(tabSlide, {
      toValue: tab === 'id' ? 0 : 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  // --- Add Ticket Flow Handlers ---
  const toggleAddTicket = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const opening = !isAddingTicket;
    setIsAddingTicket(opening);
    if (!opening) {
      setAddTicketStep(1);
      setAddPhone('');
      setAddOtp('');
      setAddError(null);
    }
  };

  const handleSendOTP = () => {
    if (addPhone.replace(/\D/g, '').length < 9) {
      setAddError('Please enter a valid phone number.');
      return;
    }
    setAddError(null);
    setAddLoading(true);
    // Simulate OTP SMS Delay
    setTimeout(() => {
      setAddLoading(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAddTicketStep(2);
    }, 1200);
  };

  const handleVerifyOTP = async () => {
    if (addOtp.length < 4) {
      setAddError('Please enter the verification code.');
      return;
    }
    setAddError(null);
    setAddLoading(true);
    
    try {
      // Simulate validation
      await new Promise(res => setTimeout(res, 800));
      
      // Securely peek at pending tickets via API
      const { data, error } = await supabase.rpc('peek_external_tickets', {
        p_phone_number: addPhone
      });
      
      if (error) throw error;
      
      if (data && data.found) {
        setPendingTicket({ event_name: data.event_name, ticket_type: data.ticket_type });
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAddTicketStep(3);
      } else {
        setAddError('No unclaimed tickets found for this phone number.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Verification failed.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleLinkToDigiID = async () => {
    setAddLoading(true);
    try {
      // Final Identity Match & Claim
      const { data, error } = await supabase.rpc('claim_external_tickets_by_phone', {
        p_phone_number: addPhone
      });
      
      if (error) throw error;
      
      if (data && data.success && data.claimed_count > 0) {
        await loadTickets(); 
        toggleAddTicket();
      } else {
        setAddError('Failed to claim ticket. It may have already been claimed.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to add ticket.');
    } finally {
      setAddLoading(false);
    }
  };

  const getMaskedName = () => {
    if (!member?.full_name) return 'S*** S***';
    const parts = member.full_name.split(' ');
    if (parts.length === 1) return `${parts[0][0]}***`;
    return `${parts[0][0]}*** ${parts[parts.length - 1][0]}***`;
  };

  const frontOp = flipAnim.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [1, 0, 0, 0] });
  const backOp = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const tickets = localTickets.map((t) => ({
    ...t,
    attendee_name: member?.full_name || 'Student',
  }));
  const validTickets = tickets.filter((t) => t.status === 'valid');
  const pastTickets = tickets.filter((t) => t.status !== 'valid');

  const tabIndicatorX = tabSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_W - SPACING.md * 2) / 2],
  });

  if (loading && !digitalID) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Student ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color="#0A1628" />
        </View>
      </View>
    );
  }

  if (!digitalID) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Student ID</Text>
          <View style={s.topBarBtn} />
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Shield size={48} color="#C9A94E" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>Digital Student ID</Text>
          <Text style={s.emptyDesc}>
            Generate your official digital student identification card for campus access, exam verification, and identity authentication.
          </Text>
          <TouchableOpacity
            style={s.genBtn}
            onPress={generateDigitalID}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.genBtnText}>Generate ID Card</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBarBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Student ID</Text>
        <View style={s.topBarBtn} />
      </View>

      <View style={s.tabBar}>
        <Animated.View
          style={[
            s.tabIndicator,
            { transform: [{ translateX: tabIndicatorX }], width: (SCREEN_W - SPACING.md * 2) / 2 },
          ]}
        />
        <TouchableOpacity
          style={s.tab}
          onPress={() => switchTab('id')}
          activeOpacity={0.7}
        >
          <Fingerprint size={16} color={activeTab === 'id' ? '#0A1628' : COLORS.textTertiary} />
          <Text style={[s.tabText, activeTab === 'id' && s.tabTextActive]}>ID Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.tab}
          onPress={() => switchTab('tickets')}
          activeOpacity={0.7}
        >
          <Ticket size={16} color={activeTab === 'tickets' ? '#0A1628' : COLORS.textTertiary} />
          <Text style={[s.tabText, activeTab === 'tickets' && s.tabTextActive]}>Tickets</Text>
          {validTickets.length > 0 && (
            <View style={s.ticketBadge}>
              <Text style={s.ticketBadgeText}>{validTickets.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'id' && (
          <Animated.View style={{ opacity: fadeIn }}>
            <TouchableOpacity
              activeOpacity={0.97}
              onPress={flipCard}
              style={s.cardWrapper}
            >
              <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                <Animated.View style={[s.cardSide, { opacity: frontOp }]}>
                  <StudentIDCard member={member} digitalID={digitalID} isFlipped={false} />
                </Animated.View>
                <Animated.View
                  style={[
                    s.cardSide,
                    s.cardBack,
                    { opacity: backOp, transform: [{ rotateY: backRotate }] },
                  ]}
                >
                  <StudentIDCard member={member} digitalID={digitalID} isFlipped={true} />
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity style={s.flipHintRow} onPress={flipCard} activeOpacity={0.7}>
              <RotateCw size={14} color={COLORS.textTertiary} />
              <Text style={s.flipHint}>Tap card to flip</Text>
            </TouchableOpacity>

            <View style={s.servicesSection}>
              <Text style={s.servicesSectionTitle}>DIGITAL SERVICES</Text>
              <View style={s.serviceCard}>
                <View style={s.svcHeader}>
                  <View style={s.svcIconWrap}>
                    <Fingerprint size={22} color="#C9A94E" />
                  </View>
                  <View style={s.svcHeaderText}>
                    <Text style={s.svcTitle}>Student BankID</Text>
                    <Text style={s.svcSubtitle}>Verified Digital Identity</Text>
                  </View>
                </View>
                <View style={s.svcDivider} />
                <Text style={s.svcDesc}>
                  Your Student ID serves as a verified digital identity for secure authentication across campus services.
                </Text>
                <View style={s.svcFeatures}>
                  {[
                    { t: 'Document Signing', d: 'Sign hostel agreements and forms digitally' },
                    { t: 'Identity Verification', d: 'Prove student status for discounts and services' },
                    { t: 'Exam Authentication', d: 'Verify identity at exam halls automatically' },
                    { t: 'Voter Authentication', d: 'SRC election voter ID verification' },
                  ].map((f, i) => (
                    <View key={i} style={s.svcFeatureRow}>
                      <View style={s.svcCheckCircle}>
                        <Check size={10} color="#C9A94E" strokeWidth={3} />
                      </View>
                      <View style={s.svcFeatureText}>
                        <Text style={s.svcFeatureTitle}>{f.t}</Text>
                        <Text style={s.svcFeatureDesc}>{f.d}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {activeTab === 'tickets' && (
          <Animated.View style={{ opacity: fadeIn }}>
            
            {/* INLINE ADD TICKET SECTION */}
            <View style={[s.addTicketCard, isAddingTicket && s.addTicketCardActive]}>
              <TouchableOpacity 
                style={s.addTicketHeader} 
                onPress={toggleAddTicket}
                activeOpacity={0.7}
              >
                <View style={s.addTicketHeaderLeft}>
                  {isAddingTicket ? (
                    <X size={20} color={COLORS.textPrimary} />
                  ) : (
                    <Plus size={20} color="#006B3F" />
                  )}
                  <Text style={s.addTicketTitle}>
                    {isAddingTicket ? 'Cancel Adding Ticket' : 'Add External Ticket'}
                  </Text>
                </View>
                {!isAddingTicket && <ChevronDown size={20} color={COLORS.textTertiary} />}
              </TouchableOpacity>

              {isAddingTicket && (
                <View style={s.addTicketBody}>
                  {/* UX Stepper */}
                  <View style={s.stepProgressRow}>
                    <View style={[s.stepDot, addTicketStep >= 1 && s.stepDotActive]} />
                    <View style={[s.stepLine, addTicketStep >= 2 && s.stepLineActive]} />
                    <View style={[s.stepDot, addTicketStep >= 2 && s.stepDotActive]} />
                    <View style={[s.stepLine, addTicketStep >= 3 && s.stepLineActive]} />
                    <View style={[s.stepDot, addTicketStep >= 3 && s.stepDotActive]} />
                  </View>
                  <Text style={s.stepText}>
                    {addTicketStep === 1 && "Step 1: Enter purchase phone number"}
                    {addTicketStep === 2 && "Step 2: Enter verification code"}
                    {addTicketStep === 3 && "Step 3: Confirm Identity Match"}
                  </Text>

                  {addError && (
                    <View style={s.errorBox}>
                      <Text style={s.errorText}>{addError}</Text>
                    </View>
                  )}

                  {/* Step 1: Phone */}
                  {addTicketStep === 1 && (
                    <View style={s.inputGroup}>
                      <View style={s.inputWrapper}>
                        <Smartphone size={18} color={COLORS.textTertiary} style={s.inputIcon} />
                        <TextInput
                          style={s.textInput}
                          placeholder="e.g. 024XXXXXXX"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="phone-pad"
                          value={addPhone}
                          onChangeText={(t) => { setAddPhone(t); setAddError(null); }}
                          maxLength={10}
                        />
                      </View>
                      <TouchableOpacity style={s.actionBtn} onPress={handleSendOTP} disabled={addLoading}>
                        {addLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.actionBtnText}>Send OTP</Text>}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 2: OTP */}
                  {addTicketStep === 2 && (
                    <View style={s.inputGroup}>
                      <View style={s.inputWrapper}>
                        <KeyRound size={18} color={COLORS.textTertiary} style={s.inputIcon} />
                        <TextInput
                          style={s.textInput}
                          placeholder="------"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="number-pad"
                          value={addOtp}
                          onChangeText={(t) => { setAddOtp(t); setAddError(null); }}
                          maxLength={6}
                        />
                      </View>
                      <TouchableOpacity style={s.actionBtn} onPress={handleVerifyOTP} disabled={addLoading}>
                        {addLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.actionBtnText}>Verify OTP</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={s.textBtn} onPress={() => setAddTicketStep(1)}>
                        <Text style={s.textBtnLabel}>Change Phone Number</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 3: Masked Preview & Identity Verification */}
                  {addTicketStep === 3 && (
                    <View style={s.inputGroup}>
                      <View style={s.maskedPreview}>
                        <View style={s.previewRow}>
                          <Text style={s.previewLabel}>Event:</Text>
                          <Text style={s.previewValue}>{pendingTicket?.event_name || 'C*** Week Celebration'}</Text>
                        </View>
                        <View style={s.previewRow}>
                          <Text style={s.previewLabel}>Type:</Text>
                          <Text style={s.previewValue}>{pendingTicket?.ticket_type || 'Regular Entry'}</Text>
                        </View>
                        <View style={s.previewRow}>
                          <Text style={s.previewLabel}>Owner:</Text>
                          <Text style={s.previewValue}>{getMaskedName()}</Text>
                        </View>
                        
                        <View style={s.digiIdCheck}>
                          <ShieldCheck size={16} color="#006B3F" />
                          <Text style={s.digiIdCheckText}>DigiID Match Confirmed</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity style={s.actionBtnGreen} onPress={handleLinkToDigiID} disabled={addLoading}>
                        {addLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.actionBtnText}>Add to My Tickets</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {validTickets.length > 0 && (
              <View style={s.ticketSection}>
                <Text style={s.ticketSectionTitle}>UPCOMING</Text>
                {validTickets.map((ticket) => (
                  <View key={ticket.id} style={{ position: 'relative' }}>
                    <EventTicket
                      ticket={ticket}
                      onPress={() =>
                        setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)
                      }
                    />
                    {ticket.isNew && (
                      <View style={s.newBadge}>
                        <Text style={s.newBadgeText}>Added just now</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {pastTickets.length > 0 && (
              <View style={s.ticketSection}>
                <TouchableOpacity
                  style={s.pastHeader}
                  onPress={() => setShowAllTickets(!showAllTickets)}
                  activeOpacity={0.7}
                >
                  <Text style={s.ticketSectionTitle}>PAST TICKETS</Text>
                  {showAllTickets ? (
                    <ChevronUp size={18} color={COLORS.textTertiary} />
                  ) : (
                    <ChevronDown size={18} color={COLORS.textTertiary} />
                  )}
                </TouchableOpacity>
                {showAllTickets ? (
                  pastTickets.map((ticket) => (
                    <EventTicket key={ticket.id} ticket={ticket} compact />
                  ))
                ) : (
                  pastTickets.slice(0, 2).map((ticket) => (
                    <EventTicket key={ticket.id} ticket={ticket} compact />
                  ))
                )}
              </View>
            )}

            {tickets.length === 0 && (
              <View style={s.noTickets}>
                <Ticket size={36} color={COLORS.textTertiary} />
                <Text style={s.noTicketsTitle}>No Tickets Yet</Text>
                <Text style={s.noTicketsDesc}>
                  Tickets for campus events you RSVP to will appear here automatically.
                </Text>
                <TouchableOpacity
                  style={s.browseEventsBtn}
                  onPress={() => router.push('/events' as never)}
                  activeOpacity={0.8}
                >
                  <Text style={s.browseEventsBtnText}>Browse Events</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'web' ? 0 : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'web' ? SPACING.sm + 2 : 50,
  },
  topBarBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#F0F2F5',
    borderRadius: RADIUS.md - 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: COLORS.textTertiary,
  },
  tabTextActive: {
    color: '#0A1628',
  },
  ticketBadge: {
    backgroundColor: '#DC143C',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  ticketBadgeText: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: '#FFF',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },

  cardWrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSide: {
    width: CARD_W,
    height: CARD_H,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  flipHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
    paddingVertical: 4,
  },
  flipHint: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
  },

  servicesSection: {
    marginBottom: SPACING.md,
  },
  servicesSectionTitle: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#475569',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  svcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  svcIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(201,169,78,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,169,78,0.15)',
  },
  svcHeaderText: {
    flex: 1,
  },
  svcTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#0F172A',
  },
  svcSubtitle: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: '#64748B',
    marginTop: 1,
  },
  svcDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  svcDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  svcFeatures: {
    gap: 10,
  },
  svcFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  svcCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(201,169,78,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  svcFeatureText: {
    flex: 1,
  },
  svcFeatureTitle: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: '#0F172A',
  },
  svcFeatureDesc: {
    fontSize: 10,
    fontFamily: FONT.regular,
    color: '#64748B',
    marginTop: 1,
  },

  /* --- INLINE ADD TICKET UI --- */
  addTicketCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  addTicketCardActive: {
    borderColor: '#006B3F',
    elevation: 4,
    shadowColor: '#006B3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  addTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#F8FAFC',
  },
  addTicketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTicketTitle: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: '#0F172A',
  },
  addTicketBody: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    backgroundColor: '#006B3F',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#006B3F',
  },
  stepText: {
    fontSize: 11,
    fontFamily: FONT.semiBold,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: FONT.medium,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    height: 50,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  actionBtn: {
    backgroundColor: '#0A1628',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnGreen: {
    backgroundColor: '#006B3F',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONT.bold,
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textBtnLabel: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontFamily: FONT.medium,
    textDecorationLine: 'underline',
  },
  maskedPreview: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: '#64748B',
  },
  previewValue: {
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0F172A',
  },
  digiIdCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 107, 63, 0.1)',
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  digiIdCheckText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#006B3F',
  },

  ticketSection: {
    marginBottom: SPACING.lg,
  },
  ticketSectionTitle: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#475569',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  newBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#DC143C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#DC143C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noTickets: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noTicketsTitle: {
    fontSize: 17,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  noTicketsDesc: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: SPACING.xl,
  },
  browseEventsBtn: {
    backgroundColor: '#0A1628',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseEventsBtnText: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: '#FFF',
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(201,169,78,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,169,78,0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.xl,
  },
  genBtn: {
    backgroundColor: '#0A1628',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  genBtnText: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: '#FFF',
  },
});