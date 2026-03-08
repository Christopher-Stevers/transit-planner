import type { Route } from "~/app/map/mock-data";

export function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!, yi = ring[i]![1]!;
    const xj = ring[j]![0]!, yj = ring[j]![1]!;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInGeometry(pt: [number, number], geom: GeoJSON.Geometry): boolean {
  if (geom.type === "Polygon") {
    return pointInRing(pt[0], pt[1], (geom.coordinates as number[][][])[0]!);
  }
  if (geom.type === "MultiPolygon") {
    return (geom.coordinates as number[][][][]).some((poly) => pointInRing(pt[0], pt[1], poly[0]!));
  }
  return false;
}

export function geomBBox(geom: GeoJSON.Geometry): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function walk(c: unknown) {
    if (Array.isArray(c) && typeof c[0] === "number") {
      if (c[0]! < minX) minX = c[0]!;
      if (c[1]! < minY) minY = c[1]!;
      if (c[0]! > maxX) maxX = c[0]!;
      if (c[1]! > maxY) maxY = c[1]!;
    } else if (Array.isArray(c)) { c.forEach(walk); }
  }
  walk((geom as unknown as { coordinates: unknown }).coordinates);
  return [minX, minY, maxX, maxY];
}

export function firstCoord(geom: GeoJSON.Geometry): [number, number] | null {
  let result: [number, number] | null = null;
  function walk(c: unknown): boolean {
    if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
      result = [c[0] as number, c[1] as number]; return true;
    }
    if (Array.isArray(c)) { for (const x of c) if (walk(x)) return true; }
    return false;
  }
  walk((geom as unknown as { coordinates: unknown }).coordinates);
  return result;
}

/** Catmull-Rom spline interpolation for a single axis */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  );
}

/** Insert smooth curve points between each pair of coordinates using Catmull-Rom spline */
function smoothCoords(coords: [number, number][], steps = 12): [number, number][] {
  if (coords.length < 2) return coords;
  const result: [number, number][] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)]!;
    const p1 = coords[i]!;
    const p2 = coords[i + 1]!;
    const p3 = coords[Math.min(coords.length - 1, i + 2)]!;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push([catmullRom(p0[0], p1[0], p2[0], p3[0], t), catmullRom(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  result.push(coords[coords.length - 1]!);
  return result;
}

export function routeToGeoJSON(route: Route): GeoJSON.Feature<GeoJSON.LineString> {
  const raw = route.shape ?? route.stops.map((s) => s.coords);
  return {
    type: "Feature",
    properties: { id: route.id },
    geometry: {
      type: "LineString",
      coordinates: smoothCoords(raw),
    },
  };
}

export function stopsToGeoJSON(route: Route): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: route.stops.map((s) => ({
      type: "Feature",
      properties: { name: s.name, routeId: route.id, color: route.color },
      geometry: { type: "Point", coordinates: s.coords },
    })),
  };
}
