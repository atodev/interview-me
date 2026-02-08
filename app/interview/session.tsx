import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useInterviewStore } from '@/store';
import { sttService } from '@/services/stt';
import { ttsService } from '@/services/elevenlabs';
import SineWave from '@/components/SineWave';

type SessionPhase = 'intro' | 'asking' | 'listening' | 'processing' | 'complete';

export default function InterviewSessionScreen() {
  const router = useRouter();
  const {
    currentInterview,
    currentQuestionIndex,
    submitAnswer,
    nextQuestion,
    finishInterview,
    tier,
  } = useInterviewStore();

  const [phase, setPhase] = useState<SessionPhase>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waitingForFinal = useRef(false);

  const questions = currentInterview?.questions ?? [];
  const totalQuestions = questions.length || tier.questionsPerInterview;
  const question = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Handle speech recognition results (interim + final)
  const handleResult = useCallback(async (event: any) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);

    if (event.isFinal && waitingForFinal.current) {
      waitingForFinal.current = false;
      setPhase('processing');
      setVolume(0);

      try {
        await submitAnswer(currentQuestionIndex, text);

        if (currentQuestionIndex + 1 >= totalQuestions) {
          setPhase('complete');
        } else {
          nextQuestion();
          setPhase('asking');
        }
      } catch (e) {
        Alert.alert(
          'Submission Error',
          e instanceof Error ? e.message : 'Could not submit answer'
        );
        setPhase('asking');
      }
    }
  }, [currentQuestionIndex, totalQuestions, submitAnswer, nextQuestion]);

  useSpeechRecognitionEvent('result', handleResult);

  // Handle volume changes for sine wave
  useSpeechRecognitionEvent('volumechange', (event) => {
    // Normalize from (-2..10) range to (0..1)
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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sttService.cancel();
      ttsService.stop();
    };
  }, []);

  // Speak the question when entering 'asking' phase
  useEffect(() => {
    if (phase === 'asking' && question) {
      setIsSpeaking(true);
      ttsService
        .speak(question.question)
        .then(() => setIsSpeaking(false))
        .catch(() => setIsSpeaking(false));
    }
  }, [phase, currentQuestionIndex]);

  // Pulse animation for recording indicator
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
  }, [isRecording, pulseAnim]);

  async function handleStartListening() {
    try {
      // Stop TTS if still speaking
      if (isSpeaking) {
        ttsService.stop();
        setIsSpeaking(false);
      }

      await sttService.start();
      setPhase('listening');
      setIsRecording(true);
      setTranscript('');
    } catch (e) {
      Alert.alert(
        'Microphone Error',
        e instanceof Error ? e.message : 'Could not start recording'
      );
    }
  }

  function handleStopListening() {
    setIsRecording(false);
    waitingForFinal.current = true;
    sttService.stop();
    // Final result will arrive via the "result" event handler above
  }

  async function handleFinish() {
    await finishInterview();
    router.replace('/interview/report');
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentQuestionIndex + 1} / {totalQuestions}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        {phase === 'intro' && (
          <View style={styles.centered}>
            <Text style={styles.introTitle}>Ready?</Text>
            <Text style={styles.introSubtitle}>
              Your interviewer will ask {totalQuestions} questions based on the role.
              Take your time with each answer.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setPhase('asking')}
            >
              <Text style={styles.primaryButtonText}>Begin Interview</Text>
            </Pressable>
          </View>
        )}

        {phase === 'asking' && question && (
          <View style={styles.centered}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>{question.type}</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
            <Text style={styles.questionHint}>
              {isSpeaking ? 'Listening to question...' : 'Tap the mic when you\'re ready to answer'}
            </Text>
          </View>
        )}

        {phase === 'asking' && !question && (
          <View style={styles.centered}>
            <Text style={styles.introTitle}>No Questions</Text>
            <Text style={styles.introSubtitle}>
              Something went wrong generating questions. Please go back and try again.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryButtonText}>Go Back</Text>
            </Pressable>
          </View>
        )}

        {phase === 'listening' && (
          <View style={styles.centered}>
            <Text style={styles.listeningLabel}>Listening...</Text>
            <Text style={styles.transcript}>{transcript || 'Start speaking...'}</Text>
          </View>
        )}

        {phase === 'processing' && (
          <View style={styles.centered}>
            <Text style={styles.processingText}>Evaluating your answer...</Text>
          </View>
        )}

        {phase === 'complete' && (
          <View style={styles.centered}>
            <Text style={styles.completeTitle}>Interview Complete!</Text>
            <Text style={styles.completeSubtitle}>
              Great job getting through all {totalQuestions} questions.
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleFinish}>
              <Text style={styles.primaryButtonText}>See Your Report</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Sine Wave + Mic Button */}
      {(phase === 'asking' || phase === 'listening') && (
        <View style={styles.micContainer}>
          <SineWave
            volume={isRecording ? volume : isSpeaking ? 0.15 : 0.05}
            color={isRecording ? '#10B981' : '#3B82F6'}
          />
          <Pressable
            onPress={isRecording ? handleStopListening : handleStartListening}
            style={styles.micButtonOuter}
          >
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centered: {
    alignItems: 'center',
  },
  introTitle: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  introSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 28,
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
  questionHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
  listeningLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  transcript: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: spacing.lg,
  },
  processingText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
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
  micButtonOuter: {
    marginBottom: spacing.md,
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
