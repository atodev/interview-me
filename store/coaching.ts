import { create } from 'zustand';
import { coachingService } from '@/services/coaching';

interface CoachingState {
  activeProgram: any | null;
  days: any[];
  currentDay: any | null;
  currentDayAttempts: any[];
  isLoading: boolean;

  // Actions
  loadActiveProgram: () => Promise<void>;
  startProgram: (interviewId: string) => Promise<void>;
  loadDay: (dayId: string) => Promise<void>;
  startDay: (dayId: string) => Promise<void>;
  submitAttempt: (params: {
    dayId: string;
    questionIndex: number;
    attemptNumber: number;
    answer: string;
    question: any;
    jobListing: any;
  }) => Promise<any>;
  completeDay: (dayId: string, programId: string) => Promise<any>;
  reset: () => void;
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
  activeProgram: null,
  days: [],
  currentDay: null,
  currentDayAttempts: [],
  isLoading: false,

  loadActiveProgram: async () => {
    set({ isLoading: true });
    try {
      const result = await coachingService.getActiveProgram();
      set({
        activeProgram: result.program,
        days: result.days ?? [],
      });
    } catch {
      set({ activeProgram: null, days: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  startProgram: async (interviewId) => {
    set({ isLoading: true });
    try {
      const result = await coachingService.startProgram(interviewId);
      // Reload to get full program state
      const programData = await coachingService.getProgram(result.programId);
      set({
        activeProgram: programData.program,
        days: programData.days,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadDay: async (dayId) => {
    const result = await coachingService.getDay(dayId);
    set({
      currentDay: result.day,
      currentDayAttempts: result.attempts,
    });
  },

  startDay: async (dayId) => {
    await coachingService.startDay(dayId);
    const result = await coachingService.getDay(dayId);
    set({
      currentDay: result.day,
      currentDayAttempts: result.attempts,
    });
  },

  submitAttempt: async ({ dayId, questionIndex, attemptNumber, answer, question, jobListing }) => {
    const evaluation = await coachingService.submitAttempt(dayId, {
      questionIndex,
      attemptNumber,
      answer,
      question,
      jobListing,
    });

    // Refresh attempts
    const result = await coachingService.getDay(dayId);
    set({ currentDayAttempts: result.attempts });

    return evaluation;
  },

  completeDay: async (dayId, programId) => {
    const result = await coachingService.completeDay(dayId, programId);

    // Reload program
    const programData = await coachingService.getProgram(programId);
    set({
      activeProgram: programData.program,
      days: programData.days,
    });

    return result;
  },

  reset: () => {
    set({
      activeProgram: null,
      days: [],
      currentDay: null,
      currentDayAttempts: [],
    });
  },
}));
