const DUMMY_PRODUCTS: MarketListing[] = [
  {
    id: '1',
    seller_id: 'dummy-user-1',
    title: 'iPhone 13 Pro 256GB - Like New',
    description:
      'Barely used iPhone 13 Pro in Sierra Blue. Comes with original box, charger, and case. No scratches, perfect condition. Battery health 98%.',
    price: 2800,
    category: 'phones',
    condition: 'new',
    campus_location: 'Science Market, UCC',
    seller_phone: '0244123456',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),

    // ✅ Phone image (actual phone)
    image_url:
      'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800&h=800&q=80',
  },
  {
    id: '2',
    seller_id: 'dummy-user-2',
    title: 'Dell XPS 15 Laptop - Gaming Ready',
    description:
      'Powerful Dell XPS 15 with Intel i7, 16GB RAM, 512GB SSD, NVIDIA GTX 1650.',
    price: 4500,
    category: 'laptops',
    condition: 'good',
    campus_location: 'Hall 3, Near Library',
    seller_phone: '0201234567',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),

    // ✅ Laptop image
    image_url:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&h=800&q=80',
  },
  {
    id: '3',
    seller_id: 'dummy-user-3',
    title: 'Adidas Campus 00s Sneakers - Size 42',
    description:
      'Brand new Adidas Campus 00s in Core Black/Cloud White. Never worn, still in box with tags.',
    price: 450,
    category: 'clothing',
    condition: 'new',
    campus_location: 'Central Market',
    seller_phone: '0557654321',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),

    // ✅ Sneakers image
    image_url:
      'https://images.unsplash.com/photo-1528701800489-20be3c1ea3a8?auto=format&fit=crop&w=800&h=800&q=80',
  },
  {
    id: '4',
    seller_id: 'dummy-user-4',
    title: 'Mathematics Tutoring - All Levels',
    description:
      'Experienced math tutor offering personalized lessons for all levels. First lesson free!',
    price: 50,
    category: 'services',
    condition: 'new',
    campus_location: 'Main Campus',
    seller_phone: '0246789012',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),

    // ✅ “Service” image (books/study)
    image_url:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&h=800&q=80',
  },
  {
    id: '5',
    seller_id: 'dummy-user-5',
    title: 'Homemade Jollof & Chicken - Daily Special',
    description:
      'Delicious homemade Jollof rice with grilled chicken, coleslaw, and fried plantain.',
    price: 25,
    category: 'food',
    condition: 'new',
    campus_location: 'Hall 7 Kitchen',
    seller_phone: '0209876543',
    is_available: true,
    is_sold: false,
    created_at: new Date().toISOString(),

    // ✅ Food image
    image_url:
      'https://images.unsplash.com/photo-1604908177072-6f1fede7c008?auto=format&fit=crop&w=800&h=800&q=80',
  },
];