import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Home, Search, ShoppingBag, MessageSquare, User, Bookmark } from 'lucide-react-native';
import { COLORS, FONT } from '@/lib/constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'web' ? 60 : 84,
          paddingBottom: Platform.OS === 'web' ? 8 : 24,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="laundry"
        options={{
          title: 'Laundry',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen name="favourites" options={{ href: null }} />
      <Tabs.Screen name="utilities" options={{ href: null }} />
    </Tabs>
  );
}
