import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import Slider from '@react-native-community/slider';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useVoiceStore } from '@/store/voice';

interface VoiceOption {
  identifier: string;
  name: string;
  language: string;
  quality: string;
}

export default function VoicePreferenceScreen() {
  const router = useRouter();
  const { voiceId, voiceName, rate, pitch, setVoice, setRate, setPitch } = useVoiceStore();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    Speech.getAvailableVoicesAsync().then((available) => {
      const english = available
        .filter((v) => v.language.startsWith('en'))
        .map((v) => ({
          identifier: v.identifier,
          name: v.name,
          language: v.language,
          quality: v.quality ?? 'Default',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setVoices(english);
    });
  }, []);

  const preview = useCallback((text: string, overrideVoice?: string | null) => {
    Speech.stop();
    setPreviewing(true);
    Speech.speak(text, {
      language: 'en-US',
      voice: overrideVoice !== undefined ? (overrideVoice ?? undefined) : (voiceId ?? undefined),
      rate,
      pitch,
      onDone: () => setPreviewing(false),
      onError: () => setPreviewing(false),
    });
  }, [voiceId, rate, pitch]);

  const selectVoice = (id: string | null, name: string) => {
    setVoice(id, name);
    preview('Hello, I will be your interviewer today.', id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Speech.stop(); router.back(); }}>
          <Text style={styles.backButton}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Voice Preference</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Speed */}
        <View style={styles.sliderCard}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Speed</Text>
            <Text style={styles.sliderValue}>{rate.toFixed(2)}x</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.5}
            step={0.05}
            value={rate}
            onSlidingComplete={(v) => { setRate(v); preview('This is how fast I will speak.'); }}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.surfaceLight}
            thumbTintColor={colors.primary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderEndLabel}>Slower</Text>
            <Text style={styles.sliderEndLabel}>Faster</Text>
          </View>
        </View>

        {/* Pitch */}
        <View style={styles.sliderCard}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Pitch</Text>
            <Text style={styles.sliderValue}>{pitch.toFixed(2)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={pitch}
            onSlidingComplete={(v) => { setPitch(v); preview('This is the pitch of my voice.'); }}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.surfaceLight}
            thumbTintColor={colors.primary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderEndLabel}>Lower</Text>
            <Text style={styles.sliderEndLabel}>Higher</Text>
          </View>
        </View>

        {/* Voice Selection */}
        <Text style={styles.sectionTitle}>Voice</Text>

        {/* System Default option */}
        <Pressable
          style={[styles.voiceRow, voiceId === null && styles.voiceRowSelected]}
          onPress={() => selectVoice(null, 'System Default')}
        >
          <View style={styles.voiceInfo}>
            <Text style={[styles.voiceName, voiceId === null && styles.voiceNameSelected]}>
              System Default
            </Text>
          </View>
          {voiceId === null && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>

        {/* Available voices */}
        {voices.map((v) => (
          <Pressable
            key={v.identifier}
            style={[styles.voiceRow, voiceId === v.identifier && styles.voiceRowSelected]}
            onPress={() => selectVoice(v.identifier, v.name)}
          >
            <View style={styles.voiceInfo}>
              <Text style={[styles.voiceName, voiceId === v.identifier && styles.voiceNameSelected]}>
                {v.name}
              </Text>
              <Text style={styles.voiceMeta}>
                {v.language} · {v.quality}
              </Text>
            </View>
            {voiceId === v.identifier && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  backButton: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sliderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  sliderValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderEndLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  voiceRow: {
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
  voiceRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  voiceNameSelected: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  voiceMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkmark: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.md,
  },
});
