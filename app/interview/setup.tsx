import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useInterviewStore } from '@/store';

type InputMode = 'url' | 'paste';

export default function InterviewSetupScreen() {
  const router = useRouter();
  const { setJobListing, tier } = useInterviewStore();
  const [mode, setMode] = useState<InputMode>(tier.name === 'free' ? 'paste' : 'url');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState('general');

  const interviewStyles = [
    { id: 'general', label: 'General' },
    { id: 'technical', label: 'Technical' },
    { id: 'behavioral', label: 'Behavioral' },
    { id: 'case', label: 'Case Study' },
  ];

  async function handleStart() {
    if (!input.trim()) return;
    setLoading(true);

    try {
      // Send to backend for parsing
      await setJobListing(input, mode, style);
      router.replace('/interview/session');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>New Interview</Text>
        <Text style={styles.subtitle}>Paste a job listing and we'll tailor your interview</Text>

        {/* Input Mode Toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeButton, mode === 'paste' && styles.modeActive]}
            onPress={() => { setMode('paste'); setInput(''); }}
          >
            <Text style={[styles.modeText, mode === 'paste' && styles.modeTextActive]}>
              Paste Text
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              mode === 'url' && styles.modeActive,
              tier.name === 'free' && styles.modeDisabled,
            ]}
            onPress={() => { if (tier.name !== 'free') { setMode('url'); setInput(''); } }}
          >
            <Text style={[styles.modeText, mode === 'url' && styles.modeTextActive]}>
              Paste URL {tier.name === 'free' ? '(Pro)' : ''}
            </Text>
          </Pressable>
        </View>

        {/* Input */}
        <TextInput
          style={[styles.input, mode === 'paste' && styles.inputTall]}
          placeholder={
            mode === 'url'
              ? 'Paste the link to the specific job posting...'
              : 'Paste the full job description here...'
          }
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline={mode === 'paste'}
          textAlignVertical={mode === 'paste' ? 'top' : 'center'}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Interview Style */}
        <Text style={styles.sectionLabel}>Interview Style</Text>
        <View style={styles.stylesRow}>
          {interviewStyles.map((s) => {
            const locked = !tier.interviewStyles.includes(s.id);
            return (
              <Pressable
                key={s.id}
                style={[
                  styles.styleChip,
                  style === s.id && styles.styleChipActive,
                  locked && styles.styleChipLocked,
                ]}
                onPress={() => !locked && setStyle(s.id)}
              >
                <Text
                  style={[
                    styles.styleChipText,
                    style === s.id && styles.styleChipTextActive,
                  ]}
                >
                  {s.label} {locked ? '🔒' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Start Button */}
        <Pressable
          style={[styles.startButton, (!input.trim() || loading) && styles.startDisabled]}
          onPress={handleStart}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.startText}>Start Interview</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  modeActive: {
    backgroundColor: colors.primary,
  },
  modeDisabled: {
    opacity: 0.4,
  },
  modeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  inputTall: {
    minHeight: 200,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stylesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  styleChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  styleChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  styleChipLocked: {
    opacity: 0.4,
  },
  styleChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  styleChipTextActive: {
    color: colors.primary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  startDisabled: {
    opacity: 0.5,
  },
  startText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
