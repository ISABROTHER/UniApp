export const COLORS = {
  primary: '#DC143C',
  primaryLight: '#E94B67',
  primaryDark: '#B00F2F',
  primaryFaded: 'rgba(220, 20, 60, 0.08)',

  navy: '#1A2332',
  navyLight: '#2A3544',

  accent: '#4A90E2',
  accentLight: '#6BA4E8',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  white: '#FFFFFF',
  background: '#F8F9FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',

  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  overlay: 'rgba(0,0,0,0.5)',
  gradient: ['#1A2332', '#2563EB'],

  gold: '#F59E0B',
  teal: '#0CC0B0',
  purple: '#7C3AED',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const FONT = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  heading: 'Poppins-SemiBold',
  headingBold: 'Poppins-Bold',
};

export const ROOM_TYPES = ['All', 'Single Room', 'Double Room', 'Self-Contained', 'Chamber & Hall', 'Studio'];

export const BUDGET_OPTIONS_GHS = [200, 400, 600, 800, 1000, 1500];

export const GHANA_UNIVERSITIES = [
  'University of Ghana (Legon)',
  'KNUST',
  'University of Cape Coast',
  'Ghana Institute of Management and Public Administration (GIMPA)',
  'Ashesi University',
  'University of Professional Studies (UPSA)',
  'Ghana Communication Technology University (GCTU)',
  'Central University',
  'Valley View University',
  'Methodist University',
  'Regent University College',
  'Lancaster University Ghana',
];

export const GHANA_CITIES = [
  'Accra',
  'Kumasi',
  'Tamale',
  'Cape Coast',
  'Takoradi',
  'Ho',
  'Koforidua',
  'Sunyani',
];

export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Northern',
  'Volta',
  'Brong-Ahafo',
  'Upper East',
  'Upper West',
];

export const AMENITIES_LIST = [
  'WiFi',
  'Security',
  'Water (24hr)',
  'Electricity (24hr)',
  'Generator Backup',
  'Air Conditioning',
  'Ceiling Fan',
  'CCTV',
  'Gated Compound',
  'Parking',
  'Laundry',
  'Kitchen',
  'Study Room',
  'Common Room',
  'Gym',
  'Swimming Pool',
  'Borehole',
  'Waste Management',
];

export const LAUNDRY_TRACKING_STEPS = [
  { step: 'pending', label: 'Order Placed', stepNumber: 1 },
  { step: 'confirmed', label: 'Confirmed', stepNumber: 2 },
  { step: 'picked_up', label: 'Picked Up', stepNumber: 3 },
  { step: 'washing', label: 'Washing', stepNumber: 4 },
  { step: 'out_for_delivery', label: 'Out for Delivery', stepNumber: 5 },
  { step: 'delivered', label: 'Delivered', stepNumber: 6 },
  { step: 'completed', label: 'Completed', stepNumber: 7 },
];

export const LAUNDRY_PASS_PLANS = [
  {
    id: 'basic',
    name: 'Basic Pass',
    washes: 4,
    price: 120,
    period: 'month',
    badge: null,
    description: '4 washes per month',
  },
  {
    id: 'standard',
    name: 'Standard Pass',
    washes: 8,
    price: 200,
    period: 'month',
    badge: 'Popular',
    description: '8 washes per month',
  },
  {
    id: 'semester',
    name: 'Semester Pass',
    washes: 30,
    price: 600,
    period: 'semester',
    badge: 'Best Value',
    description: '30 washes per semester',
  },
];

export const QUICK_TOPUP_AMOUNTS = [10, 20, 50, 100, 150, 200];

export const UTILITY_TOPUP_AMOUNTS = [10, 20, 50, 100, 200];

export const MAINTENANCE_PRIORITIES = [
  { value: 'low', label: 'Low', color: COLORS.info },
  { value: 'medium', label: 'Medium', color: COLORS.warning },
  { value: 'high', label: 'High', color: COLORS.error },
  { value: 'urgent', label: 'Urgent', color: '#7C3AED' },
];

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  confirmed: COLORS.success,
  checked_in: COLORS.info,
  completed: COLORS.textSecondary,
  cancelled: COLORS.error,
};

export const LAUNDRY_STATUS_COLORS: Record<string, string> = {
  pending: COLORS.textSecondary,
  confirmed: COLORS.info,
  picked_up: COLORS.accent,
  washing: COLORS.warning,
  out_for_delivery: COLORS.primary,
  delivered: COLORS.success,
  completed: COLORS.textSecondary,
};

export const AGREEMENT_STATUS_COLORS: Record<string, string> = {
  draft: COLORS.textSecondary,
  pending_signature: COLORS.warning,
  active: COLORS.success,
  expired: COLORS.error,
  terminated: COLORS.error,
};

export const NLP_AMENITY_SYNONYMS: Record<string, string> = {
  'wifi': 'WiFi',
  'internet': 'WiFi',
  'wireless': 'WiFi',
  'gym': 'Gym',
  'fitness': 'Gym',
  'workout': 'Gym',
  'laundry': 'Laundry',
  'wash': 'Laundry',
  'parking': 'Parking',
  'park': 'Parking',
  'security': 'Security',
  'gated': 'Gated Compound',
  'generator': 'Generator Backup',
  'power': 'Electricity (24hr)',
  'light': 'Electricity (24hr)',
  'water': 'Water (24hr)',
  'borehole': 'Borehole',
  'ac': 'Air Conditioning',
  'air condition': 'Air Conditioning',
  'kitchen': 'Kitchen',
  'swimming': 'Swimming Pool',
  'pool': 'Swimming Pool',
  'cctv': 'CCTV',
  'study': 'Study Room',
};
