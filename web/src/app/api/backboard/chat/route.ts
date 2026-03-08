import { NextRequest } from "next/server";
import {
  createAssistant,
  createThread,
  streamMessage,
  DEFAULT_SYSTEM_PROMPT,
} from "~/server/backboard";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * POST /api/backboard/chat
 * Send a message to Backboard and get a streaming response
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
 * Returns a streaming text/event-stream response
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
      return new Response(
        JSON.stringify({ error: "message is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
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

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "metadata", assistantId, threadId })}\n\n`,
            ),
          );

          // Stream the message response
          for await (const chunk of streamMessage(
            threadId,
            message,
            model,
            maxTokens,
          )) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "content", text: chunk })}\n\n`,
              ),
            );
          }

          // Send done signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Backboard API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
