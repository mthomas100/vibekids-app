"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { compose } from "../lib/preview/compose";

// The kid's app, on stage — framed like a little arcade console so "the thing I made"
// feels like a real running machine, not a document.
//
// The composed doc carries an injected error catcher (lib/preview/compose.ERROR_CATCHER)
// that postMessages runtime errors out of the sandbox. We surface them as a friendly
// snag banner with an "ask Sparky to fix it" button — the fix request travels to
// AvatarChat via a window CustomEvent ("vk-fix-request"), which queues a normal build
// turn with the error text (the auto-heal loop Lovable/Bolt have and we lacked).
export function PreviewPane({ projectId }: { projectId: Id<"projects"> }) {
  const files = useQuery(api.files.listForProject, { projectId });
  const project = useQuery(api.projects.get, { projectId });
  const srcDoc = useMemo(
    () => (files && files.length ? compose(files, project?.entryPath) : null),
    [files, project?.entryPath],
  );

  const [snag, setSnag] = useState<string | null>(null);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; message?: string } | null;
      if (d && d.type === "vk-error" && typeof d.message === "string") {
        setSnag((s) => s ?? d.message!.slice(0, 300)); // first error wins until dismissed
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  // A fresh doc gets a fresh chance — drop the banner when the app is rebuilt
  // (render-time adjustment, not an effect).
  const [prevDoc, setPrevDoc] = useState(srcDoc);
  if (prevDoc !== srcDoc) {
    setPrevDoc(srcDoc);
    setSnag(null);
  }

  const askSparkyToFix = () => {
    if (!snag) return;
    window.dispatchEvent(
      new CustomEvent("vk-fix-request", {
        detail: `My app has an error that says: "${snag}". Please fix it so it works again!`,
      }),
    );
    setSnag(null);
  };

  return (
    <div className="flex h-full flex-col p-3 md:p-4">
      <div className="card-sticker flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* console top bar */}
        <div className="flex shrink-0 items-center gap-2 border-b-[2.5px] border-ink/10 bg-sky px-4 py-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full border-2 border-coral-deep bg-coral" />
            <span className="h-3 w-3 rounded-full border-2 border-sun-deep bg-sun" />
            <span className="h-3 w-3 rounded-full border-2 border-lime-deep bg-lime" />
          </span>
          <span className="font-display text-sm font-bold tracking-wide text-ink-soft">
            {project?.name ?? "YOUR APP"}
          </span>
          <span className="ml-auto rounded-full border-2 border-aqua-deep/40 bg-aqua/20 px-2 py-0.5 font-display text-xs font-bold text-aqua-deep">
            ▶ LIVE
          </span>
        </div>
        <div className="relative min-h-0 flex-1 bg-card">
          {srcDoc ? (
            <>
              <iframe
                title="Your app"
                // SECURITY: allow-scripts WITHOUT allow-same-origin → opaque origin,
                // no access to parent page / cookies / storage. Never add same-origin here.
                sandbox="allow-scripts allow-modals"
                srcDoc={srcDoc}
                className="absolute inset-0 h-full w-full border-0 bg-white"
              />
              {snag && (
                <div className="vk-pop-in absolute inset-x-3 bottom-3 z-10">
                  <div className="card-sticker flex flex-wrap items-center gap-2 border-sun-deep bg-sun/95 p-3">
                    <span className="text-2xl" aria-hidden="true">🔧</span>
                    {/* Sparky OWNS the error (he wrote the code) — never blame the kid's app */}
                    <span className="min-w-0 flex-1 font-display text-sm font-bold leading-tight text-ink">
                      Oops — I goofed something in there! Want me to fix it?
                    </span>
                    <button
                      type="button"
                      onClick={askSparkyToFix}
                      className="btn-toy border-coral-deep bg-coral px-4 py-1.5 text-sm text-ink"
                    >
                      Yes — fix it, Sparky!
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnag(null)}
                      aria-label="Dismiss"
                      className="rounded-full px-2 py-1 font-bold text-ink-soft transition hover:bg-card"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="text-6xl" aria-hidden="true">
                🎪
              </span>
              <p className="font-display text-xl font-bold text-ink">
                Your app will show up right here!
              </p>
              <p className="max-w-xs font-semibold text-ink-soft">
                Tell Sparky what to make — a game, a drawing app, anything! 👈✨
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
