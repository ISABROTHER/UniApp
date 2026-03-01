export type UserRole = 'student' | 'owner' | 'admin';

export interface Member {
  id: string;
  student_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  hall_of_residence: string | null;
  avatar_url: string | null;
  membership_status: string;
  role: UserRole;
  ghana_card_number: string | null;
  id_verified: boolean;
  id_verified_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Hostel {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  address: string;
  campus_proximity: string;
  latitude: number | null;
  longitude: number | null;
  price_range_min: number;
  price_range_max: number;
  total_rooms: number;
  available_rooms: number;
  rating: number;
  review_count: number;
  featured: boolean;
  verified: boolean;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
  is_favourite?: boolean;
  images?: HostelImage[];
  amenities?: HostelAmenity[];
  rooms?: HostelRoom[];
}

export interface HostelImage {
  id: string;
  hostel_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export interface HostelAmenity {
  id: string;
  hostel_id: string;
  amenity: string;
}

export interface HostelRoom {
  id: string;
  hostel_id: string;
  room_type: string;
  price_per_month: number;
  available_count: number;
  total_count: number;
  description: string | null;
  images: string[];
  created_at: string;
}

export interface Booking {
  id: string;
  hostel_id: string;
  room_id: string | null;
  user_id: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_price: number;
  special_requests: string | null;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'payment_pending';
  qr_code: string | null;
  payment_reference: string | null;
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'held';
  paid_at: string | null;
  payout_released_at: string | null;
  platform_fee: number;
  processing_fee: number;
  created_at: string;
  updated_at: string;
  hostel?: Hostel;
}

export interface HostelReview {
  id: string;
  hostel_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified_guest: boolean;
  created_at: string;
  member?: Member;
}

export interface TenancyAgreement {
  id: string;
  landlord_id: string;
  tenant_id: string;
  hostel_id: string;
  property_address: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  terms: string | null;
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
  ghana_rent_act_compliant: boolean;
  created_at: string;
  updated_at: string;
  hostel?: Hostel;
}

export interface RentInvoice {
  id: string;
  agreement_id: string;
  amount: number;
  due_date: string;
  period_start: string;
  period_end: string;
  status: 'unpaid' | 'paid' | 'overdue' | 'waived';
  invoice_number: string;
  paid_at: string | null;
  created_at: string;
}

export interface RentPayment {
  id: string;
  invoice_id: string;
  tenant_id: string;
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  status: 'pending' | 'completed' | 'failed';
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface LaundryProvider {
  id: string;
  name: string;
  phone: string | null;
  areas_served: string[];
  rating: number;
  review_count: number;
  price_per_kg: number;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface LaundryOrder {
  id: string;
  user_id: string;
  provider_id: string;
  weight_kg: number;
  pickup_address: string;
  delivery_address: string;
  delivery_type: 'door' | 'drop_point';
  express: boolean;
  eco_wash: boolean;
  total_price: number;
  status: 'pending' | 'confirmed' | 'picked_up' | 'washing' | 'out_for_delivery' | 'delivered' | 'completed';
  rider_name: string | null;
  rider_phone: string | null;
  rider_rating: number | null;
  special_instructions: string | null;
  escrow_held: boolean;
  escrow_released_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  provider?: LaundryProvider;
}

export interface LaundryWallet {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface LaundryTransaction {
  id: string;
  user_id: string;
  type: 'topup' | 'debit' | 'refund';
  amount: number;
  description: string;
  reference: string | null;
  balance_after: number;
  created_at: string;
}

export interface LaundryPass {
  id: string;
  user_id: string;
  plan_name: 'basic' | 'standard' | 'semester';
  washes_total: number;
  washes_used: number;
  price_paid: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export interface LaundryPreferences {
  id: string;
  user_id: string;
  detergent_type: 'regular' | 'sensitive' | 'eco';
  wash_temperature: 'cold' | 'warm' | 'hot';
  fold_style: 'standard' | 'flat' | 'rolled';
  ironing_enabled: boolean;
  default_instructions: string | null;
  updated_at: string;
}

export interface UtilityMeter {
  id: string;
  user_id: string;
  meter_type: 'ecg' | 'gwcl';
  meter_number: string;
  nickname: string | null;
  is_default: boolean;
  created_at: string;
}

export interface UtilityTopup {
  id: string;
  user_id: string;
  meter_id: string;
  meter_type: 'ecg' | 'gwcl';
  amount: number;
  vend_token: string | null;
  status: 'pending' | 'success' | 'failed';
  payment_reference: string | null;
  created_at: string;
  meter?: UtilityMeter;
}

export interface RoommateProfile {
  id: string;
  user_id: string;
  budget_min: number;
  budget_max: number;
  preferred_location: string | null;
  preferred_university: string | null;
  gender_preference: 'male' | 'female' | 'any';
  academic_level: string | null;
  lifestyle_notes: string | null;
  hostel_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member?: Member;
  hostel?: Hostel | null;
}

export interface OwnerVerification {
  id: string;
  owner_id: string;
  ghana_card_number: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'requires_resubmission';
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count_a: number;
  unread_count_b: number;
  created_at: string;
  other_member?: Member;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  user_id: string;
  hostel_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  hostel?: Hostel;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface Favourite {
  id: string;
  user_id: string;
  hostel_id: string;
  created_at: string;
  hostel?: Hostel;
}

export interface CheckIn {
  id: string;
  booking_id: string;
  user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  qr_code: string;
  status: 'pending' | 'checked_in' | 'checked_out';
  created_at: string;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  reference_id: string | null;
  reference_type: string | null;
  title: string;
  subtitle: string | null;
  icon_name: string | null;
  created_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  hostels_viewed: number;
  searches_performed: number;
  bookings_made: number;
  services_used: number;
  favourites_saved: number;
  logins_count: number;
  last_active_at: string;
  updated_at: string;
}

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  transaction_type: 'earn' | 'redeem' | 'bonus' | 'expire';
  points: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

export interface LoyaltyBalance {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_earned: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  updated_at: string;
}

export interface OnboardingSteps {
  id: string;
  user_id: string;
  profile_complete: boolean;
  first_search: boolean;
  first_favourite: boolean;
  first_booking: boolean;
  first_service_use: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

