import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Animated, Easing, Text, Dimensions } from 'react-native';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { COLORS, FONT } from '@/lib/constants';
import { useRef, useEffect } from 'react';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_COUNT = 4;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

function TabIcon({
  icon: Icon,
  label,
  focused,
  color,
}: {
  icon: typeof Home;
  label: string;
  focused: boolean;
  color: string;
}) {
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const labelTranslateY = useRef(new Animated.Value(focused ? 0 : 5)).current;
  const iconTranslateY = useRef(new Animated.Value(focused ? -3 : 3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(labelOpacity, {
        toValue: focused ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(labelTranslateY, {
        toValue: focused ? 0 : 5,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(iconTranslateY, {
        toValue: focused ? -3 : 3,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={[styles.iconOuter, { width: TAB_WIDTH }]}>
      <Animated.View style={{ transform: [{ translateY: iconTranslateY }] }}>
        <Icon
          size={24}
          color={color}
          strokeWidth={focused ? 2.2 : 1.6}
          fill={focused && Icon === Heart ? color : 'none'}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.labelWrapper,
          {
            opacity: labelOpacity,
            transform: [{ translateY: labelTranslateY }],
          },
        ]}
      >
        <Text
          style={[styles.label, { color, fontFamily: FONT.semiBold }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} label="Home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Search} label="Search" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Heart} label="Saved" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="utilities" options={{ href: null }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="laundry" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // 1. Position Absolute makes it float over the content
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    
    // 2. Glassmorphic Background matching our headers
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
    
    // 3. Spacing and Shadow
    height: Platform.OS === 'web' ? 72 : 96,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'web' ? 10 : 30,
    elevation: 0, // Remove Android default harsh shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    padding: 0,
  },
  iconOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingTop: 8,
  },
  labelWrapper: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    letterSpacing: 0,
    textAlign: 'center',
  },
});