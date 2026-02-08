# Interview Me — Scaffold Documentation

## Overview

**Interview Me** is a voice-powered AI interview practice app. Users paste a job listing, and an AI interviewer asks tailored questions, evaluates answers via voice, then delivers a scored report with coaching.

**Target Audience:** 18–35 year olds preparing for job interviews.
**Platforms:** iOS, Android, Web (desktop via Tauri/Electron later).
**Monetization:** Tiered subscription (Free / Pro / Premium).

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile/Web | React Native (Expo SDK 52) | Cross-platform UI |
| Routing | Expo Router v4 | File-based navigation |
| State | Zustand | Lightweight global state |
| Backend | Express.js + TypeScript | API server |
| AI | Anthropic Claude (Sonnet) | Question generation, evaluation, reports |
| Voice Out | ElevenLabs Turbo v2 | Text-to-speech (interviewer voice) |
| Voice In | OpenAI Whisper | Speech-to-text (user answers) |
| Database | Supabase (Postgres) | Auth, data, usage tracking |
| Payments | RevenueCat | Cross-platform subscriptions |

---

## Project Structure

```
interview-me/
├── app/                            # Expo Router screens
│   ├── _layout.tsx                 # Root layout (Stack navigator)
│   ├── (tabs)/                     # Bottom tab navigator
│   │   ├── _layout.tsx             # Tab config
│   │   ├── index.tsx               # Home / Dashboard
│   │   ├── history.tsx             # Past interview list
│   │   └── profile.tsx             # Profile & subscription
│   ├── interview/
│   │   ├── setup.tsx               # Job listing input
│   │   ├── session.tsx             # Live interview (voice)
│   │   └── report.tsx              # Results & report
│   ├── paywall.tsx                 # Subscription plans
│   └── onboarding.tsx              # First-run flow (TODO)
├── components/
│   ├── ui/                         # Reusable UI primitives
│   ├── interview/                  # Interview-specific components
│   └── common/                     # Shared components
├── constants/
│   ├── theme.ts                    # Colors, spacing, typography
│   ├── tiers.ts                    # Subscription tier configs
│   └── prompts.ts                  # AI system prompts
├── hooks/                          # Custom React hooks
├── services/
│   ├── ai.ts                       # AI API client (calls backend)
│   ├── elevenlabs.ts               # TTS playback client
│   ├── stt.ts                      # Recording + transcription client
│   └── supabase.ts                 # Supabase client init
├── store/
│   └── index.ts                    # Zustand store (all app state)
├── server/                         # Backend API
│   ├── src/
│   │   ├── index.ts                # Express entry point
│   │   ├── routes/
│   │   │   ├── interview.ts        # /api/interview/* endpoints
│   │   │   └── voice.ts            # /api/voice/* endpoints
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts      # Per-tier request throttling
│   │   │   ├── usageTracker.ts     # Per-user daily caps
│   │   │   └── costMonitor.ts      # Global spend circuit breaker
│   │   ├── services/
│   │   │   ├── anthropic.ts        # Claude API wrapper
│   │   │   ├── elevenlabs.ts       # ElevenLabs TTS proxy
│   │   │   ├── whisper.ts          # Whisper STT proxy
│   │   │   ├── scraper.ts          # Job URL scraper
│   │   │   └── prompts.ts         # Server-side prompt constants
│   │   └── db/
│   │       └── schema.ts           # TypeScript DB types
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full database schema
├── skills/
│   └── scaffold.md                 # This file
├── package.json
├── app.json
├── tsconfig.json
└── .env.example
```

---

## Screen Flow

```
Onboarding → Home (tabs)
                ├── Home → [Start Interview] → Setup → Session → Report
                ├── History → Report (past)
                └── Profile → Paywall
```

### Setup Screen
- Toggle: Paste Text / Paste URL (URL requires Pro+)
- Select interview style (General / Technical / Behavioral / Case)
- Submit → backend parses listing → generates questions → navigates to Session

### Session Screen
- Displays one question at a time with progress bar
- AI voice reads question aloud (Pro+ via ElevenLabs)
- User taps mic → records answer → STT transcribes
- After each answer: AI evaluates in background
- After all questions: navigates to Report

