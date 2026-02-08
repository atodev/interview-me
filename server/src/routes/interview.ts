import { Router, type Request, type Response } from 'express';
import { getAIProvider } from '../services/ai';
import { scraperService } from '../services/scraper';
import { interviewDb } from '../db/interviews';

export const interviewRoutes = Router();

function getTier(req: Request): string {
  return (req as any).userTier ?? 'free';
}

function getUserId(req: Request): string | null {
  const id = (req as any).userId;
  return id && id !== 'anonymous' ? id : null;
}

/**
 * POST /api/interview/parse
 */
interviewRoutes.post('/parse', async (req: Request, res: Response) => {
  try {
    const { input, mode } = req.body;
    if (!input || !mode) {
      return res.status(400).json({ error: 'Missing input or mode' });
    }

    let rawText = input;
    if (mode === 'url') {
      rawText = await scraperService.scrapeJobListing(input);
      rawText = `Source URL: ${input}\n\n${rawText}`;
    }

    const ai = getAIProvider(getTier(req));
    const parsed = await ai.parseJobListing(rawText);
    res.json({ ...parsed, raw: rawText });
  } catch (error) {
    console.error('Parse error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.startsWith('RATE_LIMITED')) {
      return res.status(429).json({ error: message.replace('RATE_LIMITED: ', '') });
    }
    if (message.startsWith('SCRAPE_BLOCKED')) {
      return res.status(422).json({ error: message.replace('SCRAPE_BLOCKED: ', '') });
    }
    res.status(500).json({ error: 'Failed to parse job listing' });
  }
});

/**
 * POST /api/interview/questions
 * Also creates the interview record in DB for authenticated users.
 */
interviewRoutes.post('/questions', async (req: Request, res: Response) => {
  try {
    const { jobListing, style, count } = req.body;
    if (!jobListing) {
      return res.status(400).json({ error: 'Missing job listing' });
    }

    const ai = getAIProvider(getTier(req));
    const questions = await ai.generateQuestions(jobListing, style, count);

    // Persist interview for authenticated users
    let interviewId: string | null = null;
    const userId = getUserId(req);
    if (userId) {
      try {
        interviewId = await interviewDb.create({
          userId,
          jobTitle: jobListing.title ?? 'Unknown',
          company: jobListing.company ?? null,
          seniority: jobListing.seniority ?? null,
          jobListingRaw: jobListing.raw ?? null,
          jobListingParsed: jobListing,
          interviewStyle: style ?? 'general',
          questions,
        });
      } catch (e) {
        console.warn('Failed to persist interview:', e);
      }
    }

    res.json({ questions, interviewId });
  } catch (error) {
    console.error('Questions error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.startsWith('RATE_LIMITED')) {
      return res.status(429).json({ error: message.replace('RATE_LIMITED: ', '') });
    }
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

/**
 * POST /api/interview/evaluate
 */
interviewRoutes.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { jobListing, question, answer, interviewId, questionIndex } = req.body;
    if (!jobListing || !question || !answer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ai = getAIProvider(getTier(req));
    const evaluation = await ai.evaluateAnswer(jobListing, question, answer);

    // Persist answer for authenticated users
    if (interviewId && getUserId(req)) {
      try {
        await interviewDb.saveAnswer({
          interviewId,
          questionIndex: questionIndex ?? 0,
          questionText: question.question,
          questionType: question.type,
          answerText: answer,
          score: evaluation.score ?? null,
          evaluation,
        });
      } catch (e) {
        console.warn('Failed to persist answer:', e);
      }
    }

    res.json(evaluation);
  } catch (error) {
    console.error('Evaluate error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.startsWith('RATE_LIMITED')) {
      return res.status(429).json({ error: message.replace('RATE_LIMITED: ', '') });
    }
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

/**
 * POST /api/interview/report
 */
interviewRoutes.post('/report', async (req: Request, res: Response) => {
  try {
    const { jobListing, interview, interviewId } = req.body;
    if (!jobListing || !interview) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ai = getAIProvider(getTier(req));
    const report = await ai.generateReport(jobListing, interview);

    // Complete interview in DB for authenticated users
    if (interviewId && getUserId(req)) {
      try {
        await interviewDb.complete(interviewId, report.overallScore, report);
      } catch (e) {
        console.warn('Failed to complete interview in DB:', e);
      }
    }

    res.json(report);
  } catch (error) {
    console.error('Report error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.startsWith('RATE_LIMITED')) {
      return res.status(429).json({ error: message.replace('RATE_LIMITED: ', '') });
    }
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/interview/history
 * Get user's past interviews.
 */
interviewRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const interviews = await interviewDb.listByUser(userId);
    res.json(interviews);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

/**
 * GET /api/interview/:id
 * Get a single interview with answers.
 */
interviewRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await interviewDb.getById(req.params.id);

    // Verify ownership
    if (result.interview.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(result);
  } catch (error) {
    console.error('Interview detail error:', error);
    res.status(500).json({ error: 'Failed to load interview' });
  }
});
