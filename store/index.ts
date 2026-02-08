import { create } from 'zustand';
import { TIERS, type TierConfig, type TierName } from '@/constants/tiers';
import { aiService } from '@/services/ai';

// --- Types ---

export interface JobListing {
  raw: string;
  title: string;
  company: string;
  seniority: string;
  skills: string[];
  responsibilities: string[];
  qualifications: string[];
  industry: string;
  summary: string;
}

export interface InterviewQuestion {
  question: string;
  type: 'behavioral' | 'technical' | 'situational' | 'icebreaker';
  targetSkill: string;
  difficulty: number;
}

export interface AnswerResult {
  questionIndex: number;
  answer: string;
  score: number;
  strengths: string[];
  improvements: string[];
  idealAnswer: string;
  tip: string;
}

export interface InterviewReport {
  overallScore: number;
  summary: string;
  interviewReadiness: 'not_ready' | 'needs_work' | 'almost_there' | 'ready' | 'exceptional';
  strengths: string[];
  areasToImprove: string[];
  actionItems: string[];
  successProfile: string;
  questionResults: AnswerResult[];
}

export interface PastInterview {
  id: string;
  jobTitle: string;
  company: string;
  overallScore: number;
  completedAt: string;
  report: InterviewReport;
}

// --- Store ---

interface InterviewState {
  // User tier (synced from auth store)
  tier: TierConfig;
  streak: number;
  interviewsThisMonth: number;

  // Current interview session
  jobListing: JobListing | null;
  currentInterview: {
    questions: InterviewQuestion[];
    answers: AnswerResult[];
    style: string;
    interviewId: string | null; // DB ID for persisted interviews
  } | null;
  currentQuestionIndex: number;
  currentReport: InterviewReport | null;

  // History
  pastInterviews: PastInterview[];

  // Actions
  setTier: (tierName: TierName) => void;
  loadHistory: () => Promise<void>;
  setJobListing: (input: string, mode: 'url' | 'paste', style: string) => Promise<void>;
  submitAnswer: (questionIndex: number, answer: string) => Promise<void>;
  nextQuestion: () => void;
  finishInterview: () => Promise<void>;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  tier: TIERS.free,
  streak: 0,
  interviewsThisMonth: 0,

  jobListing: null,
  currentInterview: null,
  currentQuestionIndex: 0,
  currentReport: null,

  pastInterviews: [],

  // Actions
  setTier: (tierName) => set({ tier: TIERS[tierName] }),

  loadHistory: async () => {
    try {
      const interviews = await aiService.getHistory();
      const pastInterviews: PastInterview[] = interviews.map((i: any) => ({
        id: i.id,
        jobTitle: i.job_title,
        company: i.company ?? 'Unknown',
        overallScore: i.overall_score ?? 0,
        completedAt: i.completed_at ?? i.created_at,
        report: i.report ?? {},
      }));

      // Compute interviewsThisMonth
      const now = new Date();
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      const interviewsThisMonth = pastInterviews.filter((i) => {
        const d = new Date(i.completedAt);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      }).length;

      // Compute streak: consecutive days with at least one interview, backwards from today
      const daySet = new Set<string>();
      for (const i of pastInterviews) {
        daySet.add(new Date(i.completedAt).toISOString().split('T')[0]);
      }
      let streak = 0;
      const check = new Date(now);
      check.setHours(0, 0, 0, 0);
      while (daySet.has(check.toISOString().split('T')[0])) {
        streak++;
        check.setDate(check.getDate() - 1);
      }

      set({ pastInterviews, interviewsThisMonth, streak });
    } catch {
      // Silently fail — user may not be authenticated
    }
  },

  setJobListing: async (input, mode, style) => {
    const parsed = await aiService.parseJobListing(input, mode);
    const { questions: rawQuestions, interviewId } = await aiService.generateQuestions(
      parsed,
      style,
      get().tier.questionsPerInterview
    );

    // Ensure questions is always a proper array
    const questions = Array.isArray(rawQuestions) ? rawQuestions : [];

    if (questions.length === 0) {
      throw new Error('No interview questions were generated. Please try again.');
    }

    set({
      jobListing: parsed,
      currentInterview: {
        questions,
        answers: [],
        style,
        interviewId,
      },
      currentQuestionIndex: 0,
      currentReport: null,
    });
  },

  submitAnswer: async (questionIndex, answer) => {
    const { currentInterview, jobListing } = get();
    if (!currentInterview || !jobListing) return;

    const question = currentInterview.questions[questionIndex];
    const result = await aiService.evaluateAnswer(
      jobListing,
      question,
      answer,
      currentInterview.interviewId,
      questionIndex
    );

    set({
      currentInterview: {
        ...currentInterview,
        answers: [...currentInterview.answers, { questionIndex, answer, ...result }],
      },
    });
  },

  nextQuestion: () => {
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
    }));
  },

  finishInterview: async () => {
    const { currentInterview, jobListing, interviewsThisMonth, pastInterviews } = get();
    if (!currentInterview || !jobListing) return;

    const report = await aiService.generateReport(
      jobListing,
      currentInterview,
      currentInterview.interviewId
    );

    const pastEntry: PastInterview = {
      id: currentInterview.interviewId ?? Date.now().toString(),
      jobTitle: jobListing.title,
      company: jobListing.company,
      overallScore: report.overallScore,
      completedAt: new Date().toISOString(),
      report,
    };

    set({
      currentReport: report,
      interviewsThisMonth: interviewsThisMonth + 1,
      pastInterviews: [pastEntry, ...pastInterviews],
    });
  },

  reset: () => {
    set({
      jobListing: null,
      currentInterview: null,
      currentQuestionIndex: 0,
      currentReport: null,
    });
  },
}));
