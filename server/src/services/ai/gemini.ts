import { SYSTEM_PROMPTS } from '../prompts';
import type {
  AIProvider,
  ParsedJobListing,
  InterviewQuestion,
  AnswerEvaluation,
  InterviewReport,
  InterviewData,
} from './types';

// gemini-2.0-flash: 1,500 free req/day — use for free tier
// gemini-2.5-flash: 20 free req/day — only viable with billing enabled
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const IS_THINKING_MODEL = MODEL.includes('2.5');
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildJobContext(job: ParsedJobListing): string {
  return `Role: ${job.title ?? 'Unknown'} at ${job.company ?? 'Unknown'}
Seniority: ${job.seniority ?? 'unknown'}
Key Skills: ${(job.skills ?? []).join(', ') || 'Not specified'}
Summary: ${job.summary ?? 'No summary available'}`;
}

/**
 * Extract clean JSON from Gemini response.
 * Gemini sometimes wraps JSON in ```json blocks — strip those.
 */
function extractJson(text: string): string {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return cleaned;
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
  }

  private async generate(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
    const url = `${API_BASE}/${MODEL}:generateContent?key=${this.apiKey}`;
    const body = JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        responseMimeType: 'application/json',
        // Only thinking models (2.5+) need a thinkingConfig budget
        ...(IS_THINKING_MODEL && {
          thinkingConfig: { thinkingBudget: 1024 },
        }),
      },
    });

    // Retry with backoff on 429 (Gemini free tier: 20 req/min)
    const MAX_RETRIES = 3;
    let response: Response | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.status !== 429) break;

      // Wait before retrying: 2s, 4s, 8s
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.warn(`Gemini 429 — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, delay));
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response';
      console.error(`Gemini API error ${response?.status}:`, errorText);

      if (response?.status === 429) {
        // Parse retry delay from error body if available
        try {
          const errorData = JSON.parse(errorText);
          const retryInfo = errorData.error?.details?.find(
            (d: { '@type': string }) => d['@type']?.includes('RetryInfo')
          );
          const retryDelay = retryInfo?.retryDelay ?? 'unknown';
          throw new Error(`RATE_LIMITED: Gemini free tier quota exhausted. Resets at midnight PT. Retry delay: ${retryDelay}`);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('RATE_LIMITED')) throw e;
        }
        throw new Error('RATE_LIMITED: Gemini free tier quota exhausted. Try again later or enable billing at ai.google.dev.');
      }

      throw new Error(`Gemini API error ${response?.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      console.error('Gemini returned empty text. Full response:', JSON.stringify(data, null, 2));
    }
    return extractJson(text);
  }

  async parseJobListing(rawText: string): Promise<ParsedJobListing> {
    const result = await this.generate(
      SYSTEM_PROMPTS.parseJobListing,
      rawText.slice(0, 8000),
      4096
    );
    return JSON.parse(result);
  }

  async generateQuestions(
    jobListing: ParsedJobListing,
    style: string,
    count: number
  ): Promise<InterviewQuestion[]> {
    const context = `${buildJobContext(jobListing)}
Interview Style: ${style}
Number of Questions: ${count}`;

    const result = await this.generate(SYSTEM_PROMPTS.generateQuestions, context, 4096);
    return JSON.parse(result);
  }

  async evaluateAnswer(
    jobListing: ParsedJobListing,
    question: InterviewQuestion,
    answer: string
  ): Promise<AnswerEvaluation> {
    const context = `Job: ${jobListing.title} at ${jobListing.company}
Question: ${question.question}
Question Type: ${question.type}
Target Skill: ${question.targetSkill}

Candidate's Answer:
${answer.slice(0, 3000)}`;

    const result = await this.generate(SYSTEM_PROMPTS.evaluateAnswer, context, 2048);
    return JSON.parse(result);
  }

  async generateReport(
    jobListing: ParsedJobListing,
    interview: InterviewData
  ): Promise<InterviewReport> {
    const qaSection = interview.answers
      .map((a, i) => {
        const q = interview.questions[i];
        return `Q${i + 1} (${q.type}): ${q.question}\nAnswer: ${a.answer}\nScore: ${a.score ?? 'N/A'}/10`;
      })
      .join('\n\n');

    const context = `${buildJobContext(jobListing)}

Interview Results:
${qaSection}`;

    const result = await this.generate(SYSTEM_PROMPTS.generateReport, context, 4096);
    return JSON.parse(result);
  }
}
