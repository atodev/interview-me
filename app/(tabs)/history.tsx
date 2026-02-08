import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useInterviewStore } from '@/store';

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? colors.scoreExcellent
      : score >= 60
        ? colors.scoreGood
        : score >= 40
          ? colors.scoreAverage
          : colors.scoreNeedsWork;

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{score}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { pastInterviews, loadHistory } = useInterviewStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interview History</Text>

      {pastInterviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No interviews yet</Text>
          <Text style={styles.emptySubtitle}>Complete your first interview to see results here</Text>
        </View>
      ) : (
        <FlatList
          data={pastInterviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/interview/report?id=${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.jobTitle}
                </Text>
                <ScoreBadge score={item.overallScore} />
              </View>
              <Text style={styles.cardCompany}>{item.company}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.completedAt).toLocaleDateString()}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
  cardCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
