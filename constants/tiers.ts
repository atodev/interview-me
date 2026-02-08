export type TierName = 'free' | 'pro' | 'premium';

export interface TierConfig {
  name: TierName;
  label: string;
  price: number; // monthly in USD
  interviewsPerMonth: number;
  questionsPerInterview: number;
  voiceEnabled: boolean;
  voiceChoice: boolean;
  urlScrape: boolean;
  reportDetail: 'basic' | 'full' | 'full_plus';
  historyLimit: number;
  interviewStyles: string[];
  // Cost safeguards
  dailyAiTokenCap: number;
  dailyTtsCharCap: number;
  requestsPerMinute: number;
}

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    name: 'free',
    label: 'Starter',
    price: 0,
    interviewsPerMonth: 2,
    questionsPerInterview: 3,
    voiceEnabled: false,
    voiceChoice: false,
    urlScrape: false,
    reportDetail: 'basic',
    historyLimit: 3,
    interviewStyles: ['general'],
    dailyAiTokenCap: 2_000,
    dailyTtsCharCap: 0,
    requestsPerMinute: 3,
  },
  pro: {
    name: 'pro',
    label: 'Pro',
    price: 9.99,
    interviewsPerMonth: 15,
    questionsPerInterview: 5,
    voiceEnabled: true,
    voiceChoice: false,
    urlScrape: true,
    reportDetail: 'full',
    historyLimit: 30,
    interviewStyles: ['general', 'technical', 'behavioral', 'case'],
    dailyAiTokenCap: 50_000,
    dailyTtsCharCap: 15_000,
    requestsPerMinute: 10,
  },
  premium: {
    name: 'premium',
    label: 'Premium',
    price: 19.99,
    interviewsPerMonth: 60,
    questionsPerInterview: 10,
    voiceEnabled: true,
    voiceChoice: true,
    urlScrape: true,
    reportDetail: 'full_plus',
    historyLimit: -1, // unlimited
    interviewStyles: ['general', 'technical', 'behavioral', 'case', 'custom'],
    dailyAiTokenCap: 120_000,
    dailyTtsCharCap: 40_000,
    requestsPerMinute: 20,
  },
};
