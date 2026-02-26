/*
  # Allow anonymous browsing of active hostels

  1. Problem
    - Current RLS policies only allow `authenticated` role to view hostels, images, rooms, amenities
    - Users who are not logged in (or using anon key) cannot see any hostel data
    - This blocks the search, home, and detail screens from loading data

  2. Changes
    - Add `anon` SELECT policies on `hostels` for active hostels
    - Add `anon` SELECT policies on `hostel_images` for active hostels
    - Add `anon` SELECT policies on `hostel_rooms` for active hostels
    - Add `anon` SELECT policies on `hostel_amenities` for active hostels
    - Add `anon` SELECT policy on `hostel_reviews` for public viewing

  3. Security
    - Only active hostels are visible to anonymous users
    - Write operations remain restricted to authenticated users
    - Owner-specific data still requires authentication
*/

CREATE POLICY "Anon users can view active hostels"
  ON hostels FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "Anon users can view images of active hostels"
  ON hostel_images FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_images.hostel_id
      AND hostels.status = 'active'
    )
  );

CREATE POLICY "Anon users can view rooms of active hostels"
  ON hostel_rooms FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_rooms.hostel_id
      AND hostels.status = 'active'
    )
  );

CREATE POLICY "Anon users can view amenities of active hostels"
  ON hostel_amenities FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_amenities.hostel_id
      AND hostels.status = 'active'
    )
  );

CREATE POLICY "Anon users can view hostel reviews"
  ON hostel_reviews FOR SELECT
  TO anon
  USING (true);