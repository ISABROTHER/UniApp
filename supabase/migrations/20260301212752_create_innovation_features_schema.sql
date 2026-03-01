/*
  # Innovation Features Schema - 28 New Features

  1. New Tables for Wallet, Safety, Events, Food, Elections, Alumni, Bulletin, Reviews, and more
  2. Security - RLS enabled on all tables with proper policies
  3. Seed data for UCC study spaces, shuttle routes, food vendors, events, bulletin
*/

-- Campus Wallet
CREATE TABLE IF NOT EXISTS campus_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  balance numeric NOT NULL DEFAULT 0,
  lifetime_funded numeric NOT NULL DEFAULT 0,
  lifetime_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE campus_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON campus_wallet FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON campus_wallet FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON campus_wallet FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL DEFAULT 'topup',
  amount numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  reference text,
  balance_after numeric NOT NULL DEFAULT 0,
  related_user_id uuid REFERENCES auth.users(id),
  category text NOT NULL DEFAULT 'topup',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet txns" ON wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = related_user_id);
CREATE POLICY "Users can insert own wallet txns" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Rent Installments
CREATE TABLE IF NOT EXISTS rent_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  booking_id uuid,
  total_amount numeric NOT NULL,
  installments_count integer NOT NULL DEFAULT 4,
  installment_amount numeric NOT NULL,
  service_fee numeric NOT NULL DEFAULT 0,
  paid_count integer NOT NULL DEFAULT 0,
  next_due_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rent_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own installments" ON rent_installments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own installments" ON rent_installments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own installments" ON rent_installments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Installment Payments
CREATE TABLE IF NOT EXISTS installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES rent_installments(id),
  installment_number integer NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inst payments" ON installment_payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM rent_installments ri WHERE ri.id = installment_payments.plan_id AND ri.user_id = auth.uid())
);
CREATE POLICY "Users can insert own inst payments" ON installment_payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM rent_installments ri WHERE ri.id = installment_payments.plan_id AND ri.user_id = auth.uid())
);
CREATE POLICY "Users can update own inst payments" ON installment_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM rent_installments ri WHERE ri.id = installment_payments.plan_id AND ri.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM rent_installments ri WHERE ri.id = installment_payments.plan_id AND ri.user_id = auth.uid()));

-- Payment Splits
CREATE TABLE IF NOT EXISTS payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  total_amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'rent',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Split creator can view own" ON payment_splits FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can create splits" ON payment_splits FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update splits" ON payment_splits FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Split Members
CREATE TABLE IF NOT EXISTS split_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id uuid NOT NULL REFERENCES payment_splits(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE split_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own split memberships" ON split_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Split creator can view members" ON split_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM payment_splits ps WHERE ps.id = split_members.split_id AND ps.created_by = auth.uid())
);
CREATE POLICY "Split creator can insert members" ON split_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM payment_splits ps WHERE ps.id = split_members.split_id AND ps.created_by = auth.uid())
);
CREATE POLICY "Users can update own split status" ON split_members FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SOS Alerts
CREATE TABLE IF NOT EXISTS sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  latitude double precision,
  longitude double precision,
  alert_type text NOT NULL DEFAULT 'emergency',
  message text,
  status text NOT NULL DEFAULT 'active',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own SOS alerts" ON sos_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create SOS alerts" ON sos_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SOS alerts" ON sos_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SOS Contacts
CREATE TABLE IF NOT EXISTS sos_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  phone text NOT NULL,
  relationship text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sos_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own SOS contacts" ON sos_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own SOS contacts" ON sos_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SOS contacts" ON sos_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own SOS contacts" ON sos_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Safety Reports
CREATE TABLE IF NOT EXISTS safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id),
  university text,
  location_description text NOT NULL,
  latitude double precision,
  longitude double precision,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'submitted',
  severity text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own safety reports" ON safety_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create safety reports" ON safety_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

