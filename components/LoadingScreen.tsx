import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS, FONT } from '@/lib/constants';

export default function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  text: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
