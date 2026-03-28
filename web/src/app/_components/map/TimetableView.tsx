"use client";

import type { Route } from "~/app/map/transit-data";
import { computeTimetable, formatTime } from "~/lib/timetable";

interface TimetableViewProps {
  route: Route;
  /** Extra stops override (from routeExtraStops state). Pass undefined or [] to use route.stops. */
  extraStops?: { name: string; coords: [number, number] }[];
}

function pluralMin(n: number): string {
  return n === 1 ? "min" : "min";
}

export function TimetableView({ route, extraStops }: TimetableViewProps) {
  const usedStops =
    extraStops && extraStops.length > 0 ? extraStops : route.stops;

  if (!usedStops || usedStops.length < 2) {
    return <div className="text-xs text-stone-400">No stops defined yet.</div>;
  }

  const data = computeTimetable(route, extraStops);
  const tripsToShow = data.tripDepartures.slice(0, 6);
  const remaining = Math.max(0, data.totalTrips - tripsToShow.length);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-stone-700">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: route.color }}
        />
        <span className="truncate">
          {data.dayLabel} · {data.operatingHours} · Every {data.headwayMinutes}{" "}
          {pluralMin(data.headwayMinutes)}
        </span>
      </div>

      <div className="max-h-[220px] overflow-auto rounded-lg border border-stone-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-20 bg-stone-100">
            <tr>
              <th className="sticky left-0 z-30 bg-stone-100 px-2 py-1 text-left font-semibold text-stone-700">
                Stop
              </th>
              {tripsToShow.map((dep) => (
                <th
                  key={dep}
                  className="whitespace-nowrap px-2 py-1 text-right font-semibold text-stone-700"
                >
                  {formatTime(dep)}
                </th>
              ))}
              {remaining > 0 && (
                <th className="whitespace-nowrap px-2 py-1 text-right font-medium text-stone-500">
                  +{remaining} more
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.stops.map((s, rowIdx) => (
              <tr key={`${s.stopName}-${rowIdx}`} className="even:bg-stone-50">
                <td
                  className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-stone-700"
                  title={s.stopName}
                >
                  <div className="max-w-[18ch] truncate">{s.stopName}</div>
                </td>
                {tripsToShow.map((dep) => (
                  <td
                    key={`${rowIdx}-${dep}`}
                    className="whitespace-nowrap px-2 py-1 text-right text-stone-600"
                  >
                    {formatTime(dep + s.offsetMinutes)}
                  </td>
                ))}
                {remaining > 0 && (
                  <td className="px-2 py-1 text-right text-stone-300">…</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

