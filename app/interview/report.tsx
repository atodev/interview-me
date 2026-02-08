import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useInterviewStore } from '@/store';

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80
      ? colors.scoreExcellent
      : score >= 60
        ? colors.scoreGood
        : score >= 40
          ? colors.scoreAverage
          : colors.scoreNeedsWork;

  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={styles.scoreOutOf}>/100</Text>
    </View>
  );
}

function ReportSection({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const { currentReport, tier } = useInterviewStore();

  // Placeholder data for scaffolding
  const report = currentReport ?? {
    overallScore: 72,
    summary: 'Solid performance with room for improvement in technical depth.',
    interviewReadiness: 'almost_there' as const,
    strengths: [
      'Clear communication style',
      'Good use of examples',
      'Strong enthusiasm for the role',
    ],
    areasToImprove: [
      'Provide more specific technical details',
      'Use STAR method for behavioral answers',
      'Research company culture more thoroughly',
    ],
    actionItems: [
      'Practice explaining technical concepts to non-technical people',
      'Prepare 5 STAR-format stories from past experience',
      'Review the company blog and recent news',
    ],
    successProfile:
      'A successful candidate would demonstrate deep technical knowledge while showing strong collaboration skills and cultural alignment.',
    questionResults: [],
  };

  const readinessLabels = {
    not_ready: 'Not Ready Yet',
    needs_work: 'Needs Work',
    almost_there: 'Almost There',
    ready: 'Interview Ready',
    exceptional: 'Exceptional',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score */}
      <View style={styles.header}>
        <ScoreRing score={report.overallScore} />
        <Text style={styles.readiness}>
          {readinessLabels[report.interviewReadiness]}
        </Text>
        <Text style={styles.summary}>{report.summary}</Text>
      </View>

      {/* Strengths */}
      <ReportSection
        title="What You Did Well"
        items={report.strengths}
        color={colors.success}
      />

      {/* Areas to Improve */}
      <ReportSection
        title="Areas to Work On"
        items={report.areasToImprove}
        color={colors.warning}
      />

      {/* Action Items */}
      <ReportSection
        title="Action Items"
        items={report.actionItems}
        color={colors.primary}
      />

      {/* Success Profile */}
      {(tier.reportDetail === 'full' || tier.reportDetail === 'full_plus') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Success Looks Like</Text>
          <View style={styles.successCard}>
            <Text style={styles.successText}>{report.successProfile}</Text>
          </View>
        </View>
      )}

      {/* Per-Question Breakdown (Premium) */}
      {tier.reportDetail === 'full_plus' && report.questionResults?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Question Breakdown</Text>
          {report.questionResults.map((q: any, i: number) => (
            <View key={i} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionLabel}>Q{i + 1}</Text>
                <Text style={styles.questionScore}>{q.score}/10</Text>
              </View>
              <Text style={styles.questionText}>{q.question}</Text>
              {q.idealAnswer && (
                <View style={styles.idealAnswer}>
                  <Text style={styles.idealLabel}>Ideal Answer</Text>
                  <Text style={styles.idealText}>{q.idealAnswer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            // TODO: Share functionality
          }}
        >
          <Text style={styles.secondaryButtonText}>Share Results</Text>
        </Pressable>
      </View>
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
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  scoreRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: fontWeight.black,
  },
  scoreOutOf: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  readiness: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summary: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingRight: spacing.lg,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    marginRight: spacing.md,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  successCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  questionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  questionScore: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  questionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  idealAnswer: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  idealLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  idealText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
});
