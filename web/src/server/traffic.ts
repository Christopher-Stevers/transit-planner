import "server-only";
import { supabase } from "./supabase";

type TrafficMapRow = {
  id: number;
  geom: GeoJSON.Geometry;
  avg_traffic: number | null;
  traffic_color: string | null;
};

async function fetchAllPages<T>(table: string, select: string): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

export async function fetchTrafficData(): Promise<GeoJSON.FeatureCollection> {
  const rows = await fetchAllPages<TrafficMapRow>(
    "traffic_map",
    "id, geom, avg_traffic, traffic_color",
  );

  const features: GeoJSON.Feature[] = rows
    .filter((r) => r.geom)
    .map((r) => ({
      type: "Feature",
      properties: {
        id: r.id,
        avg_traffic: r.avg_traffic,
        traffic_color: r.traffic_color,
      },
      geometry: r.geom,
    }));

  return { type: "FeatureCollection", features };
}