### Report Screen
- Overall score with animated ring (1–100)
- Readiness badge (Not Ready → Exceptional)
- Strengths / Areas to Improve / Action Items
- Success Profile (what a winning candidate looks like)
- Per-question breakdown with ideal answers (Premium only)
- Share results button

---

## Subscription Tiers

| Feature | Free | Pro ($9.99/mo) | Premium ($19.99/mo) |
|---------|------|----------------|---------------------|
| Interviews/month | 2 | 15 | 60 |
| Questions/interview | 3 | 5 | 5–10 |
| Voice (ElevenLabs) | No | Yes | Yes + voice choice |
| Report detail | Basic | Full | Full + ideal answers |
| URL scraping | No | Yes | Yes |
| History | Last 3 | Last 30 | Unlimited |
| Interview styles | General | All 4 | All + custom |

---

## Cost Safeguards (5 Layers)

### Layer 1 — Per-User Daily Caps
Hard limits on AI tokens and TTS characters per tier per day.
Enforced in `server/src/middleware/usageTracker.ts`.

### Layer 2 — Request Rate Limiting
Per-tier req/min limits to prevent burst abuse.
Enforced in `server/src/middleware/rateLimiter.ts`.

### Layer 3 — Global Circuit Breaker
Monthly budget ceiling with progressive degradation:
- 80% → Warning log
- 95% → Voice disabled, shorter reports
- 100% → Free tier paused, paid = text-only

Enforced in `server/src/middleware/costMonitor.ts`.

### Layer 4 — Smart Cost Reduction
- Slim context: Extract structured job info once, reuse compact version
- Input caps: Truncate job listings to 8K chars, answers to 3K chars
- ElevenLabs Turbo v2: Lower cost per character
- TTS text cap: 5K chars per call

### Layer 5 — Abuse Detection (TODO)
- Flag accounts at >3x average usage
- Concurrent session detection
- Email verification on free tier

---

## Estimated Cost Per Interview

| Component | Cost |
|-----------|------|
| AI — Parse job listing | ~$0.01 |
| AI — Generate 5 questions | ~$0.02 |
| AI — Evaluate 5 answers | ~$0.04 |
| AI — Generate report | ~$0.03 |
| ElevenLabs — 5 questions | ~$0.02 |
| Whisper — 5 answers | ~$0.03 |
| **Total** | **~$0.15** |

---

## API Endpoints

### Interview
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/interview/parse` | Parse job listing (URL or text) |
| POST | `/api/interview/questions` | Generate interview questions |
| POST | `/api/interview/evaluate` | Evaluate a single answer |
| POST | `/api/interview/report` | Generate full report |

### Voice
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/voice/tts` | Text-to-speech (returns audio stream) |
| POST | `/api/voice/stt` | Speech-to-text (accepts audio upload) |

---

## Database Schema

**Tables:**
- `profiles` — User profiles (extends Supabase auth), stores tier and streak
- `interviews` — Interview sessions with job listing and report
- `answers` — Individual Q&A pairs with scores
- `daily_usage` — Per-user daily resource consumption

**Views:**
- `monthly_cost_summary` — Aggregated costs for monitoring

All tables have Row Level Security (RLS) enabled.

---

## Design Language

**Theme:** Dark-first, bold gradients (purple/pink), card-based layout.
**Vibe:** Duolingo meets Calm — gamified but not childish.
**Key colors:** `#A855F7` (primary purple), `#EC4899` (accent pink), `#0A0A0F` (background).
**UX cues:**
- Streak counter (gamification)
- Animated score reveal
- Haptic feedback on interactions
- Casual-smart copy tone

---

## TODO / Next Steps

1. [ ] Implement onboarding screen
2. [ ] Wire up real audio recording in session.tsx (expo-av)
3. [ ] Integrate RevenueCat for in-app purchases
4. [ ] Add auth flow (Supabase magic link or social login)
5. [ ] Build share-to-social feature for reports
6. [ ] Add Expo share sheet handler (mobile URL intake)
7. [ ] Screenshot/OCR job listing input (via Claude vision)
8. [ ] Question caching — reuse questions for similar roles
9. [ ] Admin dashboard for cost monitoring
10. [ ] Desktop build via Tauri
11. [ ] Push notifications for streak reminders
12. [ ] A/B test paywall copy and pricing
