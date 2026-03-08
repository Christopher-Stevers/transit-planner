/**
 * TypeScript types for Backboard.io API
 */

export type BackboardAssistantResponse = {
  assistantId: string;
};

export type BackboardThreadResponse = {
  threadId: string;
};

export type BackboardMessageResponse = {
  response: string;
  assistantId: string;
  threadId: string;
};

export type BackboardStreamEvent =
  | {
      type: "metadata";
      assistantId: string;
      threadId: string;
    }
  | {
      type: "content";
      text: string;
    }
  | {
      type: "error";
      error: string;
    };

export type BackboardMessageRequest = {
  message: string;
  assistantId?: string;
  threadId?: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
};

export type BackboardAssistantRequest = {
  name: string;
  systemPrompt?: string;
};
