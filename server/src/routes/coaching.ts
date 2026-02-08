import { Router, type Request, type Response } from 'express';
import { getAIProvider } from '../services/ai';
import { coachingDb } from '../db/coaching';
import { interviewDb } from '../db/interviews';
import { SYSTEM_PROMPTS } from '../services/prompts';

export const coachingRoutes = Router();

function getTier(req: Request): string {
  return (req as any).userTier ?? 'free';
}

function getUserId(req: Request): string | null {
  const id = (req as any).userId;
  return id && id !== 'anonymous' ? id : null;
}

/**
 * POST /api/coaching/start
 * Create a coaching program from a completed interview.
 */
coachingRoutes.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const tier = getTier(req);
    if (tier !== 'premium') {
      return res.status(403).json({ error: 'Coaching is a Premium feature' });
    }

    const { interviewId } = req.body;
    if (!interviewId) return res.status(400).json({ error: 'Missing interviewId' });

    // Get the interview's job listing for question generation
    const { interview } = await interviewDb.getById(interviewId);
    if (interview.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create the coaching program
    const programId = await coachingDb.createProgram(userId, interviewId);

    // Generate day 1 questions
    const ai = getAIProvider(tier);
    const jobListing = interview.job_listing_parsed;
    const questions = await ai.generateQuestions(jobListing, 'coaching', 5);

    const dayId = await coachingDb.createDay(programId, 1, questions);

    res.json({ programId, dayId, questions });
  } catch (error) {
    console.error('Coaching start error:', error);
    res.status(500).json({ error: 'Failed to start coaching program' });
  }
});

/**
 * GET /api/coaching/active
 * Get the user's active coaching program.
 */
coachingRoutes.get('/active', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const program = await coachingDb.getActiveProgram(userId);
    if (!program) {
      return res.json({ program: null });
    }

    const { days } = await coachingDb.getProgram(program.id);
    res.json({ program, days });
  } catch (error) {
    console.error('Coaching active error:', error);
    res.status(500).json({ error: 'Failed to load coaching program' });
  }
});

/**
 * GET /api/coaching/program/:id
 * Get full program details.
 */
coachingRoutes.get('/program/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const result = await coachingDb.getProgram(req.params.id);
    if (result.program.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(result);
  } catch (error) {
    console.error('Coaching program error:', error);
    res.status(500).json({ error: 'Failed to load program' });
  }
});

/**
 * POST /api/coaching/day/:dayId/start
 * Start a coaching day.
 */
coachingRoutes.post('/day/:dayId/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { day } = await coachingDb.getDay(req.params.dayId);
    await coachingDb.startDay(req.params.dayId);
    res.json({ day });
  } catch (error) {
    console.error('Coaching day start error:', error);
    res.status(500).json({ error: 'Failed to start day' });
  }
});

/**
 * POST /api/coaching/day/:dayId/attempt
 * Submit an answer attempt and get coaching feedback.
 */
coachingRoutes.post('/day/:dayId/attempt', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { questionIndex, attemptNumber, answer, question, jobListing } = req.body;
    if (answer == null || question == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ai = getAIProvider(getTier(req));

    // Build coaching context with prior attempts
    const { attempts } = await coachingDb.getDay(req.params.dayId);
    const priorAttempts = attempts
      .filter((a) => a.question_index === questionIndex)
      .map((a) => `Attempt ${a.attempt_number}: ${a.answer_text}\nFeedback: ${JSON.stringify(a.evaluation)}`)
      .join('\n\n');

    const context = `Job: ${jobListing?.title ?? 'Unknown'} at ${jobListing?.company ?? 'Unknown'}
Question: ${question.question}
Question Type: ${question.type}
Target Skill: ${question.targetSkill}
Attempt Number: ${attemptNumber} of 3
${priorAttempts ? `\nPrior Attempts:\n${priorAttempts}` : ''}

Candidate's Answer:
${answer}`;

    const evaluation = await ai.evaluateAnswer(jobListing, question, answer);

    // Merge coaching-specific fields
    const coachEval = {
      ...evaluation,
      shouldRetry: (evaluation.score ?? 0) < 8 && attemptNumber < 3,
    };

    // Save to DB
    await coachingDb.saveAttempt({
      coachingDayId: req.params.dayId,
      questionIndex,
      attemptNumber,
      answerText: answer,
      evaluation: coachEval,
    });

    res.json(coachEval);
  } catch (error) {
    console.error('Coaching attempt error:', error);
    res.status(500).json({ error: 'Failed to evaluate attempt' });
  }
});

/**
 * POST /api/coaching/day/:dayId/complete
 * Mark a coaching day as complete and generate next day's questions.
 */
coachingRoutes.post('/day/:dayId/complete', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { programId } = req.body;
    if (!programId) return res.status(400).json({ error: 'Missing programId' });

    await coachingDb.completeDay(req.params.dayId, programId);

    // Check if program is now complete
    const { program } = await coachingDb.getProgram(programId);
    if (program.status === 'completed') {
      return res.json({ programComplete: true, nextDay: null });
    }

    // Generate next day's questions (avoiding prior questions)
    const priorQuestions = await coachingDb.getPriorQuestions(programId);
    const { interview } = await interviewDb.getById(program.interview_id);
    const jobListing = interview.job_listing_parsed;

    const ai = getAIProvider(getTier(req));

    const context = `${JSON.stringify(jobListing)}
Interview Style: coaching
Number of Questions: 5

IMPORTANT: The following questions have already been asked in prior days. Generate COMPLETELY DIFFERENT questions:
${priorQuestions.map((q: any) => `- ${q.question}`).join('\n')}`;

    const questions = await ai.generateQuestions(jobListing, 'coaching', 5);

    const nextDayId = await coachingDb.createDay(programId, program.current_day, questions);

    res.json({ programComplete: false, nextDay: { id: nextDayId, questions } });
  } catch (error) {
    console.error('Coaching day complete error:', error);
    res.status(500).json({ error: 'Failed to complete day' });
  }
});

/**
 * GET /api/coaching/day/:dayId
 * Get coaching day details with attempts.
 */
coachingRoutes.get('/day/:dayId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const result = await coachingDb.getDay(req.params.dayId);
    res.json(result);
  } catch (error) {
    console.error('Coaching day error:', error);
    res.status(500).json({ error: 'Failed to load day' });
  }
});
