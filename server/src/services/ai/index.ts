import type { AIProvider } from './types';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';

export type { AIProvider, ParsedJobListing, InterviewQuestion, AnswerEvaluation, InterviewReport, InterviewData } from './types';

// Override: set AI_PROVIDER=ollama in .env to use local Ollama for all tiers (dev mode)
const AI_PROVIDER_OVERRIDE = process.env.AI_PROVIDER ?? '';

// Singleton instances — created once, reused
let anthropicInstance: AnthropicProvider | null = null;
let geminiInstance: GeminiProvider | null = null;
let ollamaInstance: OllamaProvider | null = null;

function getAnthropic(): AnthropicProvider {
  if (!anthropicInstance) anthropicInstance = new AnthropicProvider();
  return anthropicInstance;
}

function getGemini(): GeminiProvider {
  if (!geminiInstance) geminiInstance = new GeminiProvider();
  return geminiInstance;
}

function getOllama(): OllamaProvider {
  if (!ollamaInstance) ollamaInstance = new OllamaProvider();
  return ollamaInstance;
}

/**
 * Get the AI provider for a given tier.
 *
 * If AI_PROVIDER=ollama is set in env, ALL tiers use local Ollama (for dev).
 *
 * Production strategy:
 *   free    → Gemini Flash (near-zero cost)
 *   pro     → Claude Sonnet (premium quality)
 *   premium → Claude Sonnet (premium quality)
 */
export function getAIProvider(tier: string): AIProvider {
  if (AI_PROVIDER_OVERRIDE === 'ollama') {
    return getOllama();
  }

  switch (tier) {
    case 'pro':
    case 'premium':
      return getAnthropic();
    case 'free':
    default:
      return getGemini();
  }
}
