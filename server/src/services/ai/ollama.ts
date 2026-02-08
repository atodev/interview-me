import { SYSTEM_PROMPTS } from '../prompts';
import type {
  AIProvider,
  ParsedJobListing,
  InterviewQuestion,
  AnswerEvaluation,
  InterviewReport,
  InterviewData,
} from './types';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:4b';

function buildJobContext(job: ParsedJobListing): string {
  return `Role: ${job.title ?? 'Unknown'} at ${job.company ?? 'Unknown'}
Seniority: ${job.seniority ?? 'unknown'}
Key Skills: ${(job.skills ?? []).join(', ') || 'Not specified'}
Summary: ${job.summary ?? 'No summary available'}`;
}

function extractJson(text: string): string {
  // Strip markdown fences if present
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try to find JSON object or array in the response
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  return jsonMatch ? jsonMatch[0] : cleaned;
}

/**
 * Attempt to fix common JSON issues from small Ollama models:
 * - Trailing commas before } or ]
 * - Missing commas between properties
 * - Single quotes instead of double quotes (when safe)
 * - Truncated JSON (missing closing braces/brackets)
 */
function repairJson(raw: string): string {
  let s = raw;

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');

  // Fix missing commas between properties: }\n" or ]\n" patterns
  s = s.replace(/(["\d\]}\w])\s*\n\s*"/g, '$1,\n"');

  // Balance braces/brackets — append missing closers
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }

  return s;
}

function safeJsonParse(raw: string): any {
  // First try direct parse
  try { return JSON.parse(raw); } catch {}

  // Try with repairs
  const repaired = repairJson(raw);
  try { return JSON.parse(repaired); } catch {}

  throw new Error(`Failed to parse JSON from Ollama: ${raw.slice(0, 200)}`);
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  private async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
          num_predict: 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error ${response.status}: ${error}`);
    }

    const data = await response.json();
    return extractJson(data.message?.content ?? '');
  }

  async parseJobListing(rawText: string): Promise<ParsedJobListing> {
    const result = await this.generate(
      SYSTEM_PROMPTS.parseJobListing,
      rawText.slice(0, 8000)
    );
    return safeJsonParse(result);
  }

  async generateQuestions(
    jobListing: ParsedJobListing,
    style: string,
    count: number
  ): Promise<InterviewQuestion[]> {
    const context = `${buildJobContext(jobListing)}
Interview Style: ${style}
Number of Questions: ${count}`;

    const result = await this.generate(SYSTEM_PROMPTS.generateQuestions, context);
    const parsed = safeJsonParse(result);

    // Handle various formats from small models
    if (Array.isArray(parsed)) return parsed;

    const values = Object.values(parsed);

    // Model wrapped array in an object (e.g. { questions: [...] })
    const arr = values.find((v) => Array.isArray(v));
    if (arr) return arr as InterviewQuestion[];

    // Model returned an object of question objects (e.g. { q1: {...}, q2: {...} })
    const objValues = values.filter(
      (v): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v)
    );
    if (objValues.length > 0 && objValues[0].question) {
      return objValues as unknown as InterviewQuestion[];
    }

    console.warn('Unexpected questions format from Ollama:', JSON.stringify(parsed).slice(0, 200));
    return [];
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

    // Retry up to 2 times — malformed JSON from small models is common
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await this.generate(SYSTEM_PROMPTS.evaluateAnswer, context);
        return safeJsonParse(result);
      } catch (err) {
        console.warn(`Evaluate attempt ${attempt + 1} failed:`, (err as Error).message?.slice(0, 150));
        if (attempt === 2) {
          // Return a graceful fallback instead of crashing the interview
          console.error('All evaluate attempts failed, returning fallback score');
          return {
            score: 5,
            strengths: ['Answer was provided'],
            improvements: ['Unable to fully evaluate — please try again'],
            idealAnswer: 'Evaluation was not available for this question.',
            tip: 'Try providing more specific examples in your answer.',
          };
        }
      }
    }
    // Unreachable, but TypeScript needs it
    throw new Error('evaluateAnswer failed');
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

    const result = await this.generate(SYSTEM_PROMPTS.generateReport, context);
    return safeJsonParse(result);
  }
}
