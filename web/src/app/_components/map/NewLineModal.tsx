"use client";

import { useState, useEffect } from "react";
import type { Route } from "~/app/map/transit-data";

const PRESET_COLORS = ["#6366f1","#ef4444","#f59e0b","#22c55e","#0ea5e9","#ec4899","#8b5cf6","#14b8a6","#f97316","#64748b"];

export function NewLineModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (name: string, color: string, type: Route["type"], shortName: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [shortNameTouched, setShortNameTouched] = useState(false);
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [type, setType] = useState<Route["type"]>("subway");

  // Auto-derive shortName from name unless user has manually edited it
  useEffect(() => {
    if (!shortNameTouched) {
      const words = name.trim().split(/\s+/);
      const derived = words.length >= 2
        ? (words[0]![0]! + words[1]![0]!).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      setShortName(derived);
    }
  }, [name, shortNameTouched]);

  const displayShortName = shortName || name.slice(0, 2).toUpperCase() || "?";
  const canConfirm = name.trim().length > 0;
  const handleConfirm = () => {
    if (canConfirm) onConfirm(name.trim(), color, type, displayShortName);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-72 rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-stone-800">New Line</h3>

        {/* Name + badge preview */}
        <div className="flex items-center gap-2">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            placeholder="Line name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canConfirm) handleConfirm(); }}
          />
          {/* live badge preview */}
          <div
            className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1"
            style={{ background: color }}
          >
            <span className="text-[9px] font-bold leading-none whitespace-nowrap" style={{ color: "#ffffff" }}>
              {displayShortName}
            </span>
          </div>
        </div>

        {/* Short name override */}
        <div className="mt-2">
          <input
            className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400"
            placeholder="Badge label (auto)"
            maxLength={4}
            value={shortName}
            onChange={(e) => {
              setShortName(e.target.value.toUpperCase());
              setShortNameTouched(e.target.value.length > 0);
            }}
          />
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-stone-500">Type</p>
          <div className="flex gap-1.5">
            {(["subway", "streetcar", "bus"] as Route["type"][]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize transition-colors ${type === t ? "border-stone-800 bg-stone-900 text-white" : "border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-stone-500">Color</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-stone-400" : "hover:scale-110"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-black"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
