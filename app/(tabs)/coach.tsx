import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useInterviewStore } from '@/store';
import { useCoachingStore } from '@/store/coaching';

export default function CoachScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tier, pastInterviews } = useInterviewStore();
  const { activeProgram, days, isLoading, loadActiveProgram, startProgram } = useCoachingStore();
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (user && tier.name === 'premium') {
      loadActiveProgram();
    }
  }, [user, tier.name]);

  // Premium-only gate
  if (tier.name !== 'premium') {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.lockTitle}>Interview Coach</Text>
          <Text style={styles.lockSubtitle}>
            The 5-day coaching program is available on the Premium plan.
            Upgrade to get personalized daily coaching sessions.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/paywall')}>
            <Text style={styles.primaryButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Auth gate
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.lockTitle}>Sign In Required</Text>
          <Text style={styles.lockSubtitle}>
            Sign in to access the coaching program.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Active program
  if (activeProgram) {
    const currentDayData = days.find((d: any) => d.day_number === activeProgram.current_day);
    const completedDays = days.filter((d: any) => d.status === 'completed').length;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Coaching Program</Text>
        <Text style={styles.subtitle}>
          {activeProgram.interviews?.job_title} at {activeProgram.interviews?.company}
        </Text>

        {/* Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Day {activeProgram.current_day} of 5</Text>
          <View style={styles.progressDots}>
            {[1, 2, 3, 4, 5].map((day) => (
              <View
                key={day}
                style={[
                  styles.dot,
                  day <= completedDays && styles.dotCompleted,
                  day === activeProgram.current_day && styles.dotCurrent,
                ]}
              >
                <Text style={[
                  styles.dotText,
                  (day <= completedDays || day === activeProgram.current_day) && styles.dotTextActive,
                ]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Start today's session */}
        {currentDayData && (
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: '/coaching/session',
                params: {
                  dayId: currentDayData.id,
                  programId: activeProgram.id,
                  dayNumber: currentDayData.day_number,
                },
              })
            }
          >
            <Text style={styles.primaryButtonText}>
              {currentDayData.status === 'in_progress' ? 'Continue Day' : 'Start Day'} {activeProgram.current_day}
            </Text>
          </Pressable>
        )}

        {/* Completed days summary */}
        {days.filter((d: any) => d.status === 'completed').map((day: any) => (
          <View key={day.id} style={styles.dayCard}>
            <Text style={styles.dayTitle}>Day {day.day_number}</Text>
            <Text style={styles.dayStatus}>Completed</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // No active program — show start options
  const completedInterviews = pastInterviews.filter((i) => i.report);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Interview Coach</Text>
      <Text style={styles.subtitle}>
        Choose a saved interview to start a 5-day coaching program.
        Each day you'll get 5 new questions with personalized coaching.
      </Text>

      {completedInterviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Complete an interview first, then start a coaching program based on that role.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/interview/setup')}>
            <Text style={styles.primaryButtonText}>Start an Interview</Text>
          </Pressable>
        </View>
      ) : (
        completedInterviews.map((interview) => (
          <Pressable
            key={interview.id}
            style={styles.interviewCard}
            onPress={async () => {
              setStarting(true);
              try {
                await startProgram(interview.id);
              } catch (e) {
                // Handle error
              } finally {
                setStarting(false);
              }
            }}
            disabled={starting}
          >
            <View>
              <Text style={styles.interviewTitle}>{interview.jobTitle}</Text>
              <Text style={styles.interviewCompany}>{interview.company}</Text>
              <Text style={styles.interviewScore}>Score: {interview.overallScore}/100</Text>
            </View>
            <Text style={styles.startCoaching}>
              {starting ? 'Starting...' : 'Start Coaching'}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  lockTitle: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  dotTextActive: {
    color: colors.white,
  },
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  dayStatus: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  interviewCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interviewTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  interviewCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  interviewScore: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  startCoaching: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
