# AI Station Analysis Feature

## Overview

This feature adds AI-powered analysis to transit stations. When a user clicks on any station, they can view an AI-generated summary that provides insights about:

- Station ridership levels
- Crowding and capacity status
- Comparison to other stations in the network
- Notable connections and transfers

## How It Works

### 1. User Interaction
- User clicks on any station marker on the transit map
- Station popup appears with basic information
- "AI Station Analysis" section is collapsed by default
- User clicks to expand and view AI analysis

### 2. Data Collection
- Station name and route information
- Ridership data (currently mock data for demonstration)
- Connected routes/transfers
- Network-wide station data for comparison

### 3. AI Analysis
- Sends request to `/api/backboard/station-summary`
- Backboard AI analyzes the station using specialized prompt
- Generates 2-3 sentence summary
- Results are cached to avoid repeated API calls

## Components

### `StationPopup.tsx`
Updated to include:
- AI summary toggle button
- Ridership display
- Loading state during analysis
- Expandable/collapsible AI section

### `useStationSummary.ts` (Hook)
React hook that:
- Fetches AI summaries
- Manages loading states
- Caches results per station
- Provides error handling

### `/api/backboard/station-summary/route.ts` (API)
Backend endpoint that:
- Receives station data
- Builds analysis prompt with context
- Calls Backboard AI
- Returns summary

## Example AI Analysis

For "Union Station" on Line 1:

**Input Data:**
- Daily ridership: 65,000 passengers
- Connections: Line 1, Line 2, GO Transit
- Network average: 15,000 passengers

**AI Output:**
> "Union Station is a critical high-traffic hub serving 65,000 daily passengers, significantly above the network average of 15,000. As the busiest station in the TTC network with major connections to Line 2 and GO Transit, it experiences heavy crowding during peak hours and operates near capacity."

## Features

✅ **AI-Powered Analysis** - Uses Backboard Claude to generate insights
✅ **Comparative Analysis** - Compares station to network averages
✅ **Smart Caching** - Avoids redundant API calls
✅ **Ridership Data** - Shows daily passenger counts
✅ **Loading States** - Smooth UX with loading indicators
✅ **Expandable UI** - Non-intrusive, user-controlled
✅ **Connection Context** - Considers station transfers

## Customization

### Adding Real Ridership Data

Currently uses mock data. To add real data:

```tsx
// In TransitMap.tsx or your data source
const stationRidership = {
  "Union": 65000,
  "Bloor-Yonge": 55000,
  "St George": 45000,
  // ... more stations
};

// Pass to StationPopup
<StationPopup
  popup={popup}
  ridership={stationRidership[popup.name]}
  // ... other props
/>
```

### Adjusting AI Prompt

Edit the system prompt in `/api/backboard/station-summary/route.ts`:

```typescript
const systemPrompt = `You are a TTC station analyst.
[Customize behavior here]
`;
```

### Changing Summary Length

Adjust the `maxTokens` parameter:

```typescript
const response = await sendMessage(
  threadId, 
  prompt, 
  "claude-haiku-4-5-20251001", 
  200  // Increase for longer summaries
);
```

## UI/UX

### Visual Design
- Collapsible section with lightbulb icon
- Subtle grey background for AI content
- Clean typography and spacing
- Loading spinner during generation
- Ridership badge with formatting

### Interaction Flow
1. Click station → Popup appears
2. Click "AI Station Analysis" → Expands
3. AI analyzes (1-2 seconds) → Shows summary
4. Click again → Collapses
5. Open another station → Summary cached

## Performance

- **First Load**: ~1-2 seconds (AI generation)
- **Cached**: Instant (no API call)
- **Token Usage**: ~200 tokens per analysis
- **Cost**: ~$0.0001 per station (Claude Haiku)

## Future Enhancements

- [ ] Real-time ridership data integration
- [ ] Historical trend analysis
- [ ] Peak hour predictions
- [ ] Service disruption alerts
- [ ] Maintenance status
- [ ] Accessibility information
- [ ] Nearby amenities
- [ ] User-submitted feedback integration

## Testing

### Manual Test
1. Start dev server: `npm run dev`
2. Navigate to map page
3. Click any station marker
4. Click "AI Station Analysis"
5. Verify summary appears

### API Test
```bash
curl -X POST http://localhost:3000/api/backboard/station-summary \
  -H "Content-Type: application/json" \
  -d '{
    "stationName": "Union",
    "routeName": "Line 1 – Yonge–University",
    "ridership": 65000,
    "connections": ["Line 2", "GO Transit"],
    "allStations": [
      {"name": "Union", "ridership": 65000},
      {"name": "King", "ridership": 15000}
    ]
  }'
```

## Environment Variables

Required:
```bash
BACKBOARD_API_KEY=your_api_key_here
```

Already configured in your `.env` file.
