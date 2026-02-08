# Interview Me — Developer Setup Guide

## Prerequisites

- Node.js 20+ ([download](https://nodejs.org))
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Git
- A physical device or simulator for mobile testing
- Accounts on: Supabase, Anthropic, ElevenLabs, OpenAI, RevenueCat

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd interview-me

# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

---

## 2. Environment Variables

Copy the example env file and fill in each key:

```bash
cp .env.example .env
```

Your `.env` file needs these values:

```
# Frontend (EXPO_PUBLIC_ prefix = accessible in client)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
EXPO_PUBLIC_API_URL=http://localhost:3001

# Server-only (also create server/.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
ELEVENLABS_API_KEY=xi-...
OPENAI_API_KEY=sk-...
REVENUECAT_API_KEY=appl_...
MONTHLY_BUDGET=500
```

Create a separate `server/.env` with the server-only keys above.

> **Provider architecture:** The backend uses a swappable provider pattern. AI and voice
> providers are selected automatically based on the user's subscription tier:
>
> | Tier | AI Provider | Voice Provider |
> |------|------------|----------------|
> | Free | Gemini Flash (free API) | Gemini built-in TTS/STT |
> | Pro | Claude Sonnet (premium) | ElevenLabs + Whisper |
> | Premium | Claude Sonnet (premium) | ElevenLabs + Whisper |
>
> For local development, you only need the **Gemini key** to get started (free tier).
> Add Anthropic, ElevenLabs, and OpenAI keys when you're ready to test Pro/Premium.

---

## 3. Getting API Keys

### 3.1 Supabase (Database + Auth)

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose an organization, set a project name (e.g. `interview-me`) and database password
4. Select a region close to your users (e.g. `us-east-1`)
5. Wait for the project to provision (~2 minutes)
6. Go to **Project Settings → API** (left sidebar → gear icon → API)
7. Copy these values:
   - **Project URL** → `SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY` (safe for client-side)
   - **service_role** key → `SUPABASE_SERVICE_KEY` (server-only, never expose to client)

#### Run the database migration

```bash
# Option A: Using Supabase CLI
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push

# Option B: Manual via SQL Editor
# Go to Supabase Dashboard → SQL Editor
# Paste the contents of supabase/migrations/001_initial_schema.sql
# Click "Run"
```

#### Enable Auth Providers (optional)

1. Go to **Authentication → Providers** in the Supabase dashboard
2. Enable the providers you want (e.g. Email/Password, Google, Apple)
3. For Google: you'll need OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. For Apple: you'll need to configure Sign in with Apple in your Apple Developer account

---

### 3.2 Google Gemini (Free Tier AI + Voice) — Start Here

Gemini powers the free tier for both AI and voice. This is the only key you need to get started.

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with your Google account
2. Click **Create API Key**
3. Select a Google Cloud project (or create one — it's free)
4. Copy the key → `GEMINI_API_KEY`

**That's it.** No billing setup needed — Gemini Flash has a generous free tier.

**Free tier limits:**
- 1,500 requests/day on Gemini 2.0 Flash
- 1 million tokens/minute
- Built-in TTS and STT at no extra cost
- More than enough for development and free-tier users

**Cost notes (if you exceed free tier):**
- Gemini 2.0 Flash: ~$0.10 per 1M input tokens, ~$0.40 per 1M output tokens
- One full interview on Gemini: ~$0.01–0.03

---

### 3.3 Anthropic (Claude AI — Pro/Premium Tier)

Only needed when testing Pro/Premium features. Skip this for initial development.

1. Go to [https://console.anthropic.com](https://console.anthropic.com) and sign up / log in
2. Click **API Keys** in the left sidebar
3. Click **Create Key**
4. Name it (e.g. `interview-me-dev`)
5. Copy the key → `ANTHROPIC_API_KEY`
6. **Important:** Add billing details under **Plans & Billing** — the API requires a paid account

**Cost notes:**
- We use `claude-sonnet-4-5-20250929` for the best balance of quality and cost
- Approximate cost: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- One full interview uses roughly 3K–5K tokens total (~$0.10)

---

### 3.4 ElevenLabs (Text-to-Speech — Pro/Premium Tier)

Only needed for Pro/Premium voice quality. Free tier uses Gemini TTS instead.

1. Go to [https://elevenlabs.io](https://elevenlabs.io) and sign up / log in
2. Click your profile icon (top-right) → **Profile + API Key**
3. Copy your API key → `ELEVENLABS_API_KEY`

**Choose a voice:**
- Go to **Voices** in the left sidebar
- Browse or search for a professional-sounding voice
- Click a voice → copy the **Voice ID** from the URL or voice details
- The default in our code is `21m00Tcm4TlvDq8ikWAM` (Rachel)
- You can change this in `server/src/services/voice/elevenlabs-whisper.ts`

**Plan notes:**
- Free tier: 10,000 characters/month (enough for ~20 test interviews)
- Starter ($5/mo): 30,000 characters
- For production, Creator ($22/mo) or higher is recommended
- We use `eleven_turbo_v2` model for lower cost and latency

---

### 3.5 OpenAI (Whisper Speech-to-Text — Pro/Premium Tier)

Only needed for Pro/Premium voice transcription. Free tier uses Gemini STT instead.

1. Go to [https://platform.openai.com](https://platform.openai.com) and sign up / log in
2. Click your profile (top-right) → **API keys**
3. Click **Create new secret key**
4. Name it (e.g. `interview-me-dev`)
5. Copy the key → `OPENAI_API_KEY`
6. Add billing details under **Settings → Billing**

**Cost notes:**
- Whisper API: $0.006 per minute of audio
- Average answer ~1 minute × 5 questions = ~$0.03 per interview

---

### 3.6 RevenueCat (In-App Purchases) — Setup Later

RevenueCat handles subscriptions across iOS and Android. You can skip this for local development and wire it up before launch.

1. Go to [https://app.revenuecat.com](https://app.revenuecat.com) and sign up
2. Create a new project
3. Add your app platforms:
   - **iOS:** Needs an App Store Connect account + Shared Secret
   - **Android:** Needs a Google Play Console account + Service Account JSON
4. Go to **API Keys** in RevenueCat dashboard
5. Copy the public API key → `REVENUECAT_API_KEY`
6. Create **Products** matching our tiers:
   - `pro_monthly` — $9.99/month
   - `premium_monthly` — $19.99/month
7. Create **Entitlements:** `pro`, `premium`
8. Create **Offerings** linking products to entitlements

---

## 4. Running Locally

Open two terminal windows:

```bash
# Terminal 1 — Backend
cd server
npm run dev
# Runs on http://localhost:3001

# Terminal 2 — Frontend
npm start
# Opens Expo DevTools
# Press 'i' for iOS simulator, 'a' for Android, 'w' for web
```

For mobile testing on a physical device:
- Install **Expo Go** from the App Store / Play Store
- Scan the QR code from the Expo DevTools
- Make sure your phone and computer are on the same WiFi network
- Update `EXPO_PUBLIC_API_URL` to your computer's local IP (e.g. `http://192.168.1.100:3001`)

---

## 5. Deployment

### Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Mobile App      │     │  Web App     │     │  Admin/Monitor  │
│  (EAS Build)     │     │  (Vercel)    │     │  (Vercel)       │
└────────┬─────────┘     └──────┬───────┘     └────────┬────────┘
         │                      │                      │
         └──────────┬───────────┘──────────────────────┘
                    │
              ┌─────▼──────┐
              │  Backend    │
              │  (Railway)  │
              └─────┬───────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌──▼──────────┐
    │Supabase│ │Anthropic│ │ElevenLabs / │
    │ (Cloud)│ │  (API)  │ │  Whisper    │
    └────────┘ └────────┘  └─────────────┘
```

### 5.1 Backend → Railway (Recommended)

We use **Railway** instead of Vercel for the backend because:
- The backend streams audio from ElevenLabs (Vercel serverless has a 30s timeout and no streaming support on free tier)
- Express runs as a persistent server, not serverless functions
- Railway supports long-running processes, WebSockets, and streaming

**Steps:**

1. Go to [https://railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repo
4. Set the **Root Directory** to `server`
5. Railway auto-detects Node.js — set the **Start Command** to `npm start`
6. Go to **Variables** and add all server env vars:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ELEVENLABS_API_KEY=xi-...
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJI...
   MONTHLY_BUDGET=500
   PORT=3001
   ```
7. Railway gives you a public URL like `https://interview-me-server-production.up.railway.app`
8. Use this as `EXPO_PUBLIC_API_URL` in your frontend env

**Railway pricing:** $5/mo hobby plan includes $5 of usage credit (more than enough for dev, ~$20/mo for moderate production traffic).

**Alternative backend hosts:**
- **Render** ([render.com](https://render.com)) — Free tier with cold starts, $7/mo for always-on
- **Fly.io** ([fly.io](https://fly.io)) — Good for global edge deployment, more config overhead

### 5.2 Web Frontend → Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New → Project**
3. Import your repo
4. Set **Framework Preset** to `Expo (Experimental)` or `Other`
5. Set **Build Command:** `npx expo export -p web`
6. Set **Output Directory:** `dist`
7. Add environment variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
   EXPO_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
   ```
8. Deploy

**Vercel pricing:** Free tier is sufficient for development and moderate traffic.

### 5.3 Mobile → EAS Build (Expo)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure EAS:
   ```bash
   eas build:configure
   ```
3. Build for testing:
   ```bash
   # iOS (requires Apple Developer account — $99/year)
   eas build --platform ios --profile preview

   # Android
   eas build --platform android --profile preview
   ```
4. Build for production:
   ```bash
   eas build --platform all --profile production
   ```
5. Submit to stores:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

**EAS pricing:** Free tier gives 30 builds/month (plenty for development).

### 5.4 Supabase → Already Hosted

Supabase runs in the cloud. No additional deployment needed.
- Free tier: 2 projects, 500MB database, 50,000 monthly active users
- Pro ($25/mo): 8GB database, 100,000 MAU, daily backups

---

## 6. Environment Variable Summary

| Variable | Where Used | Tier | How to Get |
|----------|-----------|------|------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Frontend | All | Supabase Dashboard → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Frontend | All | Supabase Dashboard → Settings → API |
| `EXPO_PUBLIC_API_URL` | Frontend | All | Your Railway backend URL |
| `SUPABASE_URL` | Server | All | Same as above |
| `SUPABASE_SERVICE_KEY` | Server | All | Supabase Dashboard → Settings → API (service_role) |
| `GEMINI_API_KEY` | Server | Free | aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | Server | Pro/Premium | console.anthropic.com → API Keys |
| `ELEVENLABS_API_KEY` | Server | Pro/Premium | elevenlabs.io → Profile → API Key |
| `OPENAI_API_KEY` | Server | Pro/Premium | platform.openai.com → API Keys |
| `REVENUECAT_API_KEY` | Frontend | All | app.revenuecat.com → API Keys |
| `MONTHLY_BUDGET` | Server | All | Set by you (e.g. 500 for $500/month cap) |

> **Minimum viable setup:** You only need `SUPABASE_*` and `GEMINI_API_KEY` to run the app locally with free-tier features. Add the others as you build out paid tiers.

---

## 7. Monthly Cost Estimate (Production)

| Service | Plan | Cost | Used By |
|---------|------|------|---------|
| Railway (backend) | Hobby | ~$5–20/mo | All |
| Vercel (web) | Free/Pro | $0–20/mo | All |
| Supabase (database) | Free/Pro | $0–25/mo | All |
| EAS Build (mobile) | Free | $0/mo | All |
| Gemini Flash (AI + voice) | Free tier | $0/mo | Free users |
| Anthropic Claude (AI) | Pay-as-you-go | ~$0.10/interview | Pro/Premium |
| ElevenLabs (TTS) | Creator | $22/mo | Pro/Premium |
| OpenAI Whisper (STT) | Pay-as-you-go | ~$0.03/interview | Pro/Premium |
| Apple Developer | Annual | $99/year | All |
| Google Play | One-time | $25 | All |
| **Total (low traffic)** | | **~$30–90/mo** | |

**Key insight:** Free-tier users cost you almost nothing (Gemini free API). Your paid API costs
only kick in when users are paying you $9.99–19.99/mo, keeping margins healthy.

The `MONTHLY_BUDGET` env var in the backend sets the circuit breaker ceiling for API costs. Start conservative (e.g. $100) and increase as you gain paid users.

---

## 8. Useful Commands

```bash
# Start everything locally
npm start                          # Frontend (Expo)
cd server && npm run dev           # Backend

# Database
supabase db push                   # Apply migrations
supabase gen types typescript      # Generate TS types from schema

# Mobile builds
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Check backend health
curl http://localhost:3001/health
```

---

## 9. Troubleshooting

**"Network request failed" on mobile device**
→ Your phone can't reach `localhost`. Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP (e.g. `http://192.168.1.100:3001`).

**Supabase RLS errors (403)**
→ Make sure you're passing the auth token. Check that the anon key is correct and the user is authenticated.

**ElevenLabs 401**
→ API key is wrong or expired. Regenerate at elevenlabs.io → Profile.

**Whisper returning empty transcripts**
→ Check audio format. Whisper expects m4a/mp3/wav. Ensure expo-av is recording in a supported format.

**Cost monitor blocking requests**
→ Your `MONTHLY_BUDGET` ceiling has been hit. Increase the value or wait for the next month. Check spend with `GET /health` (add a cost status endpoint in production).
