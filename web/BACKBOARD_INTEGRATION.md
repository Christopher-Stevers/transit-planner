# Backboard.io Next.js Integration - Complete Setup

## 📦 What Was Created

I've set up a complete Backboard.io integration in your Next.js web folder with the following components:

### 1. **Server Module** (`/src/server/backboard.ts`)
   - Core API client for Backboard.io
   - Functions: `createAssistant`, `createThread`, `streamMessage`, `sendMessage`
   - Default transit planning system prompt included

### 2. **API Routes** (`/src/app/api/backboard/`)
   - **`/api/backboard/assistant`** - Create new assistants with custom prompts
   - **`/api/backboard/message`** - Send messages (non-streaming)
   - **`/api/backboard/chat`** - Send messages (streaming with SSE)

### 3. **React Hook** (`/src/app/_components/useBackboard.ts`)
   - Easy-to-use React hook for client-side integration
   - Manages conversation state, loading, errors
   - Supports both streaming and non-streaming modes

### 4. **Example Component** (`/src/app/_components/BackboardChatExample.tsx`)
   - Full-featured chat interface
   - Shows how to use custom prompts
   - Demonstrates streaming and non-streaming
   - Complete with error handling

### 5. **Test Page** (`/src/app/backboard-test/page.tsx`)
   - Live demo at `http://localhost:3000/backboard-test`

### 6. **Documentation & Tests**
   - README with complete API documentation
   - Shell script for testing endpoints

---

## 🚀 Quick Start

### 1. Environment Setup
Your `.env` already has:
```bash
BACKBOARD_API_KEY=espr_75oUUr0etUyZyYChC-cjRQcHFXi3iAJEUMfJJR9BVgA
```

### 2. Start Next.js Server
```bash
cd web
npm run dev
```

### 3. Test in Browser
Visit: `http://localhost:3000/backboard-test`

### 4. Test with CLI (optional)
```bash
cd web
./test_backboard.sh
```

---

## 💻 Usage Examples

### Example 1: Basic Chat with Custom Prompt

```tsx
"use client";
import { useBackboard } from "~/app/_components/useBackboard";

export function MyChat() {
  const customPrompt = `You are a Toronto transit expert. 
  Help design efficient subway lines. Keep responses concise.`;
  
  const { messages, sendMessage, isLoading } = useBackboard(customPrompt);

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.role}: {msg.content}</div>
      ))}
      <button 
        onClick={() => sendMessage("Design a new line")}
        disabled={isLoading}
      >
        Send
      </button>
    </div>
  );
}
```

### Example 2: Streaming Response

```tsx
const { sendMessageStreaming } = useBackboard();
const [streamText, setStreamText] = useState("");

await sendMessageStreaming("Hello", {
  onChunk: (chunk) => {
    setStreamText(prev => prev + chunk);
  }
});
```

### Example 3: Direct API Call

```tsx
const response = await fetch("/api/backboard/message", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Design a new transit line",
    systemPrompt: "You are a transit planning expert...",
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600
  })
});

const data = await response.json();
console.log(data.response); // AI response
console.log(data.assistantId); // Save for reuse
console.log(data.threadId); // Save for conversation continuity
```

### Example 4: Creating Persistent Assistants

```tsx
// Create once, reuse many times
const createResponse = await fetch("/api/backboard/assistant", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Toronto Transit Expert",
    systemPrompt: "You are an expert in TTC planning..."
  })
});

const { assistantId } = await createResponse.json();
// Save assistantId to database or state

// Later, use it for messages
await sendMessage("Hello", { assistantId });
```

---

## 🎯 Key Features

✅ **Custom System Prompts** - Define any behavior for your AI agent
✅ **Streaming Support** - Real-time text generation (SSE)
✅ **Non-Streaming Mode** - Get complete responses at once
✅ **Conversation Threads** - Maintain context across multiple messages
✅ **Type Safety** - Full TypeScript support
✅ **React Hooks** - Easy client-side integration
✅ **Server-Side Ready** - Use in API routes and server components
✅ **Error Handling** - Built-in error states and messages

