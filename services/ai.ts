import type { JobListing, InterviewQuestion, InterviewReport, AnswerResult } from '@/store';
import { getAccessToken } from '@/store/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiRequest<T>(url: string, body: object, method = 'POST'): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiGet<T>(url: string): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * AI service — all calls go through our backend to protect API keys
 * and enforce tier-based rate limits / usage caps.
 */
export const aiService = {
  async parseJobListing(input: string, mode: 'url' | 'paste'): Promise<JobListing> {
    return apiRequest(`${API_BASE}/api/interview/parse`, { input, mode });
  },

  async generateQuestions(
    jobListing: JobListing,
    style: string,
    count: number
  ): Promise<{ questions: InterviewQuestion[]; interviewId: string | null }> {
    const result = await apiRequest<any>(`${API_BASE}/api/interview/questions`, {
      jobListing,
      style,
      count,
    });

    // Handle both old format (array) and new format ({ questions, interviewId })
    if (Array.isArray(result)) {
      return { questions: result, interviewId: null };
    }
    return {
      questions: result.questions ?? result,
      interviewId: result.interviewId ?? null,
    };
  },

  async evaluateAnswer(
    jobListing: JobListing,
    question: InterviewQuestion,
    answer: string,
    interviewId?: string | null,
    questionIndex?: number
  ): Promise<Omit<AnswerResult, 'questionIndex' | 'answer'>> {
    return apiRequest(`${API_BASE}/api/interview/evaluate`, {
      jobListing,
      question,
      answer,
      interviewId,
      questionIndex,
    });
  },

  async generateReport(
    jobListing: JobListing,
    interview: { questions: InterviewQuestion[]; answers: AnswerResult[]; style: string },
    interviewId?: string | null
  ): Promise<InterviewReport> {
    return apiRequest(`${API_BASE}/api/interview/report`, {
      jobListing,
      interview,
      interviewId,
    });
  },

  async getHistory(): Promise<any[]> {
    return apiGet(`${API_BASE}/api/interview/history`);
  },

  async getInterview(id: string): Promise<any> {
    return apiGet(`${API_BASE}/api/interview/${id}`);
  },
};
