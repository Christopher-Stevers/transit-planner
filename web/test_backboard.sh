#!/bin/bash
# Test script for Backboard.io integration

echo "Testing Backboard.io API endpoints..."
echo ""

# Test 1: Create an assistant
echo "1. Creating a new assistant..."
ASSISTANT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/backboard/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Transit Planner",
    "systemPrompt": "You are a helpful transit planning assistant. Keep responses brief."
  }')

echo "Response: $ASSISTANT_RESPONSE"
ASSISTANT_ID=$(echo $ASSISTANT_RESPONSE | grep -o '"assistantId":"[^"]*"' | cut -d'"' -f4)
echo "Assistant ID: $ASSISTANT_ID"
echo ""

# Test 2: Send a message (non-streaming)
echo "2. Sending a message (non-streaming)..."
MESSAGE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/backboard/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Hello! Can you suggest a new transit line for Toronto?\",
    \"assistantId\": \"$ASSISTANT_ID\"
  }")

echo "Response:"
echo "$MESSAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MESSAGE_RESPONSE"
echo ""

# Test 3: Send a message (streaming)
echo "3. Sending a message (streaming)..."
curl -X POST http://localhost:3000/api/backboard/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"What makes a good transit route?\",
    \"assistantId\": \"$ASSISTANT_ID\"
  }"

echo ""
echo ""
echo "✅ Testing complete!"
