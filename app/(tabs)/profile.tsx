import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useInterviewStore } from '@/store';
import { useAuthStore } from '@/store/auth';
import { TIERS } from '@/constants/tiers';

export default function ProfileScreen() {
  const router = useRouter();
  const { tier, interviewsThisMonth } = useInterviewStore();
  const { user, signOut } = useAuthStore();
  const tierConfig = TIERS[tier.name];
  const usagePercent = Math.round((interviewsThisMonth / tierConfig.interviewsPerMonth) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name ?? 'Guest'}</Text>
        <Text style={styles.userEmail}>{user?.email ?? 'Sign in to save progress'}</Text>
      </View>

      {/* Current Plan */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planLabel}>Current Plan</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{tierConfig.label}</Text>
          </View>
        </View>

        {/* Usage Bar */}
        <View style={styles.usageSection}>
          <Text style={styles.usageLabel}>
            Interviews: {interviewsThisMonth}/{tierConfig.interviewsPerMonth}
          </Text>
          <View style={styles.usageBar}>
            <View
              style={[
                styles.usageFill,
                {
                  width: `${Math.min(usagePercent, 100)}%`,
                  backgroundColor: usagePercent > 80 ? colors.warning : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {tier.name !== 'premium' && (
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.upgradeText}>Upgrade Plan</Text>
          </Pressable>
        )}
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {['Notifications', 'Voice Preference', 'Privacy', 'Help & Support'].map(
          (item) => (
            <Pressable key={item} style={styles.settingsRow}>
              <Text style={styles.settingsText}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )
        )}
      </View>

      {/* Auth */}
      {user ? (
        <Pressable
          style={[styles.upgradeButton, { backgroundColor: colors.surfaceLight, marginTop: spacing.lg }]}
          onPress={signOut}
        >
          <Text style={[styles.upgradeText, { color: colors.textSecondary }]}>Sign Out</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.upgradeButton, { marginTop: spacing.lg }]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.upgradeText}>Sign In</Text>
        </Pressable>
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  planBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  planBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  usageSection: {
    marginBottom: spacing.md,
  },
  usageLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  usageBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  upgradeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  settingsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
});
