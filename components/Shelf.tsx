"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";

// The kid-facing "My Apps" shelf (ADR 0010 / M5). One card per project — each project IS
// one app. "+ New app" creates a fresh empty project and opens it; Sparky names it on the
// first build. This is the unit that has its own files, history, and time machine.

// Every app gets a stable fun sticker + tilt from its id — no schema field needed.
const STICKERS = ["🎮", "🎨", "🚀", "🐉", "🌈", "🤖", "🦄", "⚽", "🍕", "🎸", "🐱", "✨"];
function stickerFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return STICKERS[h % STICKERS.length];
}
const TILTS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-0"];
function tiltFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return TILTS[h % TILTS.length];
}

export function Shelf({
  workspaceId,
  projects,
  activeId,
  onOpen,
}: {
  workspaceId: string;
  projects: Doc<"projects">[];
  activeId: Id<"projects"> | null;
  onOpen: (id: Id<"projects">) => void;
}) {
  const createProject = useMutation(api.projects.create);
  const [busy, setBusy] = useState(false);

  const newApp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await createProject({ workspaceId, name: "New app" });
      onOpen(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto px-6 py-10">
      <h1 className="font-display text-4xl font-extrabold text-ink">
        My <span className="text-coral">Apps</span>{" "}
        <span className="inline-block -rotate-6">🧸</span>
      </h1>
      <p className="mb-8 mt-2 font-semibold text-ink-soft">
        Pick one to keep building — or start a brand-new one!
      </p>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-5 pb-10 sm:grid-cols-3">
        <button
          type="button"
          onClick={newApp}
          disabled={busy}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-aqua-deep/50 bg-aqua/10 text-aqua-deep transition hover:-translate-y-1 hover:border-aqua-deep hover:bg-aqua/20 disabled:opacity-60"
        >
          <span className="font-display text-6xl font-bold">＋</span>
          <span className="font-display text-lg font-bold">{busy ? "Making…" : "New app"}</span>
        </button>
        {projects.map((p, i) => (
          <button
            key={p._id}
            type="button"
            onClick={() => onOpen(p._id)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`card-sticker vk-pop-in flex aspect-square flex-col items-center justify-center gap-2 p-4 text-center transition hover:-translate-y-1.5 hover:shadow-toy-lg ${tiltFor(p._id)} ${
              p._id === activeId ? "border-coral bg-coral/5" : ""
            }`}
          >
            <span className="text-6xl drop-shadow-sm">{stickerFor(p._id)}</span>
            <span className="font-display line-clamp-2 text-lg font-bold leading-tight text-ink">
              {p.name}
            </span>
            <span className="text-xs font-bold text-ink-faint">
              {new Date(p.updatedAt).toLocaleDateString()}
            </span>
            {p._id === activeId && (
              <span className="rounded-full border-2 border-coral-deep/40 bg-coral/15 px-2 py-0.5 font-display text-[11px] font-bold text-coral-deep">
                NOW PLAYING
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
