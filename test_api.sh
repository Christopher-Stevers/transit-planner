#!/bin/bash
# Test the /generate-route API endpoint

echo "Testing /generate-route endpoint..."
echo ""

curl -X POST http://localhost:8000/generate-route \
  -H "Content-Type: application/json" \
  -d '{
    "neighbourhoods": [
      {
        "id": "test-neighborhood",
        "name": "Test Area",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-79.4106, 43.6540],
            [-79.3988, 43.6540],
            [-79.3988, 43.6620],
            [-79.4106, 43.6620],
            [-79.4106, 43.6540]
          ]]
        }
      }
    ],
    "stations": [
      {"name": "Spadina", "routeId": "line-2", "coords": [-79.4039, 43.6674]}
    ]
  }' | python3 -m json.tool
