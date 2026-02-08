/**
 * TypeScript types matching the Supabase schema.
 * Generated manually — can be replaced with `supabase gen types typescript`.
 */

export interface Profile {
  id: string;
  name: string | null;
  tier: 'free' | 'pro' | 'premium';
  streak: number;
  last_interview_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  user_id: string;
  job_title: string;
  company: string | null;
  seniority: string | null;
  job_listing_raw: string | null;
  job_listing_parsed: Record<string, any> | null;
  interview_style: string;
  overall_score: number | null;
  report: Record<string, any> | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  completed_at: string | null;
}

export interface Answer {
  id: string;
  interview_id: string;
  question_index: number;
  question_text: string;
  question_type: string;
  answer_text: string;
  score: number | null;
  evaluation: Record<string, any> | null;
  created_at: string;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  date: string;
  ai_tokens_used: number;
  tts_chars_used: number;
  stt_minutes_used: number;
  interviews_started: number;
  interviews_completed: number;
}
