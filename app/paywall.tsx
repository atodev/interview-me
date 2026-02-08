import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { TIERS, type TierName } from '@/constants/tiers';

const FEATURES = [
  { label: 'Interviews / month', key: 'interviewsPerMonth' },
  { label: 'Questions per interview', key: 'questionsPerInterview' },
  { label: 'Voice interviewer', key: 'voiceEnabled', type: 'bool' },
  { label: 'Detailed report', key: 'reportDetail', type: 'report' },
  { label: 'URL scraping', key: 'urlScrape', type: 'bool' },
] as const;

function PlanCard({ tierName, highlighted }: { tierName: TierName; highlighted?: boolean }) {
  const tier = TIERS[tierName];
  const router = useRouter();

  return (
    <View style={[styles.planCard, highlighted && styles.planCardHighlighted]}>
      {highlighted && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}
      <Text style={styles.planName}>{tier.label}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>
          {tier.price === 0 ? 'Free' : `$${tier.price}`}
        </Text>
        {tier.price > 0 && <Text style={styles.pricePeriod}>/month</Text>}
      </View>

      <View style={styles.featureList}>
        {FEATURES.map((f) => {
          const value = tier[f.key as keyof typeof tier];
          let display: string;
          if (f.type === 'bool') display = value ? 'Yes' : 'No';
          else if (f.type === 'report')
            display = value === 'basic' ? 'Basic' : value === 'full' ? 'Full' : 'Full + Coaching';
          else display = String(value);

          return (
            <View key={f.key} style={styles.featureRow}>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureValue}>{display}</Text>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[styles.selectButton, highlighted && styles.selectButtonHighlighted]}
        onPress={() => {
          // TODO: RevenueCat purchase flow
          router.back();
        }}
      >
        <Text
          style={[styles.selectText, highlighted && styles.selectTextHighlighted]}
        >
          {tier.price === 0 ? 'Current Plan' : `Get ${tier.label}`}
        </Text>
      </Pressable>
    </View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <Text style={styles.title}>Level Up Your Prep</Text>
      <Text style={styles.subtitle}>Choose the plan that fits your interview goals</Text>

      <PlanCard tierName="free" />
      <PlanCard tierName="pro" highlighted />
      <PlanCard tierName="premium" />

      <Text style={styles.disclaimer}>
        Cancel anytime. Prices may vary by region.
      </Text>
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
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  closeText: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginVertical: spacing.md,
  },
  price: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  pricePeriod: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  featureList: {
    marginVertical: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  featureValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  selectButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonHighlighted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  selectTextHighlighted: {
    color: colors.white,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
