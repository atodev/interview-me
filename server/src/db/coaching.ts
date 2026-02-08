import { supabase } from './client';

export const coachingDb = {
  /**
   * Create a new coaching program linked to a completed interview.
   */
  async createProgram(userId: string, interviewId: string): Promise<string> {
    const { data, error } = await supabase
      .from('coaching_programs')
      .insert({
        user_id: userId,
        interview_id: interviewId,
        current_day: 1,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create coaching program: ${error.message}`);
    return data.id;
  },

  /**
   * Create a coaching day with its questions.
   */
  async createDay(programId: string, dayNumber: number, questions: any[]): Promise<string> {
    const { data, error } = await supabase
      .from('coaching_days')
      .insert({
        program_id: programId,
        day_number: dayNumber,
        questions,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create coaching day: ${error.message}`);
    return data.id;
  },

  /**
   * Start a coaching day (mark as in_progress).
   */
  async startDay(dayId: string): Promise<void> {
    const { error } = await supabase
      .from('coaching_days')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', dayId);

    if (error) throw new Error(`Failed to start day: ${error.message}`);
  },

  /**
   * Save an attempt for a coaching question.
   */
  async saveAttempt(params: {
    coachingDayId: string;
    questionIndex: number;
    attemptNumber: number;
    answerText: string;
    evaluation: Record<string, any>;
  }): Promise<string> {
    const { data, error } = await supabase
      .from('coaching_attempts')
      .insert({
        coaching_day_id: params.coachingDayId,
        question_index: params.questionIndex,
        attempt_number: params.attemptNumber,
        answer_text: params.answerText,
        evaluation: params.evaluation,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save attempt: ${error.message}`);
    return data.id;
  },

  /**
   * Complete a coaching day and advance the program.
   */
  async completeDay(dayId: string, programId: string): Promise<void> {
    // Mark day complete
    await supabase
      .from('coaching_days')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', dayId);

    // Get current program state
    const { data: program } = await supabase
      .from('coaching_programs')
      .select('current_day')
      .eq('id', programId)
      .single();

    if (!program) return;

    if (program.current_day >= 5) {
      // Program complete
      await supabase
        .from('coaching_programs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', programId);
    } else {
      // Advance to next day
      await supabase
        .from('coaching_programs')
        .update({ current_day: program.current_day + 1 })
        .eq('id', programId);
    }
  },

  /**
   * Get a program with its days and attempts.
   */
  async getProgram(programId: string) {
    const [programResult, daysResult] = await Promise.all([
      supabase.from('coaching_programs').select('*, interviews(*)').eq('id', programId).single(),
      supabase
        .from('coaching_days')
        .select('*, coaching_attempts(*)')
        .eq('program_id', programId)
        .order('day_number'),
    ]);

    if (programResult.error) throw new Error(`Program not found: ${programResult.error.message}`);

    return {
      program: programResult.data,
      days: daysResult.data ?? [],
    };
  },

  /**
   * Get a user's active coaching program (if any).
   */
  async getActiveProgram(userId: string) {
    const { data } = await supabase
      .from('coaching_programs')
      .select('*, interviews(job_title, company)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  },

  /**
   * Get all programs for a user.
   */
  async listPrograms(userId: string) {
    const { data, error } = await supabase
      .from('coaching_programs')
      .select('*, interviews(job_title, company)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw new Error(`Failed to list programs: ${error.message}`);
    return data ?? [];
  },

  /**
   * Get all previously asked questions across a program's days.
   */
  async getPriorQuestions(programId: string): Promise<any[]> {
    const { data } = await supabase
      .from('coaching_days')
      .select('questions')
      .eq('program_id', programId)
      .eq('status', 'completed');

    if (!data) return [];
    return data.flatMap((d) => d.questions ?? []);
  },

  /**
   * Get a single coaching day with its attempts.
   */
  async getDay(dayId: string) {
    const [dayResult, attemptsResult] = await Promise.all([
      supabase.from('coaching_days').select('*').eq('id', dayId).single(),
      supabase
        .from('coaching_attempts')
        .select('*')
        .eq('coaching_day_id', dayId)
        .order('question_index')
        .order('attempt_number'),
    ]);

    if (dayResult.error) throw new Error(`Day not found: ${dayResult.error.message}`);

    return {
      day: dayResult.data,
      attempts: attemptsResult.data ?? [],
    };
  },
};
