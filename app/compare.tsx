import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { Hostel } from '@/lib/types';
import { ArrowLeft, MapPin, Star, ShieldCheck, Check, X, Building, Info } from 'lucide-react-native';

export default function CompareScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAmenities, setAllAmenities] = useState<string[]>([]);

  useEffect(() => {
    if (!ids) {
      router.back();
      return;
    }
    fetchHostels(ids.split(','));
  }, [ids]);

  const fetchHostels = async (hostelIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('hostels')
        .select('*, hostel_images(*), hostel_rooms(*)')
        .in('id', hostelIds);

      if (error) throw error;

      if (data) {
        const formatted = data.map((h: any) => ({
          ...h,
          images: h.hostel_images || [],
          rooms: h.hostel_rooms || []
        })) as Hostel[];
        
        // Re-sort them to match the selection order if possible
        const sorted = formatted.sort((a, b) => hostelIds.indexOf(a.id) - hostelIds.indexOf(b.id));
        setHostels(sorted);

        // Extract unique amenities across all selected hostels for the matrix rows
        const amenitiesSet = new Set<string>();
        sorted.forEach(h => {
          if (h.amenities && Array.isArray(h.amenities)) {
            h.amenities.forEach((a: string) => amenitiesSet.add(a));
          }
        });
        setAllAmenities(Array.from(amenitiesSet).sort());
      }
    } catch (e) {
      console.error('Failed to fetch hostels for comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (h: Hostel) => h.images?.[0]?.image_url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=400';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Building comparison matrix...</Text>
      </View>
    );
  }

  // Calculate dynamic column width based on how many hostels are selected (max 3)
  const COL_WIDTH = 150;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Hostels</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matrixContainer}>
          
          {/* LABELS COLUMN */}
          <View style={styles.labelsColumn}>
            <View style={styles.imageSpacer} />
            <View style={styles.rowCell}><Text style={styles.labelText}>Price (Min)</Text></View>
            <View style={styles.rowCell}><Text style={styles.labelText}>Distance</Text></View>
            <View style={styles.rowCell}><Text style={styles.labelText}>Rating</Text></View>
            <View style={styles.rowCell}><Text style={styles.labelText}>Verified</Text></View>
            <View style={styles.rowCell}><Text style={styles.labelText}>Room Types</Text></View>
            
            <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>AMENITIES</Text></View>
            {allAmenities.map(amenity => (
              <View key={amenity} style={styles.rowCell}><Text style={styles.labelText}>{amenity}</Text></View>
            ))}
          </View>

          {/* DATA COLUMNS */}
          {hostels.map(hostel => (
            <View key={hostel.id} style={[styles.dataColumn, { width: COL_WIDTH }]}>
              <TouchableOpacity 
                style={styles.hostelHeader} 
                onPress={() => router.push(`/detail?id=${hostel.id}` as any)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: getImageUrl(hostel) }} style={styles.hostelImage} />
                <Text style={styles.hostelName} numberOfLines={2}>{hostel.name}</Text>
                <View style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>View</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.rowCell}>
                <Text style={styles.priceText}>GH₵{hostel.price_range_min.toLocaleString()}</Text>
              </View>

              <View style={styles.rowCell}>
                <View style={styles.iconTextRow}>
                  <MapPin size={12} color={COLORS.primary} />
                  <Text style={styles.valueText} numberOfLines={2}>{hostel.campus_proximity}</Text>
                </View>
              </View>

              <View style={styles.rowCell}>
                <View style={styles.iconTextRow}>
                  <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
                  <Text style={styles.valueTextBold}>{hostel.rating.toFixed(1)}</Text>
                </View>
              </View>

              <View style={styles.rowCell}>
                {hostel.verified ? (
                  <ShieldCheck size={20} color={COLORS.success} />
                ) : (
                  <Text style={styles.unverifiedText}>No</Text>
                )}
              </View>

              <View style={styles.rowCell}>
                <Text style={styles.valueText} numberOfLines={2}>
                  {hostel.rooms && hostel.rooms.length > 0 
                    ? Array.from(new Set(hostel.rooms.map(r => r.room_type))).join(', ') 
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.sectionHeader}><View style={styles.sectionHeaderLine} /></View>
              
              {allAmenities.map(amenity => {
                const hasAmenity = hostel.amenities?.includes(amenity);
                return (
                  <View key={`${hostel.id}-${amenity}`} style={styles.rowCell}>
                    {hasAmenity ? (
                      <Check size={18} color={COLORS.success} />
                    ) : (
                      <X size={18} color={COLORS.borderDark} />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          
        </ScrollView>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { fontFamily: FONT.medium, fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },
  
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: FONT.headingBold, fontSize: 18, color: COLORS.textPrimary },

  content: { flex: 1, backgroundColor: COLORS.background },
  matrixContainer: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm },
  
  labelsColumn: { width: 110, paddingRight: SPACING.sm, backgroundColor: COLORS.background },
  imageSpacer: { height: 180, marginBottom: SPACING.md },
  
  dataColumn: {
    marginHorizontal: 4, backgroundColor: COLORS.white, 
    borderRadius: RADIUS.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  
  hostelHeader: { padding: SPACING.sm, alignItems: 'center', height: 180, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  hostelImage: { width: '100%', height: 90, borderRadius: RADIUS.md, backgroundColor: COLORS.borderLight, marginBottom: 8 },
  hostelName: { fontFamily: FONT.semiBold, fontSize: 14, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8, height: 38 },
  viewBtn: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 16, paddingVertical: 4, borderRadius: RADIUS.full },
  viewBtnText: { fontFamily: FONT.semiBold, fontSize: 11, color: COLORS.primary },

  rowCell: {
    height: 52, justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    paddingHorizontal: 8
  },
  
  labelText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', width: '100%' },
  
  priceText: { fontFamily: FONT.bold, fontSize: 15, color: COLORS.primary },
  valueText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textPrimary, textAlign: 'center' },
  valueTextBold: { fontFamily: FONT.bold, fontSize: 13, color: COLORS.textPrimary },
  unverifiedText: { fontFamily: FONT.regular, fontSize: 12, color: COLORS.textTertiary },
  
  iconTextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },

  sectionHeader: { height: 40, justifyContent: 'flex-end', paddingBottom: 8 },
  sectionHeaderText: { fontFamily: FONT.bold, fontSize: 10, color: COLORS.textTertiary, letterSpacing: 1, textAlign: 'right' },
  sectionHeaderLine: { height: 1, backgroundColor: COLORS.borderLight, width: '100%' }
});