---

## 📝 API Reference

### `useBackboard(customPrompt?: string)`

React hook for Backboard integration.

**Returns:**
- `messages` - Array of conversation messages
- `isLoading` - Boolean loading state
- `error` - Error message (if any)
- `assistantId` - Current assistant ID
- `threadId` - Current thread ID
- `sendMessage(message, options?)` - Send non-streaming
- `sendMessageStreaming(message, options?)` - Send streaming
- `reset()` - Clear conversation

**Options:**
- `model?: string` - AI model to use
- `maxTokens?: number` - Response length limit
- `onChunk?: (chunk: string) => void` - Streaming callback

---

## 🔧 Advanced Usage

### Custom AI Behavior

```tsx
const urbanPlannerPrompt = `You are an urban planning AI assistant.

Your expertise:
- Transit network optimization
- Population density analysis
- Cost-benefit analysis of infrastructure projects

Response format:
- Be concise and data-driven
- Cite Toronto-specific examples
- Include cost estimates when relevant`;

const { sendMessage } = useBackboard(urbanPlannerPrompt);
```

### Multiple Conversations

```tsx
function MultiChat() {
  const chat1 = useBackboard("You are a transit expert");
  const chat2 = useBackboard("You are a budget analyst");
  
  return (
    <div>
      <div>
        <h3>Transit Expert</h3>
        {/* Use chat1 methods */}
      </div>
      <div>
        <h3>Budget Analyst</h3>
        {/* Use chat2 methods */}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Browser Test
1. Visit `http://localhost:3000/backboard-test`
2. Try the default transit planner prompt
3. Enter a custom prompt
4. Test both streaming and non-streaming modes

### CLI Test
```bash
cd web
./test_backboard.sh
```

---

## 📚 Files Created

```
web/
├── src/
│   ├── server/
│   │   └── backboard.ts                    # Core API client
│   ├── app/
│   │   ├── _components/
│   │   │   ├── useBackboard.ts            # React hook
│   │   │   └── BackboardChatExample.tsx   # Example component
│   │   ├── api/
│   │   │   └── backboard/
│   │   │       ├── assistant/
│   │   │       │   └── route.ts           # Create assistant
│   │   │       ├── message/
│   │   │       │   └── route.ts           # Send message (non-streaming)
│   │   │       ├── chat/
│   │   │       │   └── route.ts           # Send message (streaming)
│   │   │       └── README.md              # API docs
│   │   └── backboard-test/
│   │       └── page.tsx                   # Test page
│   └── test_backboard.sh                  # CLI test script
└── BACKBOARD_INTEGRATION.md               # This file
```

---

## 🎨 Integration with Your Transit App

You can now integrate Backboard AI into your transit planner:

```tsx
// In your TransitMap component or similar
import { useBackboard } from "~/app/_components/useBackboard";

const transitPrompt = `You are a Toronto transit planning AI.
Help users design optimal transit routes based on:
- Neighborhood population density
- Existing transit coverage
- Cost-benefit analysis

Always format route suggestions as JSON.`;

function TransitPlanner() {
  const { sendMessage } = useBackboard(transitPrompt);
  
  async function generateRoute(neighborhoods, stations) {
    const prompt = `Design a transit route connecting these areas:
    Neighborhoods: ${neighborhoods.map(n => n.name).join(', ')}
    Stations: ${stations.map(s => s.name).join(', ')}
    
    Provide your suggestion in JSON format.`;
    
    const response = await sendMessage(prompt);
    // Parse and use the response
  }
}
```

---

## 🆘 Support

See the README at `/src/app/api/backboard/README.md` for detailed API documentation.

For issues:
1. Check that `BACKBOARD_API_KEY` is set in `.env`
2. Verify the Next.js dev server is running
3. Check browser console for errors
4. Test endpoints with the CLI script

---

## ✨ Next Steps

1. Visit `http://localhost:3000/backboard-test` to see it in action
2. Modify the system prompt to match your needs
3. Integrate into your existing transit map components
4. Customize the UI to match your design system

Enjoy your new AI-powered assistant! 🚀
