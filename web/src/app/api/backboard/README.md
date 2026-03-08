# Backboard.io Integration

This directory contains the Backboard.io API integration for the Next.js backend.

## Overview

Backboard.io is an AI assistant service that allows you to create custom AI agents with specific system prompts. This integration provides:

- **Server-side API client** (`~/server/backboard.ts`)
- **Next.js API routes** (`/api/backboard/*`)
- **React hooks** (`useBackboard`) for easy client-side usage
- **Example component** (`BackboardChatExample`)

## Environment Setup

Add your Backboard API key to `.env`:

```bash
BACKBOARD_API_KEY=your_api_key_here
```

## API Endpoints

### POST `/api/backboard/assistant`

Create a new assistant with a custom prompt.

**Request:**
```json
{
  "name": "My Assistant",
  "systemPrompt": "You are a helpful assistant..." // optional
}
```

**Response:**
```json
{
  "assistantId": "ast_..."
}
```

### POST `/api/backboard/message`

Send a message and get a complete response (non-streaming).

**Request:**
```json
{
  "message": "Hello, world!",
  "assistantId": "ast_...",  // optional, will create if not provided
  "threadId": "thread_...",  // optional, will create if not provided
  "systemPrompt": "...",     // optional, custom system prompt
  "model": "claude-haiku-4-5-20251001",  // optional
  "maxTokens": 600           // optional
}
```

**Response:**
```json
{
  "response": "Hello! How can I help you?",
  "assistantId": "ast_...",
  "threadId": "thread_..."
}
```

### POST `/api/backboard/chat`

Send a message and get a streaming response (Server-Sent Events).

**Request:** Same as `/api/backboard/message`

**Response:** Text/event-stream with the following event types:

```
data: {"type":"metadata","assistantId":"ast_...","threadId":"thread_..."}

data: {"type":"content","text":"Hello"}

data: {"type":"content","text":"! How can"}

data: {"type":"content","text":" I help you?"}

data: [DONE]
```

## Usage in React Components

### Using the Hook

```tsx
import { useBackboard } from "~/app/_components/useBackboard";

export function MyComponent() {
  const { messages, isLoading, sendMessage, sendMessageStreaming } = useBackboard();

  // Send a message (non-streaming)
  const handleSend = async () => {
    const response = await sendMessage("Hello!");
    console.log(response);
  };

  // Send a message (streaming)
  const handleSendStreaming = async () => {
    await sendMessageStreaming("Hello!", {
      onChunk: (chunk) => {
        console.log("Received chunk:", chunk);
      },
    });
  };

  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={idx}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <button onClick={handleSend} disabled={isLoading}>
        Send Message
      </button>
    </div>
  );
}
```

### Using Custom System Prompts

```tsx
const customPrompt = `You are a transit planning expert for Toronto.
Help users design efficient public transit routes.`;

const { sendMessage } = useBackboard(customPrompt);
```

### Direct API Usage (without hook)

```tsx
const response = await fetch("/api/backboard/message", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Design a new subway line",
    systemPrompt: "You are a transit expert...",
  }),
});

const data = await response.json();
console.log(data.response);
```

## Server-Side Usage

```tsx
import { createAssistant, createThread, sendMessage } from "~/server/backboard";

// In an API route or server component
export async function POST(request: Request) {
  const assistantId = await createAssistant("My Agent", "Custom prompt");
  const threadId = await createThread(assistantId);
  const response = await sendMessage(threadId, "Hello!");
  
  return Response.json({ response });
}
```

## Example Component

See `BackboardChatExample.tsx` for a complete example with:
- Custom system prompts
- Message history
- Streaming and non-streaming modes
- Error handling

To use it:

```tsx
import { BackboardChatExample } from "~/app/_components/BackboardChatExample";

export default function TestPage() {
  return <BackboardChatExample />;
}
```

## Features

- ✅ Create custom AI assistants with any system prompt
- ✅ Maintain conversation threads
- ✅ Streaming and non-streaming responses
- ✅ Type-safe API with TypeScript
- ✅ React hooks for easy integration
- ✅ Server-side and client-side support
- ✅ Error handling and loading states

## Models

Default model: `claude-haiku-4-5-20251001`

You can specify different models when sending messages:

```tsx
await sendMessage("Hello", { model: "claude-opus-4-20250514" });
```
