import { NextResponse } from "next/server";
import { transit_realtime } from "gtfs-realtime-bindings";

const TTC_VEHICLES_URL = "https://bustime.ttc.ca/gtfsrt/vehicles";

export interface VehiclePosition {
  id: string;
  lat: number;
  lng: number;
  bearing?: number;
  routeId?: string;
  tripId?: string;
  label?: string;
}

export async function GET() {
  try {
    const res = await fetch(TTC_VEHICLES_URL, {
      next: { revalidate: 15 }, // cache 15s
      headers: { "Accept": "application/x-google-protobuf" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error", status: res.status }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    const vehicles: VehiclePosition[] = [];
    for (const entity of feed.entity) {
      const v = entity.vehicle;
      if (!v?.position) continue;
      vehicles.push({
        id: entity.id,
        lat: v.position.latitude,
        lng: v.position.longitude,
        bearing: v.position.bearing ?? undefined,
        routeId: v.trip?.routeId ?? undefined,
        tripId: v.trip?.tripId ?? undefined,
        label: v.vehicle?.label ?? undefined,
      });
    }

    return NextResponse.json({ vehicles, updatedAt: Date.now() });
  } catch (err) {
    console.error("Vehicles API error:", err);
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}
