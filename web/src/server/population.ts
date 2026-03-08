import "server-only";

import { supabase } from "./supabase";

export type PopulationRow = {
  latitude: number;
  longitude: number;
  population: number;
  area: number;
};

/**
 * Fetch population data from the Supabase `pop_data` table.
 * Returns coordinates (as [lng, lat]), population count, and area (km²)
 * for each census block.
 */
export async function fetchPopulationData(): Promise<PopulationRow[]> {
  const PAGE_SIZE = 1000;
  const rows: PopulationRow[] = [];
  let offset = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from("pop_data")
      .select("latitude, longitude, population, area")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch population data: ${error.message}`);
    }

    if (!data || data.length === 0) {
      done = true;
    } else {
      rows.push(...(data as PopulationRow[]));
      if (data.length < PAGE_SIZE) {
        done = true;
      } else {
        offset += PAGE_SIZE;
      }
    }
  }

  return rows;
}
