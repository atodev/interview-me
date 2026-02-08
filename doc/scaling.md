# Interview Me — Scaling Strategy

## The Problem

At scale, API costs for the free tier become unsustainable:

```
1M users × 10% DAU = 100K daily active
100K × 1 interview/day × 8 API calls = 800K API calls/day
At Gemini free pricing = ~$2,400/mo
At scale pricing = $8,000-15,000/mo just for free tier
```

You'd be paying $8K+/mo for users who pay you nothing. That doesn't work.

---

## Solutions (Best → Most Complex)

### 1. Pre-Computed Question Bank (Do This First)

The biggest insight: **most job listings are similar**. A "React Developer" listing in London needs roughly the same questions as one in Sydney.

- Pre-generate 10,000+ questions across ~200 job categories using an LLM (one-time batch cost: ~$50)
- Tag each with category, seniority, skill, style
- At runtime: classify the job listing → pull matching questions from DB → zero LLM calls

**This eliminates 2-3 API calls per interview instantly (parse + generate questions).**

```
Before: 8 LLM calls/interview
After:  4-5 LLM calls/interview (evaluate answers + report)
Saving: 40% of API costs
```

### 2. Template Reports with Sparse LLM

Reports follow a predictable structure. Instead of generating the whole report via LLM:

- Score aggregation: pure math (no LLM needed)
- Strengths/weaknesses: already captured during per-answer evaluation
- Success profile: pre-written per job category
- Only use LLM for the 2-3 sentence personalized summary

**Eliminates the report LLM call almost entirely.**

### 3. Self-Hosted Fine-Tuned Model (The Big Move)

This is the endgame for scale. Fine-tune a small open-source model specifically for interview evaluation.

| Model | Size | Quality | Hosting Cost | Capacity |
|-------|------|---------|-------------|----------|
| **Llama 3.1 8B** | 8B params | Good | ~$200/mo (1x A10G) | ~50 req/sec |
| **Mistral 7B** | 7B params | Good | ~$200/mo | ~50 req/sec |
| **Phi-3 Mini** | 3.8B params | Decent | ~$100/mo (T4 GPU) | ~100 req/sec |
| **Gemma 2 9B** | 9B params | Good | ~$250/mo | ~40 req/sec |

**Fine-tuning process:**

1. Use Claude/GPT-4 to generate 5,000-10,000 training examples (question + answer + evaluation pairs)
2. Fine-tune Llama 3.1 8B on this dataset (cost: ~$50-100 on Lambda Labs or Together AI)
3. Host on a GPU instance with vLLM or TGI for fast inference
4. The model only learns ONE task: "evaluate this interview answer" — small models excel at narrow tasks

**Hosting math:**

```
1x A10G GPU on AWS/GCP: ~$200/mo
Capacity: ~50 requests/sec = 4.3M requests/day
That's enough for 500K+ daily interviews
Cost per interview: $0.0004 (vs $0.15 with API)
```

**That's a 375x cost reduction.**

### 4. Hybrid Architecture (Recommended at Scale)

```
┌──────────────────────────────────────────────────────┐
│                    FREE TIER                          │
│                                                      │
│  Job Parsing ──→ Classifier + regex (no LLM)         │
│  Questions   ──→ Pre-computed bank (DB lookup)        │
│  Evaluation  ──→ Self-hosted Llama 8B (fine-tuned)   │
│  Report      ──→ Template + score math (no LLM)      │
│  Voice       ──→ Edge TTS / Piper (open source)      │
│                                                      │
│  LLM calls per interview: 3-5 (self-hosted)          │
│  API calls per interview: 0                          │
│  Cost per interview: ~$0.001                         │
├──────────────────────────────────────────────────────┤
│                  PRO / PREMIUM                        │
│                                                      │
│  Everything ──→ Claude Sonnet (best quality)          │
│  Voice      ──→ ElevenLabs (best voice)              │
│                                                      │
│  Cost per interview: ~$0.15 (paid by subscription)   │
└──────────────────────────────────────────────────────┘
```

### 5. On-Device / Edge (Future)

Run a quantized small model (Phi-3 Mini, Gemma 2B) directly on the user's phone:

- Apple has Core ML, Android has NNAPI
- Eliminates server costs entirely for free tier
- Expo supports native modules for this
- Quality is lower but improving fast
- Best for: question selection, basic scoring

---

## Recommended Roadmap

| Stage | Users | Strategy | Monthly Cost |
|-------|-------|----------|-------------|
| **Now** | 0-10K | Gemini API (free tier) | ~$0-100 |
| **Phase 2** | 10-50K | Question bank + template reports | ~$200 |
| **Phase 3** | 50-200K | Self-hosted fine-tuned Llama 8B | ~$400-800 |
| **Phase 4** | 200K-1M | Multi-GPU cluster + caching | ~$1,500-3,000 |
| **Phase 5** | 1M+ | Edge models + self-hosted hybrid | ~$3,000-5,000 |

---

## Cost Comparison at Scale

| Approach | Cost per Interview | 100K interviews/day | 1M interviews/day |
|----------|-------------------|--------------------|--------------------|
| Gemini API (current) | $0.01-0.03 | $1,000-3,000/mo | $10,000-30,000/mo |
| Claude API (pro tier) | $0.10-0.15 | $10,000-15,000/mo | $100,000+/mo |
| Question bank + template | $0.005 | $500/mo | $5,000/mo |
| Self-hosted fine-tuned | $0.0004 | $200/mo | $800/mo |
| Edge/on-device | ~$0 | ~$0 | ~$0 |

---

## Key Takeaways

1. **Don't train from scratch** — Fine-tune an existing open-source model on your narrow task
2. **Question bank is the easiest win** — Pre-generate questions, eliminate 40% of API calls
3. **Self-hosted 8B model at $200/mo** can handle 500K+ daily interviews
4. **Free tier should cost you almost nothing** — Reserve expensive APIs for paying users
5. **The interview evaluation task is narrow enough** that small models perform well when fine-tuned
