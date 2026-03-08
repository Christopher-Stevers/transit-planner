"use client";

import type { Route } from "~/app/map/mock-data";

export function StationPopup({
  popup,
  allRoutes,
  isDeletable,
  connectedRoutes,
  onClose,
  onDelete,
  onAddTransfer,
  onRemoveTransfer,
}: {
  popup: { name: string; routeId: string; x: number; y: number };
  allRoutes: Route[];
  isDeletable: boolean;
  connectedRoutes: Route[];
  onClose: () => void;
  onDelete: () => void;
  onAddTransfer: (targetRouteId: string) => void;
  onRemoveTransfer: (targetRouteId: string) => void;
}) {
  const currentRoute = allRoutes.find((r) => r.id === popup.routeId);
  const connectedIds = new Set(connectedRoutes.map((r) => r.id));
  const transferableRoutes = allRoutes.filter((r) => r.id !== popup.routeId && !connectedIds.has(r.id));
  return (
    <div
      className="pointer-events-auto absolute z-20 w-52 rounded-xl border border-stone-200 bg-white p-3 shadow-lg"
      style={{ left: popup.x, top: popup.y, transform: "translate(-50%, calc(-100% - 12px))" }}
    >
      {/* Arrow */}
      <div
        className="absolute left-1/2 -bottom-[6px] -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent"
        style={{ borderTopColor: "#e7e5e4" }}
      />
      <div
        className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent"
        style={{ borderTopColor: "#ffffff" }}
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-5 shrink-0 rounded-full"
            style={{ background: currentRoute?.color ?? "#94a3b8" }}
          />
          <span className="truncate text-sm font-semibold text-stone-800">{popup.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isDeletable && (
            <button
              onClick={onDelete}
              title="Remove stop"
              className="rounded p-0.5 text-stone-300 hover:bg-red-50 hover:text-red-400 transition-colors"
            >
              <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="currentColor">
                <path fillRule="evenodd" d="M6 1a1.75 1.75 0 0 0-1.736 1.502H2.75a.75.75 0 0 0 0 1.5h.148l.465 6.52A1.75 1.75 0 0 0 5.11 12h3.78a1.75 1.75 0 0 0 1.747-1.478l.465-6.52h.148a.75.75 0 0 0 0-1.5H9.736A1.75 1.75 0 0 0 8 1H6Zm1 1.5a.25.25 0 0 0-.247.215L6.5 2.5h1l-.253-.285A.25.25 0 0 0 7 2.5Zm-1.5 3a.5.5 0 0 1 1 0l-.2 4a.3.3 0 0 1-.6 0l-.2-4Zm2.5 0a.5.5 0 0 1 1 0l-.2 4a.3.3 0 0 1-.6 0l-.2-4Z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11"/>
            </svg>
          </button>
        </div>
      </div>
      {connectedRoutes.length > 0 && (
        <div className="mb-2">
          <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-stone-400 uppercase">
            Connections
          </p>
          <div className="flex flex-wrap gap-1.5">
            {connectedRoutes.map((r) => (
              <button
                key={r.id}
                onClick={() => onRemoveTransfer(r.id)}
                title={`Remove connection to ${r.name}`}
                className="group flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ background: r.color, color: r.textColor }}
              >
                <span>{r.shortName}</span>
                <span className="opacity-60 group-hover:opacity-100">×</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {transferableRoutes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-stone-400 uppercase">
            Add transfer to
          </p>
          <div className="flex flex-wrap gap-1.5">
            {transferableRoutes.map((r) => (
              <button
                key={r.id}
                onClick={() => onAddTransfer(r.id)}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: r.color, color: r.textColor }}
              >
                <span>{r.shortName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
