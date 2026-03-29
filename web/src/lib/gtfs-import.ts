/**
 * GTFS import utility.
 *
 * Reads a GTFS ZIP (opened by jszip) and converts it into an array of Route
 * objects compatible with the app's data model.
 *
 * Strategy:
 *   - For each route, find the trip with the most stops (prefer direction_id=0)
 *     to get the fullest stop coverage.
 *   - Shapes are loaded when present; otherwise stop coords are used.
 */

import type { Route } from "~/app/map/transit-data";

// ─── types ────────────────────────────────────────────────────────────────────

type CsvRecord = Record<string, string>;

// Re-use only the parts of JSZip we need so there's no hard dep at module level.
interface ZipLike {
  file(name: string): { async(type: "string"): Promise<string> } | null;
}

// ─── error class ──────────────────────────────────────────────────────────────

export class GTFSImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GTFSImportError";
  }
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): CsvRecord[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const record: CsvRecord = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]!] = values[i] ?? "";
    }
    return record;
  });
}

async function readFile(zip: ZipLike, name: string, required: true): Promise<string>;
async function readFile(zip: ZipLike, name: string, required: false): Promise<string | null>;
async function readFile(zip: ZipLike, name: string, required: boolean): Promise<string | null> {
  const entry = zip.file(name);
  if (!entry) {
    if (required) throw new GTFSImportError(`Missing required file: ${name}`);
    return null;
  }
  return entry.async("string");
}

// ─── route type mapping ───────────────────────────────────────────────────────