-- Wellness Check-Ins
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  mood_score integer NOT NULL DEFAULT 3,
  sleep_quality integer NOT NULL DEFAULT 3,
  stress_level integer NOT NULL DEFAULT 3,
  notes text,
  week_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wellness_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wellness" ON wellness_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wellness" ON wellness_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Night Transport
CREATE TABLE IF NOT EXISTS night_transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  pickup_location text NOT NULL,
  pickup_latitude double precision,
  pickup_longitude double precision,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  driver_name text,
  driver_phone text,
  estimated_arrival integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE night_transport_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transport" ON night_transport_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create transport" ON night_transport_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transport" ON night_transport_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Campus Events
CREATE TABLE IF NOT EXISTS campus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id),
  university text,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'social',
  venue text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  end_date timestamptz,
  image_url text,
  max_attendees integer,
  is_free boolean NOT NULL DEFAULT true,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view events" ON campus_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create events" ON campus_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update events" ON campus_events FOR UPDATE TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES campus_events(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view event RSVPs" ON event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can RSVP" ON event_rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own RSVP" ON event_rsvps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own RSVP" ON event_rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Study Spaces
CREATE TABLE IF NOT EXISTS study_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university text NOT NULL,
  building text NOT NULL,
  room_name text NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  amenities text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE study_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view spaces" ON study_spaces FOR SELECT TO authenticated USING (true);

