import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useCoachingStore } from '@/store/coaching';
import { sttService } from '@/services/stt';
import { ttsService } from '@/services/elevenlabs';
import SineWave from '@/components/SineWave';

type Phase = 'loading' | 'asking' | 'listening' | 'processing' | 'feedback' | 'day_complete';

export default function CoachingSessionScreen() {
  const router = useRouter();
  const { dayId, programId, dayNumber } = useLocalSearchParams<{
    dayId: string;
    programId: string;
    dayNumber: string;
  }>();

  const {
    currentDay,
    currentDayAttempts,
    loadDay,
    startDay,
    submitAttempt,
    completeDay,
  } = useCoachingStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [lastEvaluation, setLastEvaluation] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waitingForFinal = useRef(false);

  const questions = currentDay?.questions ?? [];
  const question = questions[questionIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((questionIndex + 1) / totalQuestions) * 100 : 0;

  // Get the job listing from the program for evaluations
  const jobListing = useCoachingStore((s) => s.activeProgram?.interviews?.job_listing_parsed);

  // Handle speech recognition results (interim + final)
  const handleResult = useCallback(async (event: any) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);

    if (event.isFinal && waitingForFinal.current) {
      waitingForFinal.current = false;
      setPhase('processing');
      setVolume(0);

      try {
        const evaluation = await submitAttempt({
          dayId: dayId!,
          questionIndex,
          attemptNumber,
          answer: text,
          question,
          jobListing,
        });

        setLastEvaluation(evaluation);
        setPhase('feedback');
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to process answer');
        setPhase('asking');
      }
    }
  }, [questionIndex, attemptNumber, dayId, question, jobListing, submitAttempt]);

  useSpeechRecognitionEvent('result', handleResult);

  // Handle volume changes for sine wave
  useSpeechRecognitionEvent('volumechange', (event) => {
    setVolume(Math.max(0, Math.min(1, event.value / 10)));
  });

  // Handle speech recognition errors
  useSpeechRecognitionEvent('error', (event) => {
    if (event.error !== 'aborted') {
      setIsRecording(false);
      waitingForFinal.current = false;
      setVolume(0);
      Alert.alert('Recognition Error', event.message || 'Speech recognition failed');
      setPhase('asking');
    }
  });

  useEffect(() => {
    if (dayId) {
      loadDay(dayId).then(() => {
        startDay(dayId).then(() => {
          setPhase('asking');
        });
      });
    }
  }, [dayId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sttService.cancel();
      ttsService.stop();
    };
  }, []);

  // Speak question when entering asking phase
  useEffect(() => {
    if (phase === 'asking' && question) {
      setIsSpeaking(true);
      ttsService
        .speak(question.question)
        .then(() => setIsSpeaking(false))
        .catch(() => setIsSpeaking(false));
    }
  }, [phase, questionIndex, attemptNumber]);

  // Pulse animation
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording]);

  async function handleStartListening() {
    try {
      if (isSpeaking) {
        ttsService.stop();
        setIsSpeaking(false);
      }
      await sttService.start();
      setPhase('listening');
      setIsRecording(true);
      setTranscript('');
    } catch (e) {
      Alert.alert('Microphone Error', e instanceof Error ? e.message : 'Could not start recording');
    }
  }

  function handleStopListening() {
    setIsRecording(false);
    waitingForFinal.current = true;
    sttService.stop();
  }

  function handleRetry() {
    setAttemptNumber(attemptNumber + 1);
    setLastEvaluation(null);
    setPhase('asking');
  }

  function handleNextQuestion() {
    if (questionIndex + 1 >= totalQuestions) {
      setPhase('day_complete');
    } else {
      setQuestionIndex(questionIndex + 1);
      setAttemptNumber(1);
      setLastEvaluation(null);
      setPhase('asking');
    }
  }

  async function handleDayComplete() {
    try {
      const result = await completeDay(dayId!, programId!);
      if (result.programComplete) {
        router.replace('/coaching/program-complete');
      } else {
        router.back();
      }
    } catch {
      router.back();
    }
  }

  if (phase === 'loading') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing your coaching session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.dayLabel}>Day {dayNumber} Coaching</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {questionIndex + 1} / {totalQuestions}
          {attemptNumber > 1 ? ` (Attempt ${attemptNumber})` : ''}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {phase === 'asking' && question && (
          <View style={styles.centered}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>{question.type}</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
            <Text style={styles.hint}>
              {isSpeaking ? 'Listening to question...' : 'Tap the mic when ready to answer'}
            </Text>
          </View>
        )}

        {phase === 'listening' && (
          <View style={styles.centered}>
            <Text style={styles.listeningLabel}>Listening...</Text>
            <Text style={styles.hint}>{transcript || 'Start speaking...'}</Text>
          </View>
        )}

        {phase === 'processing' && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>Your coach is reviewing your answer...</Text>
          </View>
        )}

        {phase === 'feedback' && lastEvaluation && (
          <View>
            {/* Score */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={[
                styles.scoreValue,
                { color: lastEvaluation.score >= 7 ? colors.success : lastEvaluation.score >= 5 ? colors.warning : colors.accent },
              ]}>
                {lastEvaluation.score}/10
              </Text>
            </View>

            {/* Feedback */}
            {lastEvaluation.feedback && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackLabel}>Coach Feedback</Text>
                <Text style={styles.feedbackText}>{lastEvaluation.feedback}</Text>
              </View>
            )}

            {/* Strengths */}
            {lastEvaluation.strengths?.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackLabel}>What You Did Well</Text>
                {lastEvaluation.strengths.map((s: string, i: number) => (
                  <Text key={i} style={styles.bulletItem}>• {s}</Text>
                ))}
              </View>
            )}

            {/* Improvements */}
            {lastEvaluation.improvements?.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackLabel}>Areas to Improve</Text>
                {lastEvaluation.improvements.map((s: string, i: number) => (
                  <Text key={i} style={styles.bulletItem}>• {s}</Text>
                ))}
              </View>
            )}

            {/* Ideal Answer */}
            {lastEvaluation.idealAnswer && (
              <View style={styles.idealCard}>
                <Text style={styles.feedbackLabel}>Ideal Answer</Text>
                <Text style={styles.idealText}>{lastEvaluation.idealAnswer}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              {lastEvaluation.shouldRetry && attemptNumber < 3 && (
                <Pressable style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryText}>Try Again</Text>
                </Pressable>
              )}
              <Pressable style={styles.nextButton} onPress={handleNextQuestion}>
                <Text style={styles.nextText}>
                  {questionIndex + 1 >= totalQuestions ? 'Finish Day' : 'Next Question'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === 'day_complete' && (
          <View style={styles.centered}>
            <Text style={styles.completeTitle}>Day {dayNumber} Complete!</Text>
            <Text style={styles.completeSubtitle}>
              Great work! Come back tomorrow for your next coaching session.
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleDayComplete}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Sine Wave + Mic Button */}
      {(phase === 'asking' || phase === 'listening') && (
        <View style={styles.micContainer}>
          <SineWave
            volume={isRecording ? volume : isSpeaking ? 0.15 : 0.05}
            color={isRecording ? '#10B981' : '#3B82F6'}
          />
          <Pressable onPress={isRecording ? handleStopListening : handleStartListening}>
            <Animated.View
              style={[
                styles.micButton,
                isRecording && styles.micButtonActive,
                { transform: [{ scale: isRecording ? pulseAnim : 1 }] },
              ]}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
            </Animated.View>
          </Pressable>
          <Text style={styles.micLabel}>
            {isRecording ? 'Tap to finish' : 'Tap to answer'}
          </Text>
        </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  dayLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  questionBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  questionBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
  listeningLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  processingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: fontWeight.black,
  },
  feedbackCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  feedbackText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  bulletItem: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 4,
  },
  idealCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  idealText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  retryButton: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  nextButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  nextText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  completeTitle: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  completeSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 28,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  micContainer: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  micButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  micIcon: {
    fontSize: 32,
  },
  micLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
