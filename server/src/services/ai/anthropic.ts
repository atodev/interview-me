import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPTS } from '../prompts';
import type {
  AIProvider,
  ParsedJobListing,
  InterviewQuestion,
  AnswerEvaluation,
  InterviewReport,
  InterviewData,
} from './types';

const MODEL = 'claude-sonnet-4-5-20250929';

function buildJobContext(job: ParsedJobListing): string {
  return `Role: ${job.title} at ${job.company}
Seniority: ${job.seniority}
Key Skills: ${job.skills.join(', ')}
Summary: ${job.summary}`;
}

function extractJson(response: Anthropic.Message): string {
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async parseJobListing(rawText: string): Promise<ParsedJobListing> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS.parseJobListing,
      messages: [{ role: 'user', content: rawText.slice(0, 8000) }],
    });
    return JSON.parse(extractJson(response));
  }

  async generateQuestions(
    jobListing: ParsedJobListing,
    style: string,
    count: number
  ): Promise<InterviewQuestion[]> {
    const context = `${buildJobContext(jobListing)}
Interview Style: ${style}
Number of Questions: ${count}`;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS.generateQuestions,
      messages: [{ role: 'user', content: context }],
    });
    return JSON.parse(extractJson(response));
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

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPTS.evaluateAnswer,
      messages: [{ role: 'user', content: context }],
    });
    return JSON.parse(extractJson(response));
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

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS.generateReport,
      messages: [{ role: 'user', content: context }],
    });
    return JSON.parse(extractJson(response));
  }
}
