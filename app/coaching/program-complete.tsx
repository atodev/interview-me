import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useCoachingStore } from '@/store/coaching';

export default function ProgramCompleteScreen() {
  const router = useRouter();
  const { activeProgram, reset } = useCoachingStore();

  function handleDone() {
    reset();
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <Text style={styles.title}>Coaching Complete!</Text>
        <Text style={styles.subtitle}>
          You've completed your 5-day coaching program
          {activeProgram?.interviews?.job_title
            ? ` for ${activeProgram.interviews.job_title}`
            : ''}
          . You're well prepared for your interview!
        </Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>5 Days</Text>
          <Text style={styles.statsLabel}>of focused practice</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>25 Questions</Text>
          <Text style={styles.statsLabel}>answered and coached</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleDone}>
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 28,
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.primary,
  },
  statsLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xl,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
