/*
  # Seed system user, hostels, rooms, amenities, and images

  1. New Data
    - Creates a system user in auth.users for hostel ownership
    - Creates a member profile for the system user
    - 12 hostels near UCC campus with realistic Cape Coast addresses
    - Room types, amenities, and images for each hostel
    - 4 laundry providers serving UCC campus area

  2. Notes
    - System user email: system@ucchousing.app
    - Hostels cover GHS 200-1500 price range
    - Mix of verified/featured and standard hostels
    - Pexels stock photos used for hostel images
*/

DO $$
DECLARE
  sys_user_id uuid := 'a0000000-0000-0000-0000-000000000001';
  h1 uuid; h2 uuid; h3 uuid; h4 uuid; h5 uuid; h6 uuid;
  h7 uuid; h8 uuid; h9 uuid; h10 uuid; h11 uuid; h12 uuid;
BEGIN
  IF (SELECT count(*) FROM hostels) > 0 THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token
  ) VALUES (
    sys_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'system@ucchousing.app',
    crypt('SystemUser2026!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"UCC Housing System"}'::jsonb,
    false, ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    sys_user_id, sys_user_id, sys_user_id::text,
    jsonb_build_object('sub', sys_user_id::text, 'email', 'system@ucchousing.app'),
    'email', now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO members (id, full_name, email, role)
  VALUES (sys_user_id, 'UCC Housing System', 'system@ucchousing.app', 'admin')
  ON CONFLICT (id) DO NOTHING;

  -- Hostel 1: Cape Royale
  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Cape Royale Hostel', 'Modern premium hostel with fully furnished self-contained rooms, 24/7 security, and high-speed WiFi. Located just 5 minutes walk from the Science Faculty.', 'Amamoma Road, Cape Coast', '5 min walk to Science Faculty', 5.1109, -1.2901, 800, 1500, 60, 12, 4.6, 38, true, true, 'active')
  RETURNING id INTO h1;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Oasis Student Lodge', 'Affordable and clean hostel with spacious rooms and reliable utilities. Perfect for budget-conscious students near OLA area.', 'OLA Road, Cape Coast', '10 min walk to main campus', 5.1135, -1.2862, 350, 600, 80, 25, 4.2, 52, false, true, 'active')
  RETURNING id INTO h2;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Professors Villa Hostel', 'Executive-style accommodation with air-conditioned rooms, study lounges, and gym access. Opposite the main university gate.', 'University Avenue, Cape Coast', '2 min walk to main gate', 5.1098, -1.2915, 1000, 1500, 40, 5, 4.8, 27, true, true, 'active')
  RETURNING id INTO h3;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Apewosika Heights', 'Well-maintained hostel in the Apewosika junction area with generator backup and water storage. Popular among level 200+ students.', 'Apewosika Junction, Cape Coast', '15 min walk to campus', 5.1152, -1.2830, 250, 500, 100, 35, 3.9, 64, false, true, 'active')
  RETURNING id INTO h4;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Amamoma Premier Hostel', 'The closest private hostel to Science Faculty. Featuring study rooms, laundry services, and a rooftop lounge area.', 'Amamoma, Cape Coast', '3 min walk to Science Faculty', 5.1115, -1.2895, 700, 1200, 50, 8, 4.5, 41, true, true, 'active')
  RETURNING id INTO h5;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Students Hub Residences', 'Budget-friendly hostel with clean shared facilities and 24-hour security. Near Cape Coast Technical University junction.', 'CCTU Road, Cape Coast', '20 min walk to UCC', 5.1048, -1.2810, 200, 400, 120, 45, 3.7, 89, false, true, 'active')
  RETURNING id INTO h6;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Sasakawa Suites', 'Named after the Sasakawa area, this modern hostel offers en-suite rooms with kitchenettes and dedicated parking. Ideal for graduate students.', 'Sasakawa, Cape Coast', '8 min drive to campus', 5.1175, -1.2780, 600, 1000, 30, 10, 4.3, 19, false, true, 'active')
  RETURNING id INTO h7;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Kofi Annan Court', 'Premium gated community hostel with 24/7 CCTV, swimming pool access, and dedicated study halls. Walk to Arts Faculty in 5 minutes.', 'Science Junction, Cape Coast', '5 min walk to Arts Faculty', 5.1090, -1.2935, 900, 1400, 45, 7, 4.7, 33, true, true, 'active')
  RETURNING id INTO h8;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Eagle Heights', 'Newly built hostel with modern finishes, elevator access, and backup power. Located behind the new auditorium.', 'Auditorium Road, Cape Coast', '7 min walk to main campus', 5.1125, -1.2880, 500, 900, 70, 20, 4.1, 15, false, false, 'active')
  RETURNING id INTO h9;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'Palm Court Hostel', 'Serene hostel surrounded by palm trees with outdoor study areas and BBQ grounds. Perfect for students who enjoy nature.', 'Duakor Road, Cape Coast', '12 min walk to campus', 5.1065, -1.2850, 300, 550, 55, 18, 4.0, 28, false, true, 'active')
  RETURNING id INTO h10;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'The Cove Hostel', 'Trendy student hostel with co-working spaces, fiber internet, and an in-house cafeteria. Right at Amamoma roundabout.', 'Amamoma Roundabout, Cape Coast', '4 min walk to campus', 5.1102, -1.2908, 650, 1100, 48, 11, 4.4, 36, true, true, 'active')
  RETURNING id INTO h11;

  INSERT INTO hostels (id, owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (gen_random_uuid(), sys_user_id, 'OLA Junction Hostel', 'Simple and affordable rooms with basic amenities. Great location near the OLA marketplace for daily essentials.', 'OLA Junction, Cape Coast', '10 min walk to campus', 5.1140, -1.2855, 200, 350, 90, 40, 3.5, 71, false, false, 'active')
  RETURNING id INTO h12;

  -- Room types
  INSERT INTO hostel_rooms (hostel_id, room_type, price_per_month, available_count, total_count, description) VALUES
    (h1, 'Single Room', 800, 4, 20, 'Furnished single room with bed, desk, and wardrobe'),
    (h1, 'Self-Contained', 1200, 5, 25, 'En-suite room with private bathroom and kitchenette'),
    (h1, 'Double Room', 600, 3, 15, 'Shared room for two with individual desks'),
    (h2, 'Single Room', 400, 10, 30, 'Basic single room with shared bathroom'),
    (h2, 'Double Room', 350, 8, 30, 'Shared double room with bunk beds'),
    (h2, 'Chamber & Hall', 600, 7, 20, 'Separate bedroom and living area'),
    (h3, 'Self-Contained', 1500, 2, 20, 'Luxury self-contained with AC, fridge, and TV'),
    (h3, 'Studio', 1200, 3, 20, 'Open-plan studio with kitchenette and work area'),
    (h4, 'Single Room', 300, 15, 40, 'Compact single room with ceiling fan'),
    (h4, 'Double Room', 250, 12, 35, 'Shared room for two students'),
    (h4, 'Chamber & Hall', 500, 8, 25, 'Chamber and hall with separate living space'),
    (h5, 'Single Room', 700, 3, 15, 'Premium single with study desk and wardrobe'),
    (h5, 'Self-Contained', 1200, 2, 20, 'Self-contained with modern bathroom fittings'),
    (h5, 'Double Room', 550, 3, 15, 'Double room with individual study areas'),
    (h6, 'Single Room', 250, 20, 50, 'Basic single room at an affordable price'),
    (h6, 'Double Room', 200, 15, 40, 'Economy shared room'),
    (h6, 'Chamber & Hall', 400, 10, 30, 'Spacious chamber and hall setup'),
    (h7, 'Self-Contained', 1000, 5, 15, 'Fully self-contained with kitchenette'),
    (h7, 'Studio', 800, 5, 15, 'Studio apartment style for graduate students'),
    (h8, 'Self-Contained', 1400, 3, 20, 'Deluxe self-contained with AC and smart TV'),
    (h8, 'Single Room', 900, 2, 15, 'Premium single room in gated community'),
    (h8, 'Double Room', 700, 2, 10, 'Shared room in premium setting'),
    (h9, 'Single Room', 550, 8, 25, 'New single room with modern finishes'),
    (h9, 'Self-Contained', 900, 6, 25, 'Self-contained with elevator access'),
    (h9, 'Double Room', 500, 6, 20, 'Shared room with ample storage'),
    (h10, 'Single Room', 350, 8, 20, 'Single room with garden view'),
    (h10, 'Double Room', 300, 6, 20, 'Double room with outdoor access'),
    (h10, 'Chamber & Hall', 550, 4, 15, 'Chamber and hall near study pavilion'),
    (h11, 'Single Room', 700, 4, 16, 'Single room with co-working space access'),
    (h11, 'Self-Contained', 1100, 4, 16, 'Self-contained with fiber internet'),
    (h11, 'Studio', 900, 3, 16, 'Studio with cafeteria access included'),
    (h12, 'Single Room', 250, 20, 40, 'Basic single room near market'),
    (h12, 'Double Room', 200, 15, 30, 'Economy double room'),
    (h12, 'Chamber & Hall', 350, 5, 20, 'Simple chamber and hall');

  -- Amenities
  INSERT INTO hostel_amenities (hostel_id, amenity) VALUES
    (h1, 'WiFi'), (h1, 'Security'), (h1, 'Water (24hr)'), (h1, 'Electricity (24hr)'), (h1, 'Generator Backup'), (h1, 'CCTV'), (h1, 'Gated Compound'), (h1, 'Study Room'),
    (h2, 'WiFi'), (h2, 'Security'), (h2, 'Water (24hr)'), (h2, 'Gated Compound'), (h2, 'Ceiling Fan'),
    (h3, 'WiFi'), (h3, 'Security'), (h3, 'Water (24hr)'), (h3, 'Electricity (24hr)'), (h3, 'Generator Backup'), (h3, 'Air Conditioning'), (h3, 'CCTV'), (h3, 'Gym'), (h3, 'Parking'), (h3, 'Study Room'), (h3, 'Gated Compound'),
    (h4, 'WiFi'), (h4, 'Security'), (h4, 'Water (24hr)'), (h4, 'Generator Backup'), (h4, 'Ceiling Fan'), (h4, 'Borehole'),
    (h5, 'WiFi'), (h5, 'Security'), (h5, 'Water (24hr)'), (h5, 'Electricity (24hr)'), (h5, 'Generator Backup'), (h5, 'Laundry'), (h5, 'Study Room'), (h5, 'CCTV'),
    (h6, 'Security'), (h6, 'Water (24hr)'), (h6, 'Ceiling Fan'), (h6, 'Gated Compound'),
    (h7, 'WiFi'), (h7, 'Security'), (h7, 'Water (24hr)'), (h7, 'Electricity (24hr)'), (h7, 'Generator Backup'), (h7, 'Parking'), (h7, 'Kitchen'), (h7, 'Gated Compound'),
    (h8, 'WiFi'), (h8, 'Security'), (h8, 'Water (24hr)'), (h8, 'Electricity (24hr)'), (h8, 'Generator Backup'), (h8, 'Air Conditioning'), (h8, 'CCTV'), (h8, 'Swimming Pool'), (h8, 'Study Room'), (h8, 'Gated Compound'), (h8, 'Parking'),
    (h9, 'WiFi'), (h9, 'Security'), (h9, 'Water (24hr)'), (h9, 'Electricity (24hr)'), (h9, 'Generator Backup'), (h9, 'Ceiling Fan'), (h9, 'Gated Compound'),
    (h10, 'WiFi'), (h10, 'Security'), (h10, 'Water (24hr)'), (h10, 'Ceiling Fan'), (h10, 'Waste Management'), (h10, 'Common Room'),
    (h11, 'WiFi'), (h11, 'Security'), (h11, 'Water (24hr)'), (h11, 'Electricity (24hr)'), (h11, 'Generator Backup'), (h11, 'CCTV'), (h11, 'Study Room'), (h11, 'Kitchen'), (h11, 'Gated Compound'),
    (h12, 'Security'), (h12, 'Water (24hr)'), (h12, 'Ceiling Fan');

  -- Images
  INSERT INTO hostel_images (hostel_id, image_url, caption, display_order) VALUES
    (h1, 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800', 'Building Exterior', 0),
    (h1, 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800', 'Room Interior', 1),
    (h1, 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800', 'Study Area', 2),
    (h2, 'https://images.pexels.com/photos/2062426/pexels-photo-2062426.jpeg?auto=compress&cs=tinysrgb&w=800', 'Building View', 0),
    (h2, 'https://images.pexels.com/photos/439227/pexels-photo-439227.jpeg?auto=compress&cs=tinysrgb&w=800', 'Clean Room', 1),
    (h3, 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800', 'Premium Exterior', 0),
    (h3, 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800', 'Executive Room', 1),
    (h3, 'https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=800', 'Gym Facility', 2),
    (h4, 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800', 'Hostel Front', 0),
    (h4, 'https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=800', 'Room View', 1),
    (h5, 'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=800', 'Modern Building', 0),
    (h5, 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=800', 'Interior Design', 1),
    (h5, 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800', 'Study Room', 2),
    (h6, 'https://images.pexels.com/photos/2079234/pexels-photo-2079234.jpeg?auto=compress&cs=tinysrgb&w=800', 'Budget Hostel', 0),
    (h6, 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800', 'Clean Interior', 1),
    (h7, 'https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&w=800', 'Suites Exterior', 0),
    (h7, 'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg?auto=compress&cs=tinysrgb&w=800', 'Suite Interior', 1),
    (h8, 'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800', 'Gated Community', 0),
    (h8, 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800', 'Pool Area', 1),
    (h8, 'https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg?auto=compress&cs=tinysrgb&w=800', 'Deluxe Room', 2),
    (h9, 'https://images.pexels.com/photos/2119714/pexels-photo-2119714.jpeg?auto=compress&cs=tinysrgb&w=800', 'New Building', 0),
    (h9, 'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=800', 'Modern Room', 1),
    (h10, 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800', 'Palm Trees View', 0),
    (h10, 'https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=800', 'Garden View Room', 1),
    (h11, 'https://images.pexels.com/photos/2507016/pexels-photo-2507016.jpeg?auto=compress&cs=tinysrgb&w=800', 'Trendy Exterior', 0),
    (h11, 'https://images.pexels.com/photos/7534561/pexels-photo-7534561.jpeg?auto=compress&cs=tinysrgb&w=800', 'Co-working Space', 1),
    (h11, 'https://images.pexels.com/photos/279719/pexels-photo-279719.jpeg?auto=compress&cs=tinysrgb&w=800', 'Room Interior', 2),
    (h12, 'https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg?auto=compress&cs=tinysrgb&w=800', 'Simple Exterior', 0),
    (h12, 'https://images.pexels.com/photos/271631/pexels-photo-271631.jpeg?auto=compress&cs=tinysrgb&w=800', 'Basic Room', 1);

  -- Laundry providers
  INSERT INTO laundry_providers (name, phone, areas_served, rating, review_count, price_per_kg, is_active) VALUES
    ('Campus Fresh Laundry', '+233244123456', ARRAY['Amamoma', 'Science Junction', 'OLA'], 4.5, 67, 8.00, true),
    ('Quick Wash Cape Coast', '+233201987654', ARRAY['Apewosika', 'CCTU Road', 'Sasakawa'], 4.2, 43, 6.50, true),
    ('Royal Clean Services', '+233557654321', ARRAY['Amamoma', 'University Avenue', 'Duakor'], 4.7, 31, 10.00, true),
    ('EcoWash Ghana', '+233208765432', ARRAY['OLA', 'Apewosika', 'CCTU Road', 'Amamoma'], 4.0, 55, 7.00, true);

END $$;
