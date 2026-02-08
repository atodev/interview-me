import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'voice_preferences';

export interface VoicePreferences {
  voiceId: string | null; // null = system default
  voiceName: string; // display name
  rate: number; // 0.5 – 2.0, default 0.95
  pitch: number; // 0.5 – 2.0, default 1.0
}

interface VoiceStore extends VoicePreferences {
  loaded: boolean;
  load: () => Promise<void>;
  setVoice: (voiceId: string | null, voiceName: string) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
}

function persist(prefs: VoicePreferences) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  voiceId: null,
  voiceName: 'System Default',
  rate: 0.95,
  pitch: 1.0,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const prefs = JSON.parse(raw) as VoicePreferences;
        set({ ...prefs, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setVoice: (voiceId, voiceName) => {
    set({ voiceId, voiceName });
    const { rate, pitch } = get();
    persist({ voiceId, voiceName, rate, pitch });
  },

  setRate: (rate) => {
    set({ rate });
    const { voiceId, voiceName, pitch } = get();
    persist({ voiceId, voiceName, rate, pitch });
  },

  setPitch: (pitch) => {
    set({ pitch });
    const { voiceId, voiceName, rate } = get();
    persist({ voiceId, voiceName, rate, pitch });
  },
}));
