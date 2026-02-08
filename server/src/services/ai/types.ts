/**
 * Shared AI provider interface.
 * Both Anthropic and Gemini implement this contract.
 */

export interface ParsedJobListing {
  title: string;
  company: string;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
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

export interface AnswerEvaluation {
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
}

export interface InterviewData {
  questions: InterviewQuestion[];
  answers: { answer: string; score?: number }[];
  style: string;
}

/**
 * Every AI provider must implement this interface.
 */
export interface AIProvider {
  readonly name: string;

  parseJobListing(rawText: string): Promise<ParsedJobListing>;

  generateQuestions(
    jobListing: ParsedJobListing,
    style: string,
    count: number
  ): Promise<InterviewQuestion[]>;

  evaluateAnswer(
    jobListing: ParsedJobListing,
    question: InterviewQuestion,
    answer: string
  ): Promise<AnswerEvaluation>;

  generateReport(
    jobListing: ParsedJobListing,
    interview: InterviewData
  ): Promise<InterviewReport>;
}

/**
 * Voice provider interface — TTS and STT.
 */
export interface VoiceProvider {
  readonly name: string;

  textToSpeech(text: string, voiceId?: string): Promise<NodeJS.ReadableStream>;

  speechToText(audioBuffer: Buffer, filename: string): Promise<string>;
}
