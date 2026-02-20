/*
  # Seed 6 UCC Off-Campus Hostels

  1. Creates a system/demo owner profile in auth.users and profiles
  2. Inserts 6 real off-campus hostels near the University of Cape Coast (UCC), Ghana
  3. Adds hostel images (Pexels URLs), amenities, and room types for each
*/

-- Step 1: Create a demo owner profile if it doesn't already exist
DO $$
DECLARE
  v_owner_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_owner_id) THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      v_owner_id,
      'demo-owner@studentnest.gh',
      crypt('demopassword123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_owner_id) THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_owner_id, 'demo-owner@studentnest.gh', 'StudentNest Demo Owner', 'owner');
  END IF;
END $$;

-- Step 2: Insert 6 hostels near UCC
DO $$
DECLARE
  v_owner_id uuid := 'a0000000-0000-0000-0000-000000000001';
  h1 uuid; h2 uuid; h3 uuid; h4 uuid; h5 uuid; h6 uuid;
BEGIN

  -- 1. Sambridge Hostel
  INSERT INTO public.hostels (owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (v_owner_id, 'Sambridge Hostel', 'A well-known student hostel in the Kwaprow area, just minutes from UCC main campus. Offers 24-hour security, reliable water supply, and fast WiFi ideal for students.', 'Kwaprow, Cape Coast, Central Region', '800m from UCC main campus', 5.1074, -1.2849, 350, 600, 40, 12, 4.3, 28, true, true, 'active')
  RETURNING id INTO h1;

  -- 2. Round Palace Hostel
  INSERT INTO public.hostels (owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (v_owner_id, 'Round Palace Hostel', 'A private hostel in the Ayensu community offering comfortable en-suite and self-contained rooms. Known for good security and a quiet study environment.', 'Ayensu, Cape Coast, Central Region', '1.2km from UCC', 5.1050, -1.2810, 420, 750, 30, 8, 4.1, 19, false, true, 'active')
  RETURNING id INTO h2;

  -- 3. NEST Hostel UCC
  INSERT INTO public.hostels (owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (v_owner_id, 'NEST Hostel UCC', 'A modern off-campus private student hostel purpose-built for UCC students. Features en-suite rooms, high-speed internet, generator backup and a rooftop study lounge.', 'University Road, Cape Coast', '500m from UCC main gate', 5.1090, -1.2870, 500, 900, 50, 20, 4.6, 45, true, true, 'active')
  RETURNING id INTO h3;

  -- 4. Sterna Hostel UCC
  INSERT INTO public.hostels (owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (v_owner_id, 'Sterna Hostel UCC', 'Affordable student accommodation near UCC with basic amenities including running water, electricity with generator backup, and strong perimeter security.', 'Ola Estate, Cape Coast', '1.5km from UCC', 5.1035, -1.2900, 280, 450, 35, 14, 3.9, 22, false, true, 'active')
  RETURNING id INTO h4;

  -- 5. Fredmef Hostel UCC
  INSERT INTO public.hostels (owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (v_owner_id, 'Fredmef Hostel UCC', 'One of the most popular off-campus hostels among UCC students. Spacious rooms, excellent security, laundry services and a convenient trotro stop nearby.', 'Pedu Road, Cape Coast', '1km from UCC', 5.1060, -1.2880, 400, 700, 45, 16, 4.4, 38, true, true, 'active')
  RETURNING id INTO h5;

  -- 6. Baduwa Hostel
  INSERT INTO public.hostels (owner_id, name, description, address, campus_proximity, latitude, longitude, price_range_min, price_range_max, total_rooms, available_rooms, rating, review_count, featured, verified, status)
  VALUES (v_owner_id, 'Baduwa Hostel', 'A well-maintained private hostel with easy access to the University of Cape Coast. Offers a variety of room types from standard to self-contained, with a gated compound and 24-hour security.', 'Abura Road, Cape Coast', '1.8km from UCC', 5.1020, -1.2830, 320, 580, 38, 10, 4.2, 31, false, true, 'active')
  RETURNING id INTO h6;

  -- Step 3: Images (Pexels student accommodation photos)
  INSERT INTO public.hostel_images (hostel_id, image_url, caption, display_order) VALUES
    (h1, 'https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg?auto=compress&cs=tinysrgb&w=600', 'Sambridge main building', 1),
    (h1, 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600', 'Sambridge room interior', 2),
    (h2, 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600', 'Round Palace exterior', 1),
    (h2, 'https://images.pexels.com/photos/279746/pexels-photo-279746.jpeg?auto=compress&cs=tinysrgb&w=600', 'Round Palace room', 2),
    (h3, 'https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg?auto=compress&cs=tinysrgb&w=600', 'NEST Hostel entrance', 1),
    (h3, 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=600', 'NEST modern room', 2),
    (h3, 'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=600', 'NEST study lounge', 3),
    (h4, 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=600', 'Sterna exterior', 1),
    (h4, 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=600', 'Sterna room', 2),
    (h5, 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=600', 'Fredmef front', 1),
    (h5, 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=600', 'Fredmef room interior', 2),
    (h6, 'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=600', 'Baduwa compound', 1),
    (h6, 'https://images.pexels.com/photos/1428348/pexels-photo-1428348.jpeg?auto=compress&cs=tinysrgb&w=600', 'Baduwa room', 2);

  -- Step 4: Amenities
  INSERT INTO public.hostel_amenities (hostel_id, amenity) VALUES
    (h1, 'WiFi'), (h1, 'Security'), (h1, 'Water (24hr)'), (h1, 'Electricity (24hr)'), (h1, 'Generator Backup'), (h1, 'CCTV'), (h1, 'Gated Compound'),
    (h2, 'WiFi'), (h2, 'Security'), (h2, 'Water (24hr)'), (h2, 'Electricity (24hr)'), (h2, 'Generator Backup'), (h2, 'Parking'),
    (h3, 'WiFi'), (h3, 'Security'), (h3, 'Water (24hr)'), (h3, 'Electricity (24hr)'), (h3, 'Generator Backup'), (h3, 'Air Conditioning'), (h3, 'CCTV'), (h3, 'Gated Compound'), (h3, 'Study Room'), (h3, 'Laundry'),
    (h4, 'Security'), (h4, 'Water (24hr)'), (h4, 'Electricity (24hr)'), (h4, 'Generator Backup'), (h4, 'Gated Compound'),
    (h5, 'WiFi'), (h5, 'Security'), (h5, 'Water (24hr)'), (h5, 'Electricity (24hr)'), (h5, 'Generator Backup'), (h5, 'CCTV'), (h5, 'Gated Compound'), (h5, 'Laundry'), (h5, 'Parking'),
    (h6, 'WiFi'), (h6, 'Security'), (h6, 'Water (24hr)'), (h6, 'Electricity (24hr)'), (h6, 'Generator Backup'), (h6, 'Gated Compound'), (h6, 'Ceiling Fan');

  -- Step 5: Room types
  INSERT INTO public.hostel_rooms (hostel_id, room_type, price_per_night, total_units, available_units, capacity, description) VALUES
    (h1, 'Single Room', 12, 20, 6, 1, 'Cosy single room with study desk and fan'),
    (h1, 'Double Room', 18, 20, 6, 2, 'Spacious double room with shared bathroom'),
    (h2, 'Single Room', 14, 15, 4, 1, 'Standard single room'),
    (h2, 'Self-Contained', 25, 15, 4, 1, 'En-suite self-contained unit'),
    (h3, 'Single Room', 17, 25, 10, 1, 'Modern single room with AC'),
    (h3, 'Self-Contained', 30, 15, 6, 1, 'Fully self-contained with kitchen area'),
    (h3, 'Studio', 40, 10, 4, 2, 'Studio apartment for two'),
    (h4, 'Single Room', 9, 20, 7, 1, 'Basic affordable single room'),
    (h4, 'Double Room', 15, 15, 7, 2, 'Double room with ceiling fan'),
    (h5, 'Single Room', 13, 22, 8, 1, 'Single room with WiFi'),
    (h5, 'Double Room', 20, 15, 5, 2, 'Double room with laundry access'),
    (h5, 'Self-Contained', 27, 8, 3, 1, 'Self-contained with en-suite'),
    (h6, 'Single Room', 11, 18, 5, 1, 'Single room with ceiling fan'),
    (h6, 'Double Room', 16, 12, 3, 2, 'Shared double room'),
    (h6, 'Self-Contained', 22, 8, 2, 1, 'Self-contained unit');

END $$;
