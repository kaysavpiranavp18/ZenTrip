/**
 * Groq API client. Uses OpenAI-compatible endpoints.
 * The client is lazily initialized to avoid Next.js build-time issues.
 */

const GROQ_API_KEY = () => process.env.GROQ_API_KEY || '';

export const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';
// Complex agents (grounding, activities, planner, supervisor) need the bigger model —
// the 20b model produces thin, generic itineraries.
export const COMPLEX_MODEL = process.env.GROQ_COMPLEX_MODEL || 'openai/gpt-oss-120b';

export interface GroqCallOptions {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

let _cachedClient: import('openai').default | null = null;
let _cachedKey: string | null = null;

async function getGroqClient(): Promise<import('openai').default> {
  const currentKey = GROQ_API_KEY();
  if (!_cachedClient || _cachedKey !== currentKey) {
    _cachedClient = await initClient();
    _cachedKey = currentKey;
  }
  return _cachedClient;
}

async function initClient(): Promise<import('openai').default> {
  const key = GROQ_API_KEY();
  if (!key) {
    throw new Error(
      'GROQ_API_KEY is not set. Create a .env.local file with your Groq API key.\n' +
      'Get a key at https://console.groq.com/keys'
    );
  }
  const { default: OpenAI } = await import('openai');
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://api.groq.com/openai/v1',
    // Long JSON generations (planner, activities) regularly exceed 10s. 90s per
    // call × 9 sequential agents is still bounded well below the orchestrator's
    // 150s global cap thanks to safeGroqCall fallbacks.
    timeout: 90_000,
    maxRetries: 1,
  });
}

function extractJson<T>(content: string): T {
  // 1. Direct parse
  try {
    return JSON.parse(content) as T;
  } catch {}

  // 2. Fenced code block ```json ... ```
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1].trim()) as T;
    } catch {}
  }

  // 3. Substring between first { and last }
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(content.substring(firstBrace, lastBrace + 1)) as T;
    } catch {}
  }

  // 4. Substring between first [ and last ]
  const firstBracket = content.indexOf('[');
  const lastBracket = content.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(content.substring(firstBracket, lastBracket + 1)) as T;
    } catch {}
  }

  throw new Error(`Failed to parse JSON response: ${content.substring(0, 200)}`);
}

export async function callGroq<T>(options: GroqCallOptions): Promise<T> {
  const {
    system,
    user,
    model = FAST_MODEL,
    temperature = 0.2,
    // 4096 truncated long itineraries mid-JSON, which extractJson then failed to
    // parse — silently degrading plans to fallback data. 8192 comfortably fits a
    // multi-day plan with 3 meals + a stay object per day.
    maxTokens = 8192,
    jsonMode = true,
  } = options;

  const client = await getGroqClient();

  const userContent = jsonMode && !user.toLowerCase().includes('json')
    ? `${user}\n\nRespond strictly with a valid JSON object.`
    : user;

  const messages: { role: 'system' | 'user'; content: string }[] = [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];

  let response;
  try {
    response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
  } catch (err: unknown) {
    // If Groq rejects response_format (e.g. 400 Failed to validate JSON), retry without format constraint and extract JSON
    const isFormatError = err instanceof Error && (err.message.includes('JSON') || err.message.includes('400'));
    if (jsonMode && isFormatError) {
      response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });
    } else {
      throw err;
    }
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from Groq API');
  }

  if (jsonMode) {
    return extractJson<T>(content);
  }

  return content as unknown as T;
}

/**
 * Safe wrapper that returns fallback data if the Groq call fails.
 * Logs errors but doesn't crash the trip generation flow.
 */
export async function safeGroqCall<T>(
  options: GroqCallOptions,
  fallback: T,
  label: string
): Promise<T> {
  try {
    const result = await callGroq<T>(options);
    return result;
  } catch (error) {
    console.warn(`[Groq] ${label} agent failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}
