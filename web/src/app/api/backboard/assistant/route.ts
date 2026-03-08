import { NextRequest, NextResponse } from "next/server";
import { createAssistant, DEFAULT_SYSTEM_PROMPT } from "~/server/backboard";

export const dynamic = "force-dynamic";

/**
 * POST /api/backboard/assistant
 * Create a new Backboard assistant with a custom prompt
 *
 * Request body:
 * {
 *   "name": string,              // Assistant name
 *   "systemPrompt"?: string      // Optional: custom system prompt (defaults to transit planner prompt)
 * }
 *
 * Returns:
 * {
 *   "assistantId": string        // The created assistant ID
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string;
      systemPrompt?: string;
    };

    const { name, systemPrompt = DEFAULT_SYSTEM_PROMPT } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const assistantId = await createAssistant(name, systemPrompt);

    return NextResponse.json({ assistantId });
  } catch (error) {
    console.error("Backboard API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create assistant",
      },
      { status: 500 },
    );
  }
}
