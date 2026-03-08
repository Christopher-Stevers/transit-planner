/**
 * Backboard.io API integration for Next.js backend
 * Provides methods to create assistants, threads, and stream messages
 */

const BASE_URL = "https://app.backboard.io/api";
const API_KEY = process.env.BACKBOARD_API_KEY;

if (!API_KEY) {
  throw new Error("BACKBOARD_API_KEY environment variable is required");
}

const HEADERS = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json",
};

/**
 * Default system prompt for transit route planning
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a transit route planning assistant for Toronto.

You help urban planners design new transit lines. When the user describes a route requirement,
respond conversationally and helpfully. If they ask you to generate a specific route, also output
a JSON block at the end of your message in this exact format:

\`\`\`route
{
  "name": "Route Name",
  "type": "subway" | "streetcar" | "bus",
  "color": "#hexcolor",
  "stops": [
    { "name": "Stop Name", "coords": [-79.3832, 43.6532] }
  ]
}
\`\`\`

Coordinates are [longitude, latitude] in WGS84. Only include the JSON block when generating
an actual route. Use realistic Toronto coordinates. Keep stop names concise.`;

/**
 * Create a new Backboard assistant
 */
export async function createAssistant(
  name: string,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/assistants`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      name,
      system_prompt: systemPrompt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create assistant: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { assistant_id: string };
  return data.assistant_id;
}

/**
 * Create a new conversation thread for an assistant
 */
export async function createThread(assistantId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/assistants/${assistantId}/threads`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create thread: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { thread_id: string };
  return data.thread_id;
}

/**
 * Send a message to a thread and get a streaming response
 * Returns an async iterator that yields text chunks
 */
export async function* streamMessage(
  threadId: string,
  content: string,
  model: string = "claude-haiku-4-5-20251001",
  maxTokens: number = 600,
): AsyncGenerator<string, void, unknown> {
  const formData = new URLSearchParams({
    content,
    stream: "true",
    model,
    max_tokens: maxTokens.toString(),
  });

  const response = await fetch(`${BASE_URL}/threads/${threadId}/messages`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${response.status} ${error}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") break;

        try {
          const data = JSON.parse(payload) as
            | { content?: string }
            | { delta?: { content?: string } };

          // Handle both {content: ...} and {delta: {content: ...}} shapes
          const text =
            ("content" in data ? data.content : undefined) ??
            ("delta" in data && data.delta ? data.delta.content : undefined) ??
            "";

          if (text) {
            yield text;
          }
        } catch {
          // Plain text chunk fallback
          if (payload) {
            yield payload;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Send a message and get the complete response (non-streaming)
 */
export async function sendMessage(
  threadId: string,
  content: string,
  model: string = "claude-haiku-4-5-20251001",
  maxTokens: number = 600,
): Promise<string> {
  const formData = new URLSearchParams({
    content,
    stream: "false",
    model,
    max_tokens: maxTokens.toString(),
  });

  const response = await fetch(`${BASE_URL}/threads/${threadId}/messages`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { content?: string };
  return data.content ?? "";
}
