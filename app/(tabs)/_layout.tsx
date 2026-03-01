import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, Search, Heart, MessageSquare, User } from 'lucide-react-native';
import { COLORS, FONT } from '@/lib/constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
          // Increased height so the icon and text don't overlap
          height: Platform.OS === 'ios' ? 88 : 72, 
          // Adjusted padding to center them perfectly
          paddingBottom: Platform.OS === 'ios' ? 28 : 12, 
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* These screens are part of the tab system but hidden from the bottom bar */}
      <Tabs.Screen
        name="favourites"
        options={{ href: null, title: 'Saved' }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ href: null, title: 'Bookings' }}
      />
      <Tabs.Screen
        name="laundry"
        options={{ href: null, title: 'Smart Wash' }}
      />
      <Tabs.Screen
        name="stumark"
        options={{ href: null, title: 'StuMark' }}
      />
    </Tabs>
  );
}