function gtfsRouteType(routeType: string): Route["type"] {
  switch (routeType.trim()) {
    case "0":   return "lrt";       // Standard tram / LRT
    case "1":   return "subway";    // Metro / subway
    case "2":   return "subway";    // Commuter rail → treat as subway
    case "3":   return "bus";
    case "900": return "streetcar"; // GTFS extended: city tram / streetcar
    default:    return "bus";
  }
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Parse a GTFS ZIP and return Route objects ready to add as custom lines.
 *
 * Throws `GTFSImportError` with a human-readable message on any structural
 * problem.  Other exceptions (network, zip decode) propagate normally.
 */
export async function importGTFS(zip: ZipLike): Promise<Route[]> {
  // ── 1. Read all required (and optional) files ──────────────────────────────
  const [routesCsv, tripsCsv, stopTimesCsv, stopsCsv, shapesCsv] =
    await Promise.all([
      readFile(zip, "routes.txt",     true),
      readFile(zip, "trips.txt",      true),
      readFile(zip, "stop_times.txt", true),
      readFile(zip, "stops.txt",      true),
      readFile(zip, "shapes.txt",     false),
    ]);

  const routeRows    = parseCsv(routesCsv);
  const tripRows     = parseCsv(tripsCsv);
  const stopTimeRows = parseCsv(stopTimesCsv);
  const stopRows     = parseCsv(stopsCsv);

  if (routeRows.length === 0)    throw new GTFSImportError("routes.txt contains no data rows.");
  if (stopRows.length === 0)     throw new GTFSImportError("stops.txt contains no data rows.");
  if (stopTimeRows.length === 0) throw new GTFSImportError("stop_times.txt contains no data rows.");

  // ── 2. Build stop lookup: stop_id → { name, coords } ──────────────────────
  const stopById = new Map<string, { name: string; coords: [number, number] }>();
  for (const s of stopRows) {
    if (!s.stop_id) continue;
    const lat = parseFloat(s.stop_lat ?? "");
    const lon = parseFloat(s.stop_lon ?? "");
    if (isNaN(lat) || isNaN(lon)) continue;
    stopById.set(s.stop_id, {
      name:   s.stop_name || s.stop_id,
      coords: [lon, lat],
    });
  }

  if (stopById.size === 0)
    throw new GTFSImportError("stops.txt has no rows with valid stop_id / stop_lat / stop_lon.");

  // ── 3. Build trip metadata: trip_id → { routeId, direction, shapeId } ─────
  type TripMeta = { routeId: string; direction: string; shapeId: string };
  const tripMeta = new Map<string, TripMeta>();
  for (const t of tripRows) {
    if (!t.trip_id || !t.route_id) continue;
    tripMeta.set(t.trip_id, {
      routeId:   t.route_id,
      direction: t.direction_id ?? "0",
      shapeId:   t.shape_id ?? "",
    });
  }

  // ── 4. Group stop times by trip_id ────────────────────────────────────────
  const stopsByTrip = new Map<string, { seq: number; stopId: string }[]>();
  for (const st of stopTimeRows) {
    if (!st.trip_id || !st.stop_id) continue;
    const arr = stopsByTrip.get(st.trip_id) ?? [];
    arr.push({ seq: parseInt(st.stop_sequence ?? "0", 10), stopId: st.stop_id });
    stopsByTrip.set(st.trip_id, arr);
  }

  // ── 5. Find the best trip per route (longest, prefer direction 0) ──────────
  const bestTrip = new Map<string, { tripId: string; stopCount: number; meta: TripMeta }>();
  for (const [tripId, meta] of tripMeta) {
    const stops = stopsByTrip.get(tripId);
    if (!stops) continue;
    const count   = stops.length;
    const current = bestTrip.get(meta.routeId);
    const isDir0  = meta.direction === "0";
    // Prefer more stops; break ties by preferring direction 0.
    if (
      !current ||
      count > current.stopCount ||
      (count === current.stopCount && isDir0 && current.meta.direction !== "0")
    ) {
      bestTrip.set(meta.routeId, { tripId, stopCount: count, meta });
    }
  }

  // ── 6. Parse optional shapes ───────────────────────────────────────────────
  const shapeById = new Map<string, [number, number][]>();
  if (shapesCsv) {
    const shapeRows = parseCsv(shapesCsv);
    const raw = new Map<string, { seq: number; coords: [number, number] }[]>();
    for (const sh of shapeRows) {
      if (!sh.shape_id) continue;
      const lat = parseFloat(sh.shape_pt_lat ?? "");
      const lon = parseFloat(sh.shape_pt_lon ?? "");
      const seq = parseInt(sh.shape_pt_sequence ?? "0", 10);
      if (isNaN(lat) || isNaN(lon)) continue;
      const arr = raw.get(sh.shape_id) ?? [];
      arr.push({ seq, coords: [lon, lat] });
      raw.set(sh.shape_id, arr);
    }
    for (const [id, pts] of raw) {
      pts.sort((a, b) => a.seq - b.seq);
      shapeById.set(id, pts.map((p) => p.coords));
    }
  }

  // ── 7. Assemble Route objects ──────────────────────────────────────────────
  const routes: Route[] = [];

  for (const r of routeRows) {
    if (!r.route_id) continue;
    const best = bestTrip.get(r.route_id);
    if (!best) continue; // no trips → skip

    const stopTimes = (stopsByTrip.get(best.tripId) ?? []).slice();
    stopTimes.sort((a, b) => a.seq - b.seq);

    const stops = stopTimes
      .map((st) => stopById.get(st.stopId))
      .filter((s): s is { name: string; coords: [number, number] } => s !== undefined);

    if (stops.length < 2) continue; // degenerate

    const color     = r.route_color     ? `#${r.route_color}`     : "#888888";
    const textColor = r.route_text_color ? `#${r.route_text_color}` : "#FFFFFF";
    const shortName = r.route_short_name || r.route_id;
    const longName  = r.route_long_name  || shortName;
    const shape     = best.meta.shapeId ? shapeById.get(best.meta.shapeId) : undefined;

    routes.push({
      id:          `gtfs-import-${r.route_id}`,
      name:        longName,
      shortName,
      color,
      textColor,
      type:        gtfsRouteType(r.route_type ?? "3"),
      description: longName,
      frequency:   "See timetable",
      stops,
      ...(shape ? { shape } : {}),
    });
  }

  if (routes.length === 0) {
    throw new GTFSImportError(
      "No valid routes could be built from this GTFS feed. " +
      "Make sure routes.txt, trips.txt, stop_times.txt, and stops.txt are " +
      "populated and that stop coordinates are present.",
    );
  }

  return routes;
}
