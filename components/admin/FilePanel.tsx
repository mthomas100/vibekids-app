"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { compose } from "../../lib/preview/compose";
import { VersionTimeline } from "./VersionTimeline";
import { DiffView } from "./DiffView";
import { SandboxedPreview } from "./SandboxedPreview";
import { highlight, langForContentType } from "../../lib/admin/highlighter";

type Tab = "rendered" | "source" | "diff";

// The main panel for one file: its version history drives everything. We read the full
// snapshot list (newest first); HEAD is versions[0]. selectedVersion lets later commits
// (timeline) point the tabs at any historical snapshot — for now it defaults to HEAD.
// Remount on fileId change via a key in AdminConsole, so selection resets per file.
export function FilePanel({ fileId }: { fileId: Id<"files"> }) {
  const versions = useQuery(api.fileVersions.listForFile, { fileId });
  const [tab, setTab] = useState<Tab>("rendered");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  if (versions === undefined)
    return <Center>Loading history…</Center>;
  if (versions.length === 0)
    return <Center>No history for this file yet.</Center>;

  const headVersion = versions[0].version;
  const snap =
    versions.find((v) => v.version === (selectedVersion ?? headVersion)) ?? versions[0];
  const isHead = snap.version === headVersion;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2">
          <span className="truncate font-mono text-sm text-zinc-200">{snap.path}</span>
          <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            v{snap.version}
            {isHead ? " · current" : ""}
          </span>
          <div className="ml-auto flex gap-1">
            {(["rendered", "source", "diff"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 text-sm capitalize transition-colors ${
                  tab === t ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "rendered" ? (
            <RenderedView snap={snap} />
          ) : tab === "source" ? (
            <SourceView content={snap.content} contentType={snap.contentType} path={snap.path} />
          ) : (
            <DiffView versions={versions} />
          )}
        </div>
      </div>
      <VersionTimeline
        fileId={fileId}
        versions={versions}
        headVersion={headVersion}
        selectedVersion={selectedVersion}
        onSelectVersion={setSelectedVersion}
      />
    </div>
  );
}

// Render a single historical snapshot in a sandboxed iframe. Each file in the DB is a
// self-contained HTML doc, so we pass the one snapshot to compose() as the entry.
function RenderedView({ snap }: { snap: Doc<"fileVersions"> }) {
  const srcDoc = compose(
    [{ path: snap.path, content: snap.content, contentType: snap.contentType }],
    snap.path,
  );
  if (!srcDoc)
    return <Center>Can’t render {snap.contentType} — try the Source tab.</Center>;
  return <SandboxedPreview srcDoc={srcDoc} title="Rendered app" />;
}

// Source with VS-Code-grade highlighting (Shiki, #28). Highlights client-side via a shared
// singleton; while it loads (or on error) we fall back to the plain monospace gutter, so
// there's never a blank/regressed state. Sparky writes indented HTML, so it reads cleanly.
function SourceView({
  content,
  contentType,
  path,
}: {
  content: string;
  contentType: string;
  path: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setHtml(null);
    highlight(content, langForContentType(contentType, path))
      .then((out) => alive && setHtml(out))
      .catch(() => alive && setHtml(null));
    return () => {
      alive = false;
    };
  }, [content, contentType, path]);

  if (html)
    return <div className="admin-shiki" dangerouslySetInnerHTML={{ __html: html }} />;

  const lines = content.split("\n");
  return (
    <div className="h-full overflow-auto bg-zinc-900 text-sm leading-6">
      <table className="border-collapse font-mono">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td className="sticky left-0 select-none border-r border-zinc-800 bg-zinc-900 px-3 text-right align-top text-zinc-600">
                {i + 1}
              </td>
              <td className="whitespace-pre px-4 text-zinc-200">{line || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-zinc-500">
      {children}
    </div>
  );
}