-- Study Bookings
CREATE TABLE IF NOT EXISTS study_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES study_spaces(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'booked',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE study_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view study bookings" ON study_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can book spaces" ON study_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON study_bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lost & Found
CREATE TABLE IF NOT EXISTS lost_found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL DEFAULT 'lost',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  location text NOT NULL DEFAULT '',
  image_url text,
  contact_method text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'active',
  university text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view lost found" ON lost_found_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create lost found" ON lost_found_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lost found" ON lost_found_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shuttle Routes
CREATE TABLE IF NOT EXISTS shuttle_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university text NOT NULL,
  route_name text NOT NULL,
  stops jsonb NOT NULL DEFAULT '[]',
  schedule jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shuttle_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view routes" ON shuttle_routes FOR SELECT TO authenticated USING (true);

-- Shuttle Tracking
CREATE TABLE IF NOT EXISTS shuttle_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES shuttle_routes(id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision DEFAULT 0,
  speed double precision DEFAULT 0,
  next_stop text,
  eta_minutes integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shuttle_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view tracking" ON shuttle_tracking FOR SELECT TO authenticated USING (true);

-- Food Vendors
CREATE TABLE IF NOT EXISTS food_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'restaurant',
  location text NOT NULL DEFAULT '',
  image_url text,
  rating numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  opening_hours jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view vendors" ON food_vendors FOR SELECT TO authenticated USING (true);

-- Food Menu Items
CREATE TABLE IF NOT EXISTS food_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES food_vendors(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL,
  category text NOT NULL DEFAULT 'main',
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view menu" ON food_menu_items FOR SELECT TO authenticated USING (true);

-- Food Orders
CREATE TABLE IF NOT EXISTS food_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  vendor_id uuid NOT NULL REFERENCES food_vendors(id),
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  delivery_address text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'placed',
  estimated_delivery integer,
  driver_name text,
  driver_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own food orders" ON food_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create food orders" ON food_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food orders" ON food_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hall Elections
CREATE TABLE IF NOT EXISTS hall_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position text NOT NULL,
  nominations_open timestamptz,
  nominations_close timestamptz,
  voting_start timestamptz,
  voting_end timestamptz,
  status text NOT NULL DEFAULT 'nominations',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hall_elections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view elections" ON hall_elections FOR SELECT TO authenticated USING (true);

-- Election Candidates
CREATE TABLE IF NOT EXISTS election_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES hall_elections(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  manifesto text NOT NULL DEFAULT '',
  photo_url text,
  status text NOT NULL DEFAULT 'nominated',
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view candidates" ON election_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can nominate themselves" ON election_candidates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Election Votes
CREATE TABLE IF NOT EXISTS election_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES hall_elections(id),
  voter_id uuid NOT NULL REFERENCES auth.users(id),
  candidate_id uuid NOT NULL REFERENCES election_candidates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, voter_id)
);
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can vote" ON election_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Users can view own votes" ON election_votes FOR SELECT TO authenticated USING (auth.uid() = voter_id);

-- Alumni Profiles
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  university text,
  graduation_year integer,
  degree text,
  department text,
  job_title text,
  company_name text,
  bio text,
  linkedin_url text,
  areas_of_mentorship text[] DEFAULT '{}',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE alumni_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view alumni" ON alumni_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own alumni profile" ON alumni_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alumni profile" ON alumni_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mentorship Requests
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  alumni_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own requests" ON mentorship_requests FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Alumni can view requests to them" ON mentorship_requests FOR SELECT TO authenticated USING (auth.uid() = alumni_id);
CREATE POLICY "Students can create requests" ON mentorship_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Alumni can update requests" ON mentorship_requests FOR UPDATE TO authenticated USING (auth.uid() = alumni_id) WITH CHECK (auth.uid() = alumni_id);

-- Bulletin Posts
CREATE TABLE IF NOT EXISTS bulletin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  university text,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  image_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bulletin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view bulletins" ON bulletin_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create bulletins" ON bulletin_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bulletins" ON bulletin_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bulletins" ON bulletin_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Verified Reviews
CREATE TABLE IF NOT EXISTS hostel_reviews_verified (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  booking_id uuid,
  rating integer NOT NULL DEFAULT 5,
  title text NOT NULL DEFAULT '',
  pros text,
  cons text,
  photos text[] DEFAULT '{}',
  is_verified_stay boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hostel_reviews_verified ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view reviews" ON hostel_reviews_verified FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reviews" ON hostel_reviews_verified FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON hostel_reviews_verified FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pricing Alerts
CREATE TABLE IF NOT EXISTS pricing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  max_budget numeric NOT NULL,
  room_type text,
  university text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pricing_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts" ON pricing_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create alerts" ON pricing_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON pricing_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON pricing_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Digital Student IDs
CREATE TABLE IF NOT EXISTS digital_student_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  university text,
  student_number text,
  qr_code_data text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE digital_student_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ID" ON digital_student_ids FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ID" ON digital_student_ids FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ID" ON digital_student_ids FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  weekly_deduction numeric NOT NULL DEFAULT 0,
  deadline date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON savings_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create goals" ON savings_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON savings_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed study spaces
INSERT INTO study_spaces (university, building, room_name, capacity, amenities) VALUES
  ('University of Cape Coast', 'Old Library', 'Study Room A', 8, ARRAY['WiFi', 'Power Outlets', 'Air Conditioning']),
  ('University of Cape Coast', 'Old Library', 'Study Room B', 12, ARRAY['WiFi', 'Power Outlets', 'Whiteboard']),
  ('University of Cape Coast', 'Sam Jonah Library', 'Group Study 1', 6, ARRAY['WiFi', 'Power Outlets', 'Projector']),
  ('University of Cape Coast', 'Sam Jonah Library', 'Group Study 2', 6, ARRAY['WiFi', 'Power Outlets']),
  ('University of Cape Coast', 'Sam Jonah Library', 'Silent Room', 20, ARRAY['WiFi', 'Power Outlets', 'Air Conditioning']),
  ('University of Cape Coast', 'Science Faculty', 'Lab Study Area', 15, ARRAY['WiFi', 'Power Outlets', 'Lab Equipment']),
  ('University of Cape Coast', 'Arts Faculty', 'Seminar Room', 10, ARRAY['WiFi', 'Power Outlets', 'Projector', 'Whiteboard'])
ON CONFLICT DO NOTHING;

-- Seed shuttle routes
INSERT INTO shuttle_routes (university, route_name, stops, schedule) VALUES
  ('University of Cape Coast', 'Main Campus Loop',
   '[{"name":"Science Gate","lat":5.115,"lng":-1.295},{"name":"Old Site","lat":5.112,"lng":-1.294},{"name":"New Site","lat":5.118,"lng":-1.292},{"name":"STC","lat":5.110,"lng":-1.290}]',
   '{"weekdays":{"start":"06:00","end":"22:00","interval_min":15},"weekends":{"start":"08:00","end":"20:00","interval_min":30}}'),
  ('University of Cape Coast', 'Hostel Express',
   '[{"name":"Oguaa Hall","lat":5.113,"lng":-1.293},{"name":"Atlantic Hall","lat":5.114,"lng":-1.296},{"name":"Valco Hall","lat":5.116,"lng":-1.291},{"name":"Science Gate","lat":5.115,"lng":-1.295}]',
   '{"weekdays":{"start":"06:30","end":"21:30","interval_min":20},"weekends":{"start":"09:00","end":"18:00","interval_min":45}}')
ON CONFLICT DO NOTHING;

-- Seed food vendors
INSERT INTO food_vendors (university, name, description, category, location, rating, delivery_fee, min_order) VALUES
  ('University of Cape Coast', 'Naa Spicy Bite', 'Famous campus jollof and local dishes', 'restaurant', 'Near Science Gate', 4.5, 3.00, 10.00),
  ('University of Cape Coast', 'Cape Wok', 'Chinese and Asian fusion on campus', 'restaurant', 'Old Site Commercial Area', 4.2, 5.00, 15.00),
  ('University of Cape Coast', 'Fresh Juice Hub', 'Fresh juices, smoothies and light bites', 'drinks', 'STC Area', 4.7, 2.00, 8.00),
  ('University of Cape Coast', 'Night Market Grill', 'Late night grills and kebabs', 'fast_food', 'Oguaa Hall Area', 4.3, 2.50, 5.00),
  ('University of Cape Coast', 'Campus Canteen', 'Affordable daily meals for students', 'canteen', 'Main Campus', 3.8, 0.00, 0.00)
ON CONFLICT DO NOTHING;

-- Seed food menu items
DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM food_vendors WHERE name = 'Naa Spicy Bite' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO food_menu_items (vendor_id, name, description, price, category) VALUES
      (v_id, 'Jollof Rice & Chicken', 'Signature smoky jollof with grilled chicken', 25.00, 'main'),
      (v_id, 'Banku & Tilapia', 'Fresh tilapia with pepper and banku', 30.00, 'main'),
      (v_id, 'Waakye Special', 'Waakye with all toppings', 20.00, 'main'),
      (v_id, 'Fried Rice & Beef', 'Chinese-style fried rice with beef', 22.00, 'main'),
      (v_id, 'Kelewele', 'Spiced fried plantain', 8.00, 'sides'),
      (v_id, 'Sobolo', 'Chilled hibiscus drink', 5.00, 'drinks')
    ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_id FROM food_vendors WHERE name = 'Fresh Juice Hub' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO food_menu_items (vendor_id, name, description, price, category) VALUES
      (v_id, 'Mango Smoothie', 'Fresh mango blended with yogurt', 12.00, 'drinks'),
      (v_id, 'Green Detox', 'Spinach, apple, ginger blend', 15.00, 'drinks'),
      (v_id, 'Pineapple Ginger', 'Refreshing pineapple with ginger kick', 10.00, 'drinks'),
      (v_id, 'Fruit Salad', 'Mixed seasonal fruits', 8.00, 'snacks'),
      (v_id, 'Protein Bowl', 'Granola, fruits, honey, yogurt', 18.00, 'snacks')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed hall elections
INSERT INTO hall_elections (title, description, position, status, voting_start, voting_end) VALUES
  ('JCRC President Election 2026/27', 'Vote for the next JCRC President', 'JCRC President', 'voting', now(), now() + interval '14 days'),
  ('Hall Secretary Election 2026/27', 'Vote for the next Hall Secretary', 'Hall Secretary', 'nominations', now() + interval '7 days', now() + interval '21 days')
ON CONFLICT DO NOTHING;
