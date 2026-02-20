import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT } from '@/lib/constants';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
}

export default function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  iconWrap: {
    marginBottom: 12,
    opacity: 0.4,
  },
  title: {
    fontFamily: FONT.heading,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
