import { supabase } from './client';
import type { Interview, Answer } from './schema';

/**
 * Interview DB operations using service-role client (bypasses RLS).
 */
export const interviewDb = {
  /**
   * Create a new interview record when the user starts.
   */
  async create(params: {
    userId: string;
    jobTitle: string;
    company: string | null;
    seniority: string | null;
    jobListingRaw: string | null;
    jobListingParsed: Record<string, any>;
    interviewStyle: string;
    questions: any[];
  }): Promise<string> {
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        user_id: params.userId,
        job_title: params.jobTitle,
        company: params.company,
        seniority: params.seniority,
        job_listing_raw: params.jobListingRaw,
        job_listing_parsed: {
          ...params.jobListingParsed,
          questions: params.questions,
        },
        interview_style: params.interviewStyle,
        status: 'in_progress',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create interview: ${error.message}`);
    return data.id;
  },

  /**
   * Save an answer + evaluation for a question.
   */
  async saveAnswer(params: {
    interviewId: string;
    questionIndex: number;
    questionText: string;
    questionType: string;
    answerText: string;
    score: number | null;
    evaluation: Record<string, any> | null;
  }): Promise<string> {
    const { data, error } = await supabase
      .from('answers')
      .insert({
        interview_id: params.interviewId,
        question_index: params.questionIndex,
        question_text: params.questionText,
        question_type: params.questionType,
        answer_text: params.answerText,
        score: params.score,
        evaluation: params.evaluation,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save answer: ${error.message}`);
    return data.id;
  },

  /**
   * Complete an interview with its final report.
   */
  async complete(interviewId: string, overallScore: number, report: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('interviews')
      .update({
        overall_score: overallScore,
        report,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', interviewId);

    if (error) throw new Error(`Failed to complete interview: ${error.message}`);
  },

  /**
   * Get a user's interview history.
   */
  async listByUser(userId: string, limit = 30): Promise<Interview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to list interviews: ${error.message}`);
    return data ?? [];
  },

  /**
   * Get a single interview with its answers.
   */
  async getById(interviewId: string): Promise<{ interview: Interview; answers: Answer[] }> {
    const [interviewResult, answersResult] = await Promise.all([
      supabase.from('interviews').select('*').eq('id', interviewId).single(),
      supabase.from('answers').select('*').eq('interview_id', interviewId).order('question_index'),
    ]);

    if (interviewResult.error) throw new Error(`Interview not found: ${interviewResult.error.message}`);
    if (answersResult.error) throw new Error(`Answers not found: ${answersResult.error.message}`);

    return {
      interview: interviewResult.data,
      answers: answersResult.data ?? [],
    };
  },
};
