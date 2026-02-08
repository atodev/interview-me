import { getAccessToken } from '@/store/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const coachingService = {
  async startProgram(interviewId: string) {
    return authFetch(`${API_BASE}/api/coaching/start`, {
      method: 'POST',
      body: JSON.stringify({ interviewId }),
    });
  },

  async getActiveProgram() {
    return authFetch(`${API_BASE}/api/coaching/active`);
  },

  async getProgram(programId: string) {
    return authFetch(`${API_BASE}/api/coaching/program/${programId}`);
  },

  async startDay(dayId: string) {
    return authFetch(`${API_BASE}/api/coaching/day/${dayId}/start`, { method: 'POST' });
  },

  async submitAttempt(dayId: string, params: {
    questionIndex: number;
    attemptNumber: number;
    answer: string;
    question: any;
    jobListing: any;
  }) {
    return authFetch(`${API_BASE}/api/coaching/day/${dayId}/attempt`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async completeDay(dayId: string, programId: string) {
    return authFetch(`${API_BASE}/api/coaching/day/${dayId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ programId }),
    });
  },

  async getDay(dayId: string) {
    return authFetch(`${API_BASE}/api/coaching/day/${dayId}`);
  },
};
