"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { SplitScreen } from "../components/SplitScreen";
import { Shelf } from "../components/Shelf";
import { sendChatTurn } from "../lib/chat";

// v0: no auth. A workspace is an anonymous id in localStorage holding MANY projects — and
// each project IS one app (ADR 0010). The shelf switches between apps; "+ New app" makes one.
export default function Home() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<Id<"projects"> | null>(null);
  const [showShelf, setShowShelf] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("vbk_workspace");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("vbk_workspace", id);
    }
    setWorkspaceId(id);
    const saved = localStorage.getItem("vbk_active_project");
    if (saved) setActiveId(saved as Id<"projects">);
  }, []);

  const projects = useQuery(
    api.projects.listForWorkspace,
    workspaceId ? { workspaceId } : "skip",
  );
  const createProject = useMutation(api.projects.create);
  const creating = useRef(false);

  // First-run bootstrap: a brand-new workspace gets one app so the kid lands straight in the
  // builder. Every other app is made explicitly from the shelf.
  useEffect(() => {
    if (!workspaceId || projects === undefined) return;
    if (projects.length === 0 && !creating.current) {
      creating.current = true;
      void createProject({ workspaceId, name: "My First App" });
    } else if (projects.length > 0) {
      creating.current = false;
    }
  }, [workspaceId, projects, createProject]);

  // The active app: the saved selection if it still exists, else the most-recent project.
  const activeProject =
    projects?.find((p) => p._id === activeId) ?? projects?.[0] ?? null;

  useEffect(() => {
    if (activeProject) localStorage.setItem("vbk_active_project", activeProject._id);
  }, [activeProject]);

  const openApp = (id: Id<"projects">) => {
    setActiveId(id);
    setShowShelf(false);
  };

  // Start the kid's idea as its OWN new app, straight from the chat (the "newapp" chip
  // Sparky offers when they ask for a totally different app). Make the project, switch to
  // it, then kick off its first build with their prompt — no trip to the shelf, no retype.
  const startAppFromIdea = async (name: string, prompt: string) => {
    if (!workspaceId) return;
    const id = await createProject({ workspaceId, name });
    setActiveId(id);
    setShowShelf(false);
    await sendChatTurn(id, prompt);
  };

  if (!workspaceId || projects === undefined) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <span className="animate-bounce text-6xl">⚡</span>
        <span className="font-display text-2xl font-bold text-ink-soft">
          Warming up Sparky…
        </span>
      </div>
    );
  }

  if (showShelf || !activeProject) {
    return (
      <Shelf
        workspaceId={workspaceId}
        projects={projects}
        activeId={activeProject?._id ?? null}
        onOpen={openApp}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-[3px] border-ink/10 bg-card px-4 py-2.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">
          Vibe<span className="text-coral">Kids</span>
          <span className="ml-0.5 inline-block -rotate-6 text-sun">⚡</span>
        </span>
        <span className="mx-1 hidden h-6 w-[2.5px] rounded-full bg-ink/10 sm:block" />
        <span className="font-display truncate text-base font-bold text-ink-soft">
          {activeProject.name}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowShelf(true)}
          className="btn-toy border-sun-deep bg-sun px-4 py-1.5 text-sm text-ink"
        >
          🧸 My Apps
        </button>
      </header>
      <SplitScreen key={activeProject._id} projectId={activeProject._id} onStartApp={startAppFromIdea} />
    </div>
  );
}
