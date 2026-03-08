import { NextRequest, NextResponse } from "next/server";
import {
  createAssistant,
  createThread,
  sendMessage,
  DEFAULT_SYSTEM_PROMPT,
} from "~/server/backboard";

export const dynamic = "force-dynamic";

/**
 * POST /api/backboard/message
 * Send a message to Backboard and get a complete response (non-streaming)
 *
 * Request body:
 * {
 *   "message": string,           // The user's message
 *   "assistantId"?: string,      // Optional: existing assistant ID
 *   "threadId"?: string,         // Optional: existing thread ID
 *   "systemPrompt"?: string,     // Optional: custom system prompt
 *   "model"?: string,            // Optional: model name (default: claude-haiku-4-5-20251001)
 *   "maxTokens"?: number         // Optional: max tokens (default: 600)
 * }
 *
 * Returns:
 * {
 *   "response": string,          // The assistant's response
 *   "assistantId": string,       // The assistant ID (for reuse)
 *   "threadId": string           // The thread ID (for reuse)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message: string;
      assistantId?: string;
      threadId?: string;
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
    };

    const {
      message,
      assistantId: providedAssistantId,
      threadId: providedThreadId,
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      model = "claude-haiku-4-5-20251001",
      maxTokens = 600,
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // Create assistant if not provided
    let assistantId = providedAssistantId;
    if (!assistantId) {
      assistantId = await createAssistant("Transit Planner", systemPrompt);
    }

    // Create thread if not provided
    let threadId = providedThreadId;
    if (!threadId) {
      threadId = await createThread(assistantId);
    }

    // Send message and get response
    const response = await sendMessage(threadId, message, model, maxTokens);

    return NextResponse.json({
      response,
      assistantId,
      threadId,
    });
  } catch (error) {
    console.error("Backboard API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    );
  }
}
