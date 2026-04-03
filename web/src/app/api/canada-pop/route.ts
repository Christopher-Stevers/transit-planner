import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// Reads can_pop.bin (preprocessed from can_pd_2020_1km_UNadj_ASCII_XYZ.csv)
// Binary format: uint32 N, then N * (float32 lng, float32 lat, float32 density)
//
// Query params: west, south, east, north (bbox), max (default 8000)

const BIN_PATH = path.join(process.cwd(), "public", "can_pop.bin");

let cachedBuffer: Buffer | null = null;
let cachedCount = 0;

function loadBin() {
  if (cachedBuffer) return;
  if (!fs.existsSync(BIN_PATH)) return;
  cachedBuffer = fs.readFileSync(BIN_PATH);
  cachedCount = cachedBuffer.readUInt32LE(0);
}

export async function GET(req: Request) {
  loadBin();

  if (!cachedBuffer || cachedCount === 0) {
    return NextResponse.json(
      { error: "Canada population data not available. Run python_utils/preprocess_canada_pop.py first." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const west  = parseFloat(searchParams.get("west")  ?? "-180");
  const south = parseFloat(searchParams.get("south") ?? "-90");
  const east  = parseFloat(searchParams.get("east")  ?? "180");
  const north = parseFloat(searchParams.get("north") ?? "90");
  const max   = Math.min(parseInt(searchParams.get("max") ?? "8000"), 20000);

  if ([west, south, east, north].some(isNaN)) {
    return NextResponse.json({ error: "Invalid bbox params" }, { status: 400 });
  }

  const features: GeoJSON.Feature[] = [];
  const HEADER = 4;
  const STRIDE = 12; // 3 * float32

  // Sample systematically when there are too many points in bbox
  // First pass: count matching points
  let matchCount = 0;
  for (let i = 0; i < cachedCount; i++) {
    const off = HEADER + i * STRIDE;
    const lng = cachedBuffer.readFloatLE(off);
    const lat = cachedBuffer.readFloatLE(off + 4);
    if (lng >= west && lng <= east && lat >= south && lat <= north) matchCount++;
  }

  const sampleEvery = matchCount > max ? Math.ceil(matchCount / max) : 1;
  let seen = 0;

  for (let i = 0; i < cachedCount; i++) {
    const off = HEADER + i * STRIDE;
    const lng = cachedBuffer.readFloatLE(off);
    const lat = cachedBuffer.readFloatLE(off + 4);
    if (lng < west || lng > east || lat < south || lat > north) continue;
    seen++;
    if (sampleEvery > 1 && seen % sampleEvery !== 0) continue;
    const density = cachedBuffer.readFloatLE(off + 8);
    // Log-normalize: log1p maps [1, ~22000] → [0.7, ~10], cap at log1p(20000)≈9.9
    const logDensity = Math.log1p(density);
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { density, logDensity },
    });
  }

  const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
  return NextResponse.json(fc, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
