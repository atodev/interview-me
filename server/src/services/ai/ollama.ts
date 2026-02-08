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

    const result = await this.generate(SYSTEM_PROMPTS.generateQuestions, context);
    const parsed = JSON.parse(result);

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

    const result = await this.generate(SYSTEM_PROMPTS.evaluateAnswer, context);
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

    const result = await this.generate(SYSTEM_PROMPTS.generateReport, context);
    return JSON.parse(result);
  }
}
