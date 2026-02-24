import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import {
  ArrowLeft, BookOpen, ShoppingBag, Shirt, Coffee,
  Printer, Wifi, Sparkles, ChevronRight, Clock,
  MapPin, Star,
} from 'lucide-react-native';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  price?: string;
  availability: 'available' | 'limited' | 'unavailable';
  location: string;
  hours: string;
  route?: string;
}

export default function HallServicesScreen() {
  const router = useRouter();

  const services: Service[] = [
    {
      id: '1',
      name: 'Exercise Books',
      description: 'Quality exercise books for lectures and notes',
      icon: BookOpen,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      price: 'GH₵ 2.00 - GH₵ 5.00',
      availability: 'available',
      location: 'Hall Shop, Ground Floor',
      hours: '8:00 AM - 8:00 PM',
      route: '/hall/services/exercise-books',
    },
    {
      id: '2',
      name: 'T-Rolls & Toiletries',
      description: 'Tissue rolls, soap, and personal care items',
      icon: Sparkles,
      color: '#10B981',
      bgColor: '#D1FAE5',
      price: 'GH₵ 3.00 - GH₵ 15.00',
      availability: 'available',
      location: 'Hall Shop, Ground Floor',
      hours: '8:00 AM - 8:00 PM',
      route: '/hall/services/toiletries',
    },
    {
      id: '3',
      name: 'Hall T-Shirts',
      description: 'Official hall branded merchandise and apparel',
      icon: Shirt,
      color: '#DC143C',
      bgColor: '#FEE2E2',
      price: 'GH₵ 35.00 - GH₵ 80.00',
      availability: 'limited',
      location: 'JCRC Office',
      hours: 'Mon-Fri, 2:00 PM - 5:00 PM',
      route: '/hall/services/merchandise',
    },
    {
      id: '4',
      name: 'Printing Services',
      description: 'Print documents, assignments, and projects',
      icon: Printer,
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      price: 'GH₵ 0.20/page (B&W)',
      availability: 'available',
      location: 'Hall Library',
      hours: '7:00 AM - 10:00 PM',
      route: '/print',
    },
    {
      id: '5',
      name: 'Snacks & Beverages',
      description: 'Quick bites, soft drinks, and water',
      icon: Coffee,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      price: 'GH₵ 1.00 - GH₵ 10.00',
      availability: 'available',
      location: 'Hall Shop, Ground Floor',
      hours: '6:00 AM - 9:00 PM',
      route: '/hall/services/snacks',
    },
    {
      id: '6',
      name: 'WiFi Vouchers',
      description: 'Internet access vouchers for hall network',
      icon: Wifi,
      color: '#06B6D4',
      bgColor: '#CFFAFE',
      price: 'GH₵ 5.00 - GH₵ 20.00',
      availability: 'available',
      location: 'Porter\'s Lodge',
      hours: '24/7',
      route: '/hall/services/wifi',
    },
  ];

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return '#10B981';
      case 'limited': return '#F59E0B';
      case 'unavailable': return '#EF4444';
      default: return COLORS.textTertiary;
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Available Now';
      case 'limited': return 'Limited Stock';
      case 'unavailable': return 'Out of Stock';
      default: return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hall Services</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <ShoppingBag size={32} color={COLORS.primary} />
          <Text style={styles.heroTitle}>Everything You Need</Text>
          <Text style={styles.heroSubtitle}>
            From study essentials to daily necessities, all available within your hall
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Available Services</Text>

        {services.map((service) => {
          const Icon = service.icon;
          const availabilityColor = getAvailabilityColor(service.availability);
          const availabilityText = getAvailabilityText(service.availability);

          return (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => service.route && router.push(service.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceHeader}>
                <View style={[styles.serviceIcon, { backgroundColor: service.bgColor }]}>
                  <Icon size={28} color={service.color} />
                </View>
                
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.availabilityBadge}>
                    <View style={[styles.availabilityDot, { backgroundColor: availabilityColor }]} />
                    <Text style={[styles.availabilityText, { color: availabilityColor }]}>
                      {availabilityText}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={20} color={COLORS.textTertiary} />
              </View>

              <Text style={styles.serviceDescription}>{service.description}</Text>

              <View style={styles.serviceDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price Range:</Text>
                  <Text style={styles.detailValue}>{service.price}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={12} color={COLORS.textTertiary} />
                  <Text style={styles.detailValue}>{service.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Clock size={12} color={COLORS.textTertiary} />
                  <Text style={styles.detailValue}>{service.hours}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Something Else?</Text>
          <Text style={styles.helpText}>
            Contact the hall shop attendant or JCRC for special requests
          </Text>
          <TouchableOpacity style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>Contact Hall Shop</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  heroTitle: {
    fontFamily: FONT.headingBold,
    fontSize: 22,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  serviceCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
  },
  serviceDescription: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  serviceDetails: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  detailValue: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  helpCard: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  helpTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: COLORS.info,
    marginBottom: SPACING.xs,
  },
  helpText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.info,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  helpBtn: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  helpBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    color: COLORS.white,
  },
});