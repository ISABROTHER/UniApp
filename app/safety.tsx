import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Heart,
  Car,
  Shield,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'map' | 'report' | 'wellness' | 'transport';

type Zone = {
  name: string;
  rating: 'safe' | 'moderate' | 'caution';
  incidents: number;
  tips: string[];
};

type Category = 'Harassment' | 'Theft' | 'Unsafe Conditions' | 'Violence' | 'Other';
type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
type TransportStatus = 'idle' | 'requested' | 'matched' | 'in_transit' | 'completed';

export default function SafetyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [loading, setLoading] = useState(false);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<Category>('Harassment');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [locationDesc, setLocationDesc] = useState('');
  const [description, setDescription] = useState('');

  const [moodScore, setMoodScore] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [wellnessNotes, setWellnessNotes] = useState('');
  const [checkinHistory, setCheckinHistory] = useState<any[]>([]);

  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('idle');
  const [driverInfo, setDriverInfo] = useState({ name: '', phone: '', eta: '' });

  const zones: Zone[] = [
    {
      name: 'Science Gate Area',
      rating: 'safe',
      incidents: 1,
      tips: ['Well-lit area', 'CCTV covered', 'Security patrol frequent'],
    },
    {
      name: 'Old Site',
      rating: 'moderate',
      incidents: 3,
      tips: ['CCTV covered', 'Emergency button available'],
    },
    {
      name: 'New Site',
      rating: 'safe',
      incidents: 0,
      tips: ['Well-lit area', 'Security patrol frequent'],
    },
    {
      name: 'Oguaa Hall',
      rating: 'safe',
      incidents: 1,
      tips: ['Security patrol frequent', 'CCTV covered'],
    },
    {
      name: 'STC Area',
      rating: 'caution',
      incidents: 5,
      tips: ['Use buddy system', 'Avoid late hours'],
    },
  ];

  const emergencyNumbers = [
    { name: 'Campus Security', number: '0123456789' },
    { name: 'Police', number: '191' },
    { name: 'Ambulance', number: '193' },
  ];

  const categories: Category[] = ['Harassment', 'Theft', 'Unsafe Conditions', 'Violence', 'Other'];
  const severities: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

  const moodEmojis = ['😢', '😕', '😐', '🙂', '😄'];
  const sleepEmojis = ['😴', '😪', '😌', '😊', '🌟'];
  const stressEmojis = ['😌', '🙂', '😐', '😰', '😫'];

  useEffect(() => {
    if (activeTab === 'wellness') {
      loadWellnessHistory();
    }
  }, [activeTab]);

  const loadWellnessHistory = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (!error && data) {
      setCheckinHistory(data.reverse());
    }
  };

  const handleSubmitReport = async () => {
    if (!locationDesc.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('safety_reports').insert({
      reporter_id: isAnonymous ? null : user?.id,
      university: user?.university || 'UCC',
      location_description: locationDesc,
      category: category,
      description: description,
      is_anonymous: isAnonymous,
      status: 'pending',
      severity: severity.toLowerCase(),
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Failed to submit report');
    } else {
      Alert.alert('Success', 'Your report has been submitted');
      setLocationDesc('');
      setDescription('');
    }
  };

  const handleSubmitWellness = async () => {
    if (!user) return;

    const weekNumber = Math.ceil(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );

    setLoading(true);
    const { error } = await supabase.from('wellness_checkins').insert({
      user_id: user.id,
      mood_score: moodScore,
      sleep_quality: sleepQuality,
      stress_level: stressLevel,
      notes: wellnessNotes,
      week_number: weekNumber,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Failed to submit check-in');
    } else {
      Alert.alert('Success', 'Check-in recorded');
      setWellnessNotes('');
      loadWellnessHistory();
    }
  };

  const handleRequestTransport = async () => {
    if (!pickupLocation.trim() || !destination.trim()) {
      Alert.alert('Error', 'Please fill in pickup and destination');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('night_transport_requests').insert({
      user_id: user?.id,
      pickup_location: pickupLocation,
      destination: destination,
      status: 'requested',
    }).select().single();

    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Failed to request transport');
    } else {
      setTransportStatus('requested');
      Alert.alert('Success', 'Transport requested. A driver will be assigned shortly.');
      setTimeout(() => {
        setTransportStatus('matched');
        setDriverInfo({ name: 'John Mensah', phone: '0244123456', eta: '5 mins' });
      }, 3000);
    }
  };

  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const getRatingColor = (rating: Zone['rating']) => {
    switch (rating) {
      case 'safe':
        return COLORS.success;
      case 'moderate':
        return COLORS.warning;
      case 'caution':
        return COLORS.error;
    }
  };

  const getSeverityColor = (sev: Severity) => {
    switch (sev) {
      case 'Low':
        return COLORS.success;
      case 'Medium':
        return COLORS.warning;
      case 'High':
        return COLORS.error;
      case 'Critical':
        return COLORS.primary;
    }
  };

  const hasDeciningTrend = () => {
    if (checkinHistory.length < 3) return false;
    const recent = checkinHistory.slice(-3);
    const avgMood = recent.reduce((sum, c) => sum + c.mood_score, 0) / recent.length;
    return avgMood < 2.5;
  };

  const renderMapTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Campus Safety Map</Text>
        <Text style={styles.sectionSubtitle}>Real-time safety ratings by zone</Text>
      </View>

      {zones.map((zone, index) => (
        <View key={index} style={styles.zoneCard}>
          <View style={styles.zoneHeader}>
            <View style={styles.zoneTitle}>
              <MapPin size={20} color={COLORS.textPrimary} />
              <Text style={styles.zoneName}>{zone.name}</Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(zone.rating) }]}>
              <Text style={styles.ratingText}>{zone.rating.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.incidentRow}>
            <AlertTriangle size={16} color={COLORS.textSecondary} />
            <Text style={styles.incidentText}>{zone.incidents} incidents this week</Text>
          </View>
          <View style={styles.tipsContainer}>
            {zone.tips.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.emergencySection}>
        <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
        {emergencyNumbers.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.emergencyCard}
            onPress={() => callNumber(contact.number)}
          >
            <Phone size={20} color={COLORS.primary} />
            <View style={styles.emergencyInfo}>
              <Text style={styles.emergencyName}>{contact.name}</Text>
              <Text style={styles.emergencyNumber}>{contact.number}</Text>
            </View>
            <ArrowLeft size={20} color={COLORS.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderReportTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.bannerCard}>
        <Shield size={24} color={COLORS.primary} />
        <Text style={styles.bannerText}>Your reports help keep campus safe</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <Text style={styles.label}>Report Anonymously</Text>
          <View style={[styles.toggle, isAnonymous && styles.toggleActive]}>
            <View style={[styles.toggleThumb, isAnonymous && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Severity</Text>
        <View style={styles.chipContainer}>
          {severities.map((sev) => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.chip,
                severity === sev && { backgroundColor: getSeverityColor(sev) },
              ]}
              onPress={() => setSeverity(sev)}
            >
              <Text
                style={[styles.chipText, severity === sev && { color: COLORS.white }]}
              >
                {sev}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location Description</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Near Science Library"
          value={locationDesc}
          onChangeText={setLocationDesc}
          placeholderTextColor={COLORS.textTertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what happened..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholderTextColor={COLORS.textTertiary}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSubmitReport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderWellnessTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Check-In</Text>
        <Text style={styles.sectionSubtitle}>Track your mental wellness</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Mood (1-5)</Text>
        <View style={styles.emojiSlider}>
          {moodEmojis.map((emoji, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.emojiButton,
                moodScore === idx + 1 && styles.emojiButtonActive,
              ]}
              onPress={() => setMoodScore(idx + 1)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Sleep Quality (1-5)</Text>
        <View style={styles.emojiSlider}>
          {sleepEmojis.map((emoji, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.emojiButton,
                sleepQuality === idx + 1 && styles.emojiButtonActive,
              ]}
              onPress={() => setSleepQuality(idx + 1)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Stress Level (1-5)</Text>
        <View style={styles.emojiSlider}>
          {stressEmojis.map((emoji, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.emojiButton,
                stressLevel === idx + 1 && styles.emojiButtonActive,
              ]}
              onPress={() => setStressLevel(idx + 1)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional thoughts..."
          value={wellnessNotes}
          onChangeText={setWellnessNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={COLORS.textTertiary}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSubmitWellness}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Submit Check-In</Text>
        )}
      </TouchableOpacity>

      {checkinHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History (Last 4 Weeks)</Text>
          <View style={styles.chartContainer}>
            {checkinHistory.map((checkin, idx) => (
              <View key={idx} style={styles.chartBar}>
                <View
                  style={[
                    styles.chartBarFill,
                    { height: `${(checkin.mood_score / 5) * 100}%` },
                  ]}
                />
                <Text style={styles.chartLabel}>W{idx + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasDeciningTrend() && (
        <View style={styles.counselingCard}>
          <Heart size={24} color={COLORS.primary} />
          <View style={styles.counselingContent}>
            <Text style={styles.counselingTitle}>We're here for you</Text>
            <Text style={styles.counselingText}>
              Your wellness scores show you might benefit from support. Consider reaching out to campus counseling services.
            </Text>
            <TouchableOpacity style={styles.counselingButton}>
              <Text style={styles.counselingButtonText}>Contact Counselor</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderTransportTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.noticeCard}>
        <Clock size={20} color={COLORS.info} />
        <Text style={styles.noticeText}>Night transport available 8PM - 6AM</Text>
      </View>

      {transportStatus === 'idle' && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Science Library"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Oguaa Hall"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRequestTransport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Request Transport</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {transportStatus !== 'idle' && (
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Transport Status</Text>

          <View style={styles.statusTracker}>
            <View style={styles.statusStep}>
              <View style={[styles.statusDot, styles.statusDotActive]}>
                <CheckCircle size={20} color={COLORS.white} />
              </View>
              <Text style={styles.statusLabel}>Requested</Text>
            </View>

            <View style={[styles.statusLine, transportStatus !== 'requested' && styles.statusLineActive]} />

            <View style={styles.statusStep}>
              <View
                style={[
                  styles.statusDot,
                  (transportStatus === 'matched' || transportStatus === 'in_transit' || transportStatus === 'completed') &&
                    styles.statusDotActive,
                ]}
              >
                {(transportStatus === 'matched' || transportStatus === 'in_transit' || transportStatus === 'completed') ? (
                  <CheckCircle size={20} color={COLORS.white} />
                ) : (
                  <Clock size={20} color={COLORS.textTertiary} />
                )}
              </View>
              <Text style={styles.statusLabel}>Matched</Text>
            </View>

            <View style={[styles.statusLine, (transportStatus === 'in_transit' || transportStatus === 'completed') && styles.statusLineActive]} />

            <View style={styles.statusStep}>
              <View
                style={[
                  styles.statusDot,
                  (transportStatus === 'in_transit' || transportStatus === 'completed') && styles.statusDotActive,
                ]}
              >
                {(transportStatus === 'in_transit' || transportStatus === 'completed') ? (
                  <Car size={20} color={COLORS.white} />
                ) : (
                  <Clock size={20} color={COLORS.textTertiary} />
                )}
              </View>
              <Text style={styles.statusLabel}>In Transit</Text>
            </View>

            <View style={[styles.statusLine, transportStatus === 'completed' && styles.statusLineActive]} />

            <View style={styles.statusStep}>
              <View style={[styles.statusDot, transportStatus === 'completed' && styles.statusDotActive]}>
                {transportStatus === 'completed' ? (
                  <CheckCircle size={20} color={COLORS.white} />
                ) : (
                  <Clock size={20} color={COLORS.textTertiary} />
                )}
              </View>
              <Text style={styles.statusLabel}>Completed</Text>
            </View>
          </View>

          {transportStatus === 'matched' && (
            <View style={styles.driverCard}>
              <User size={40} color={COLORS.primary} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driverInfo.name}</Text>
                <Text style={styles.driverDetail}>Phone: {driverInfo.phone}</Text>
                <Text style={styles.driverDetail}>ETA: {driverInfo.eta}</Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => callNumber(driverInfo.phone)}
              >
                <Phone size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.emergencySection}>
        <Text style={styles.emergencyTitle}>Campus Emergency Numbers</Text>
        {emergencyNumbers.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.emergencyCard}
            onPress={() => callNumber(contact.number)}
          >
            <Phone size={20} color={COLORS.primary} />
            <View style={styles.emergencyInfo}>
              <Text style={styles.emergencyName}>{contact.name}</Text>
              <Text style={styles.emergencyNumber}>{contact.number}</Text>
            </View>
            <ArrowLeft size={20} color={COLORS.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Safety</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <MapPin size={20} color={activeTab === 'map' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
            Safety Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'report' && styles.tabActive]}
          onPress={() => setActiveTab('report')}
        >
          <AlertTriangle size={20} color={activeTab === 'report' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>
            Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'wellness' && styles.tabActive]}
          onPress={() => setActiveTab('wellness')}
        >
          <Heart size={20} color={activeTab === 'wellness' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'wellness' && styles.tabTextActive]}>
            Wellness
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'transport' && styles.tabActive]}
          onPress={() => setActiveTab('transport')}
        >
          <Car size={20} color={activeTab === 'transport' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'transport' && styles.tabTextActive]}>
            Transport
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'map' && renderMapTab()}
      {activeTab === 'report' && renderReportTab()}
      {activeTab === 'wellness' && renderWellnessTab()}
      {activeTab === 'transport' && renderTransportTab()}
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.sm,
    width: 40,
  },
  headerTitle: {
    fontFamily: FONT.heading,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  zoneCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  zoneTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  zoneName: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  ratingBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  ratingText: {
    fontFamily: FONT.semiBold,
    fontSize: 10,
    color: COLORS.white,
  },
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  incidentText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tipsContainer: {
    gap: SPACING.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  tipText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emergencySection: {
    marginTop: SPACING.lg,
  },
  emergencyTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  emergencyName: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  emergencyNumber: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  bannerText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.info,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.success,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  emojiSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  emojiButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoLight,
  },
  emoji: {
    fontSize: 28,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBarFill: {
    width: '80%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xs,
    minHeight: 10,
  },
  chartLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  counselingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  counselingContent: {
    flex: 1,
  },
  counselingTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  counselingText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  counselingButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  counselingButtonText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  noticeText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.info,
  },
  statusContainer: {
    marginTop: SPACING.lg,
  },
  statusTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.lg,
  },
  statusStep: {
    alignItems: 'center',
  },
  statusDot: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  statusLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statusLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: -8,
  },
  statusLineActive: {
    backgroundColor: COLORS.success,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  driverName: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  driverDetail: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
