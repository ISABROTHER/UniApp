-- Insert 5 dummy products into market_listings table
-- Run this in your Supabase SQL Editor

INSERT INTO market_listings (seller_id, title, description, price, category, condition, campus_location, seller_phone, is_available, is_sold, created_at)
VALUES
  (
    'your-user-id-here',
    'iPhone 13 Pro 256GB - Like New',
    'Barely used iPhone 13 Pro in Sierra Blue. Comes with original box, charger, and case. No scratches, perfect condition. Battery health 98%.',
    2800,
    'phones',
    'new',
    'Science Market, UCC',
    '0244123456',
    true,
    false,
    NOW()
  ),
  (
    'your-user-id-here',
    'Dell XPS 15 Laptop - Gaming Ready',
    'Powerful Dell XPS 15 with Intel i7, 16GB RAM, 512GB SSD, NVIDIA GTX 1650. Perfect for coding, gaming, and design work. Comes with charger and sleeve.',
    4500,
    'laptops',
    'good',
    'Hall 3, Near Library',
    '0201234567',
    true,
    false,
    NOW() - INTERVAL '1 hour'
  ),
  (
    'your-user-id-here',
    'Adidas Campus 00s Sneakers - Size 42',
    'Brand new Adidas Campus 00s in Core Black/Cloud White. Never worn, still in box with tags. Got as gift but wrong size. Original receipt available.',
    450,
    'clothing',
    'new',
    'Central Market',
    '0557654321',
    true,
    false,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'your-user-id-here',
    'Mathematics Tutoring - All Levels',
    'Experienced math tutor offering personalized lessons for all levels. BSc Mathematics graduate with 3 years teaching experience. First lesson free!',
    50,
    'services',
    'new',
    'Main Campus',
    '0246789012',
    true,
    false,
    NOW() - INTERVAL '3 hours'
  ),
  (
    'your-user-id-here',
    'Homemade Jollof & Chicken - Daily Special',
    'Delicious homemade Jollof rice with grilled chicken, coleslaw, and fried plantain. Fresh ingredients, generous portions. Order before 2pm for same-day delivery!',
    25,
    'food',
    'new',
    'Hall 7 Kitchen',
    '0209876543',
    true,
    false,
    NOW() - INTERVAL '4 hours'
  );

-- Note: Replace 'your-user-id-here' with your actual Supabase user ID
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';