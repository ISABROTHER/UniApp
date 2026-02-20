import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Animated, Text, Dimensions } from 'react-native';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { COLORS, FONT } from '@/lib/constants';
import { useRef, useEffect } from 'react';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_COUNT = 4;
// Adjust tab width to account for the 40px total horizontal padding (left: 20, right: 20)
const TAB_WIDTH = (SCREEN_WIDTH - 40) / TAB_COUNT;

function TabIcon({
  icon: Icon,
  label,
  focused,
}: {
  icon: typeof Home;
  label: string;
  focused: boolean;
}) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    // 4. Spring Physics for organic, fluid interactions
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [focused]);

  // 3. Stronger Active State Interpolations
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, -10], // Lifts icon significantly to make room for label + dot
  });
  
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1], // 1.1x Scale
  });
  
  const labelOpacity = anim;
  
  const labelTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const pillOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.12], // Subtle background pill opacity
  });

  const dotScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const color = focused ? COLORS.primary : COLORS.textTertiary;

  return (
    <View style={[styles.iconOuter, { width: TAB_WIDTH }]}>
      
      <Animated.View style={[styles.iconContainer, { transform: [{ translateY }, { scale }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.activePillBg, { opacity: pillOpacity }]} />
        <Icon
          size={24}
          color={color}
          strokeWidth={focused ? 2.5 : 2}
          fill={focused && Icon === Heart ? COLORS.primary : 'none'}
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
        <Text style={styles.label} numberOfLines={1} allowFontScaling={false}>
          {label}
        </Text>
        <Animated.View style={[styles.activeDot, { transform: [{ scale: dotScale }] }]} />
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
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Home} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Search} label="Search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Heart} label="Saved" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} />
          ),
        }}
      />
      
      {/* Hidden Screens */}
      <Tabs.Screen name="utilities" options={{ href: null }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="laundry" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // 1 & 2. Floating Liquid Glass Pill Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 20,
    right: 20,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.88)', 
    borderRadius: 36, 
    
    // Inner border for 3D depth
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.7)',
    
    // Layered soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
    
    // Overrides default safe area padding inside the element
    paddingBottom: 0, 
    paddingTop: 0,
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
    height: '100%',
  },
  
  // Icon and Active Background Pill
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillBg: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },

  // Label and Glowing Dot
  labelWrapper: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.primary,
    fontFamily: FONT.semiBold,
    fontSize: 11,
    letterSpacing: 0,
    textAlign: 'center',
    marginBottom: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    
    // Glow effect
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
});