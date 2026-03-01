import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Bot } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS, UCC_SEMESTERS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  'Cheapest hostels near campus?',
  'Hostels with WiFi under GHS 500?',
  'When does Semester 2 start?',
  'Best rated hostels?',
  'Available single rooms?',
  'Hostels with generator backup?',
];

export default function AIAssistantScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your Student Nest campus assistant. I can help you find hostels, check semester dates, and answer questions about accommodation. How can I help you today?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseMessage = (text: string): {
    type: string;
    filters: any;
  } => {
    const lower = text.toLowerCase();

    if (lower.includes('semester') || lower.includes('calendar') || lower.includes('when does')) {
      return { type: 'semester', filters: {} };
    }

    const filters: any = {};

    if (lower.includes('cheap') || lower.includes('budget') || lower.includes('affordable')) {
      filters.sortBy = 'price_asc';
    }

    const priceMatch = lower.match(/under\s+(?:ghs\s+)?(\d+)/);
    if (priceMatch) {
      filters.maxPrice = parseInt(priceMatch[1]);
    }

    if (lower.includes('wifi') || lower.includes('internet')) {
      filters.amenity = 'WiFi';
    } else if (lower.includes('generator') || lower.includes('power') || lower.includes('backup')) {
      filters.amenity = 'Generator Backup';
    } else if (lower.includes('security') || lower.includes('safe') || lower.includes('cctv')) {
      filters.amenity = 'CCTV';
    }

    if (lower.includes('single')) {
      filters.roomType = 'Single Room';
    } else if (lower.includes('double')) {
      filters.roomType = 'Double Room';
    } else if (lower.includes('self-contained') || lower.includes('self contained')) {
      filters.roomType = 'Self-Contained';
    }

    if (lower.includes('best') || lower.includes('rated') || lower.includes('top')) {
      filters.sortBy = 'rating';
    }

    if (lower.includes('available') || lower.includes('vacancy') || lower.includes('vacant')) {
      filters.available = true;
    }

    if (lower.includes('near') || lower.includes('close') || lower.includes('proximity')) {
      filters.proximity = true;
    }

    if (Object.keys(filters).length > 0) {
      return { type: 'hostel', filters };
    }

    return { type: 'unknown', filters: {} };
  };

  const formatHostelsResponse = (hostels: any[]): string => {
    if (hostels.length === 0) {
      return 'I couldn\'t find any hostels matching your criteria. Try adjusting your requirements or ask me for general recommendations.';
    }

    let response = `I found ${hostels.length} ${hostels.length === 1 ? 'hostel' : 'hostels'} for you:\n\n`;

    hostels.slice(0, 5).forEach((hostel, index) => {
      response += `${index + 1}. ${hostel.name}\n`;
      if (hostel.price_range_min && hostel.price_range_max) {
        response += `   Price: GHS ${hostel.price_range_min} - ${hostel.price_range_max}/month\n`;
      }
      if (hostel.rating) {
        response += `   Rating: ${hostel.rating}/5`;
        if (hostel.review_count) {
          response += ` (${hostel.review_count} reviews)`;
        }
        response += '\n';
      }
      if (hostel.available_rooms !== undefined) {
        response += `   Available rooms: ${hostel.available_rooms}\n`;
      }
      if (hostel.campus_proximity) {
        response += `   Distance: ${hostel.campus_proximity}\n`;
      }
      response += '\n';
    });

    if (hostels.length > 5) {
      response += `...and ${hostels.length - 5} more! Use the search filters to explore all options.`;
    }

    return response.trim();
  };

  const formatSemesterResponse = (): string => {
    let response = 'Here are the UCC semester dates:\n\n';

    UCC_SEMESTERS.forEach((semester) => {
      response += `${semester.label}`;
      if (semester.badge) {
        response += ` (${semester.badge})`;
      }
      response += `\n`;
      response += `Start: ${new Date(semester.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
      response += `End: ${new Date(semester.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
    });

    return response.trim();
  };

  const getDefaultResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return 'Hello! How can I help you find the perfect accommodation today?';
    }

    if (lower.includes('thank')) {
      return 'You\'re welcome! Let me know if you need anything else.';
    }

    if (lower.includes('help')) {
      return 'I can help you with:\n\n- Finding hostels by price, amenities, or room type\n- Checking hostel ratings and availability\n- UCC semester dates\n- Campus proximity and location\n\nTry asking me something like "Show me affordable hostels with WiFi" or click one of the quick questions below!';
    }

    return 'I\'m not sure I understood that. I can help you find hostels, check semester dates, or answer questions about accommodation. Try clicking one of the quick questions below, or ask me about specific amenities, prices, or room types!';
  };

  const queryHostels = async (filters: any): Promise<any[]> => {
    try {
      let query = supabase
        .from('hostels')
        .select(`
          id,
          name,
          price_range_min,
          price_range_max,
          available_rooms,
          rating,
          review_count,
          campus_proximity,
          verified,
          status
        `)
        .eq('status', 'active');

      if (filters.maxPrice) {
        query = query.lte('price_range_min', filters.maxPrice);
      }

      if (filters.available) {
        query = query.gt('available_rooms', 0);
      }

      if (filters.amenity) {
        const { data: hostelIds } = await supabase
          .from('hostel_amenities')
          .select('hostel_id')
          .eq('amenity', filters.amenity);

        if (hostelIds && hostelIds.length > 0) {
          query = query.in('hostel_id', hostelIds.map((h: any) => h.hostel_id));
        } else {
          return [];
        }
      }

      if (filters.roomType) {
        const { data: roomHostelIds } = await supabase
          .from('hostel_rooms')
          .select('hostel_id')
          .eq('room_type', filters.roomType)
          .gt('available_count', 0);

        if (roomHostelIds && roomHostelIds.length > 0) {
          query = query.in('hostel_id', roomHostelIds.map((r: any) => r.hostel_id));
        } else {
          return [];
        }
      }

      if (filters.sortBy === 'rating') {
        query = query.order('rating', { ascending: false });
      } else if (filters.sortBy === 'price_asc') {
        query = query.order('price_range_min', { ascending: true });
      } else if (filters.proximity) {
        query = query.order('campus_proximity', { ascending: true });
      } else {
        query = query.order('rating', { ascending: false });
      }

      query = query.limit(10);

      const { data, error } = await query;

      if (error) {
        console.error('Query error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error querying hostels:', error);
      return [];
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    const { type, filters } = parseMessage(messageText);

    let aiResponseText = '';

    if (type === 'semester') {
      aiResponseText = formatSemesterResponse();
    } else if (type === 'hostel') {
      const hostels = await queryHostels(filters);
      aiResponseText = formatHostelsResponse(hostels);
    } else {
      aiResponseText = getDefaultResponse(messageText);
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponseText,
      isUser: false,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, aiMessage]);
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Bot size={24} color={COLORS.primary} />
            <Text style={styles.headerTitle}>Campus Assistant</Text>
          </View>
          <Text style={styles.headerSubtitle}>Powered by Student Nest AI</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {!message.isUser && (
                <View style={styles.aiAvatar}>
                  <Bot size={16} color={COLORS.white} />
                </View>
              )}
              <View style={styles.messageContent}>
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.userText : styles.aiText,
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.timestamp,
                    message.isUser ? styles.userTimestamp : styles.aiTimestamp,
                  ]}
                >
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && <TypingIndicator />}
        </ScrollView>

        <View style={styles.quickQuestionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickQuestionsContent}
          >
            {QUICK_QUESTIONS.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickQuestionChip}
                onPress={() => handleQuickQuestion(question)}
              >
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={COLORS.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Send
              size={20}
              color={inputText.trim() ? COLORS.white : COLORS.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const animatedStyle = (dot: Animated.Value) => ({
    opacity: dot,
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingIndicatorContainer}>
      <View style={styles.aiAvatar}>
        <Bot size={16} color={COLORS.white} />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, animatedStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, animatedStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, animatedStyle(dot3)]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl + 8,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  messageBubble: {
    marginBottom: SPACING.md,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: FONT.regular,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.xs,
  },
  aiText: {
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: SPACING.xs,
  },
  userTimestamp: {
    color: COLORS.textTertiary,
    textAlign: 'right',
  },
  aiTimestamp: {
    color: COLORS.textTertiary,
    marginLeft: SPACING.xs,
  },
  typingIndicatorContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.textTertiary,
  },
  quickQuestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
  },
  quickQuestionsContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  quickQuestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  quickQuestionText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.borderLight,
  },
});
