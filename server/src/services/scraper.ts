import * as cheerio from 'cheerio';

/**
 * Job listing scraper.
 * Strategy:
 *   1. Try direct fetch first (fast, ~1-2s)
 *   2. Fallback to Jina Reader for bot-protected sites (slower, ~10-15s)
 */
export const scraperService = {
  async scrapeJobListing(url: string): Promise<string> {
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }

    // Strategy 1: Direct fetch — fast for sites that don't block
    try {
      const directResult = await this.fetchDirect(url);
      if (directResult && directResult.length > 200) {
        this.validateContent(directResult);
        return directResult;
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('SCRAPE_BLOCKED')) throw e;
      console.warn('Direct fetch failed, falling back to Jina Reader:', e);
    }

    // Strategy 2: Jina Reader — handles bot-protected sites (Seek, LinkedIn, etc.)
    const jinaResult = await this.fetchViaJina(url);
    this.validateContent(jinaResult);
    return jinaResult;
  },

  /**
   * Check if scraped content is actually a job listing and not an error page.
   */
  validateContent(text: string): void {
    const lower = text.toLowerCase();
    const errorPatterns = [
      'access denied',
      "you don't have permission",
      'forbidden',
      'please enable javascript',
      'checking your browser',
      'ray id',
      'cloudflare',
      'captcha',
    ];

    const isErrorPage = errorPatterns.some((p) => lower.includes(p)) && text.length < 1000;
    if (isErrorPage) {
      throw new Error(
        'SCRAPE_BLOCKED: This site blocks automated access. Please copy and paste the job description text instead.'
      );
    }
  },

  /**
   * Jina Reader API — converts any URL to clean markdown.
   * Free tier: 1,000 requests/day, no API key needed.
   * https://jina.ai/reader/
   */
  async fetchViaJina(url: string): Promise<string> {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Jina Reader error: ${response.status}`);
    }

    const text = await response.text();
    return text.slice(0, 10_000); // Cap at 10k chars
  },

  /**
   * Direct fetch fallback — works for sites that don't block simple requests.
   */
  async fetchDirect(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, header, footer, iframe, noscript').remove();

    // Try common job listing selectors
    const selectors = [
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="job_description"]',
      '[id*="job-description"]',
      '[class*="posting-"]',
      'article',
      'main',
      '[role="main"]',
    ];

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 200) {
        return el.text().trim().slice(0, 10_000);
      }
    }

    // Fallback: grab body text
    const bodyText = $('body').text().trim();
    return bodyText.slice(0, 10_000);
  },
};
