"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { SuggestionChips } from "./SuggestionChips";
import { speak, speakBubble, markSpoken, stopSpeaking, speechSupported, onSpeakingChange, isSpeaking } from "../lib/voice/speak";
import { useSpeechInput, speechInputSupported } from "../lib/voice/useSpeechInput";
import { SparkyAvatar } from "./SparkyAvatar";
import { useBuildLifecycle } from "../lib/buildMood";
import { sendChatTurn, sendInterviewAction, type InterviewAction } from "../lib/chat";
import { BuildShow } from "./BuildShow";
import { Celebration } from "./Celebration";
import { StarterIdeas } from "./StarterIdeas";
import { DreamDoor, InterviewPanel } from "./InterviewPanel";
import { playTap } from "../lib/sound";

export function AvatarChat({
  projectId,
  onStartApp,
}: {
  projectId: Id<"projects">;
  onStartApp: (name: string, prompt: string) => void | Promise<void>;
}) {
  const messages = useQuery(api.messages.listForProject, { projectId });
  const suggestions = useQuery(api.suggestions.listForProject, { projectId });
  const buildStatus = useQuery(api.buildStatus.getForProject, { projectId });
  const brief = useQuery(api.briefs.getForProject, { projectId });
  const files = useQuery(api.files.listForProject, { projectId });
  const markUsed = useMutation(api.suggestions.markUsed);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // A Dream-It-Up POST is in flight (start / answer / build-now …). Distinct from
  // `busy` (a build turn): the interview is a conversation, not a build.
  const [interviewBusy, setInterviewBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // A mid-build tap (or typed message) doesn't interrupt the running build — it's
  // QUEUED and applied as the NEXT turn (ADR 0005: the micro-choice feeds the next
  // turn, never injected mid-build). The drain effect pops it when the build ends.
  const [queue, setQueue] = useState<{ label: string; prompt: string; source?: "interview" }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice (ADR 0006). Mounted-gated so the browser-only Web Speech APIs don't cause an
  // SSR/client hydration mismatch. Read-aloud + push-to-talk; push-to-talk only FILLS
  // the input (never auto-sends — confirm-before-send).
  const [voiceReady, setVoiceReady] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const lastKidRef = useRef<string | null>(null);
  const replaceNextRef = useRef(true);
  // "Now" at the moment this view opened (set in the mount effect below). A beat created
  // after this — minus a grace window for the create-project-then-build race — is NEW, so
  // read it; anything older is pre-existing history → never read. Skew-tolerant baseline
  // that replaces the old firstLoad flag.
  const mountedAtRef = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  // Baseline for "what's new vs history". Runs before the read effect on first commit.
  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);
  // Switching projects (or unmounting) silences this view's read-aloud immediately.
  useEffect(() => () => stopSpeaking(), [projectId]);
  useEffect(() => {
    setVoiceReady(speechSupported());
    setSttReady(speechInputSupported());
    setSpeaking(isSpeaking());
    return onSpeakingChange(setSpeaking); // mouth moves while audio plays
  }, []);
  // Push-to-talk fills the input — it never auto-sends.
  const { listening, start: startListening, stop: stopListening } = useSpeechInput((t) =>
    setInput(t),
  );

  // A new turn (new kid message) → its first spoken beat should JUMP the queue: interrupt any
  // stale/leftover speech and read NOW. Later beats of the same turn ("it's ready!", a
  // suggestion) queue politely after, so a fast build can't cut the hype off.
  useEffect(() => {
    if (!messages) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "kid") {
        if (messages[i]._id !== lastKidRef.current) {
          lastKidRef.current = messages[i]._id;
          replaceNextRef.current = true;
        }
        break;
      }
    }
  }, [messages]);

  // Read each newly-finished Sparky beat once, in order — never skip one when several land at
  // once (hype + "What style?" + "ready!"). The first beat of a new turn jumps the queue
  // (interrupt stale speech + read now); the rest queue politely after. "New" = created after
  // this view opened (grace-windowed for the create-then-build race); older = history, and
  // muted beats are marked handled so toggling read-aloud on never replays them. speakBubble()
  // owns once-per-bubble dedup AND cross-tab single-reader — a remount, React StrictMode, or a
  // second open tab on the same project can't double-read.
  useEffect(() => {
    if (!messages) return;
    const cutoff = (mountedAtRef.current ?? Date.now()) - 4000; // older than this = pre-existing history
    for (const m of messages) {
      if (m.role !== "avatar" || m.streaming || !m.text) continue;
      // Pre-existing history, or muted → mark handled so it's never (re)read — even after a
      // remount, or when read-aloud is toggled on later. speakBubble owns once-per-bubble.
      if (m.createdAt < cutoff || !autoRead) {
        markSpoken(m._id);
        continue;
      }
      const jump = replaceNextRef.current; // the first read of a new turn jumps the queue
      replaceNextRef.current = false;
      speakBubble(m._id, m.text, { jump });
    }
  }, [messages, autoRead]);

  function toggleAutoRead() {
    setAutoRead((on) => {
      if (on) stopSpeaking(); // turning off — stop any current speech
      return !on;
    });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, buildStatus, queue, brief]);

  // Fire exactly one build turn against /api/chat.
  async function runTurn(prompt: string, source?: "interview") {
    setBusy(true);
    try {
      await sendChatTurn(projectId, prompt, source);
    } finally {
      setBusy(false);
    }
  }

  // Run now if idle; otherwise remember it as the next turn.
  function enqueue(label: string, prompt: string, source?: "interview") {
    const p = prompt.trim();
    if (!p) return;
    if (busy) {
      setQueue((q) => [...q, { label, prompt: p, source }]);
    } else {
      void runTurn(p, source);
    }
  }

  // When the current build finishes, pop one queued pick and run it.
  useEffect(() => {
    if (busy || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    void runTurn(next.prompt, next.source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, queue]);

  // The preview's "ask Sparky to fix it" button (PreviewPane) speaks to the chat via a
  // window event — the fix request is just a normal queued build turn with the error text.
  useEffect(() => {
    const onFix = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string" && detail.trim()) enqueue("🔧 Fix my app", detail);
    };
    window.addEventListener("vk-fix-request", onFix);
    return () => window.removeEventListener("vk-fix-request", onFix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, queue]);

  // Dream-It-Up mode (the pre-build interview). While a brief is open, the input
  // and taps feed the INTERVIEW, not the build; when an action hands back a
  // compiled brief, it runs as a normal build turn (source:"interview").
  const interviewOpen = brief?.status === "active" || brief?.status === "readyToBuild";

  async function interviewAct(action: InterviewAction, text?: string) {
    playTap();
    setInterviewBusy(true);
    try {
      const res = await sendInterviewAction(projectId, action, text);
      if (res.buildPrompt) enqueue("🚀 Building your dream", res.buildPrompt, "interview");
    } finally {
      setInterviewBusy(false);
    }
  }

  function sendTyped(text: string) {
    const t = text.trim();
    if (!t) return;
    playTap();
    setInput("");
    if (interviewOpen) {
      void interviewAct("answer", t);
    } else {
      enqueue(t, t);
    }
  }

  async function pickChip(id: string) {
    const chip = suggestions?.find((s) => s._id === id);
    if (!chip) return;
    playTap();
    await markUsed({ suggestionId: chip._id });
    const payload = chip.payload as { prompt?: string; name?: string } | undefined;
    // A "newapp" chip spins the idea up as its OWN app (create + switch + first build),
    // instead of building it into the current one — page.tsx owns the switch + kickoff.
    if (chip.kind === "newapp") {
      await onStartApp(payload?.name ?? chip.label, payload?.prompt ?? chip.label);
      return;
    }
    const prompt = payload?.prompt ?? chip.label;
    enqueue(chip.label, prompt);
  }

  const unusedChips = (suggestions ?? []).filter((s) => !s.used).slice(0, 4);
  const streaming = messages?.some((m) => m.streaming);
  const phase = buildStatus?.phase;
  // The empty-canvas offer (door + starter cards): nothing built yet, nothing running,
  // no interview open. Files (not messages) gate it so bailing out of an interview
  // brings the cards back even though the transcript has Sparky's opener in it.
  const noFilesYet = files !== undefined && files.length === 0;
  const showStarters = noFilesYet && !interviewOpen && !interviewBusy && !busy && !streaming;
  const { mood, finishCount, elapsedS } = useBuildLifecycle(buildStatus?.state, {
    // Picking the next question reads as thinking, same as a build turn's ramp-up.
    busy: busy || interviewBusy,
    streaming: !!streaming,
    speaking,
  });

  // What big-Sparky is "saying" right now — his latest line, or the build status while working.
  const lastAvatarLine = (messages ?? []).filter((m) => m.role === "avatar" && m.text).slice(-1)[0]?.text;
  // The kid's most recent ask — what the one-tap retry resends after an error turn.
  const lastKidText = (messages ?? []).filter((m) => m.role === "kid").slice(-1)[0]?.text;
  const heroLine = busy && phase ? phase : lastAvatarLine ?? "Hi! I’m Sparky — what should we make today? ✨";

  return (
    <div className="flex h-full flex-col bg-sky">
      {/* HERO — big, present Sparky (his face up top; the chat log lives below) */}
      <div className="flex items-center gap-4 border-b-[3px] border-ink/10 bg-gradient-to-b from-card to-sky px-5 py-4">
        <SparkyAvatar mood={mood} size={132} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-extrabold text-ink">Sparky</span>
            {voiceReady && (
              <button
                type="button"
                onClick={toggleAutoRead}
                title={autoRead ? "Sparky reads out loud (tap to mute)" : "Have Sparky read out loud"}
                aria-pressed={autoRead}
                className={`btn-toy px-2.5 py-0.5 text-xs ${
                  autoRead
                    ? "border-grape-deep/40 bg-grape/20 text-grape-deep"
                    : "border-ink/15 bg-card text-ink-faint"
                }`}
              >
                {autoRead ? "🔊 On" : "🔇 Off"}
              </button>
            )}
          </div>
          {listening ? (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
                  <span className="sparky-eq h-4 w-1 rounded-full bg-coral" style={{ animationDelay: "0ms" }} />
                  <span className="sparky-eq h-4 w-1 rounded-full bg-coral" style={{ animationDelay: "120ms" }} />
                  <span className="sparky-eq h-4 w-1 rounded-full bg-coral" style={{ animationDelay: "240ms" }} />
                  <span className="sparky-eq h-4 w-1 rounded-full bg-coral" style={{ animationDelay: "360ms" }} />
                </span>
                <p className="font-display text-sm font-bold text-ink">I’m listening — talk to me!</p>
              </div>
              <p className="mt-1 line-clamp-2 min-h-[1.25rem] text-sm italic text-ink-soft">
                {input || "…"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!input.trim()) return;
                    stopListening();
                    sendTyped(input);
                  }}
                  className="btn-toy border-lime-deep bg-lime px-6 py-2 text-base text-ink"
                >
                  ✅ Send it!
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    setInput("");
                  }}
                  title="Cancel"
                  className="btn-toy border-ink/15 bg-card px-3 py-2 text-sm text-ink-soft"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-ink-soft">{heroLine}</p>
              {sttReady && (
                <button
                  type="button"
                  onClick={startListening}
                  title="Talk to Sparky out loud"
                  className="btn-toy mt-2 inline-flex items-center gap-1.5 border-coral-deep bg-coral px-4 py-1.5 text-sm text-ink"
                >
                  🎤 Talk to me!
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages?.map((m) => (
          <Bubble key={m._id} role={m.role} text={m.text} streaming={m.streaming} canSpeak={voiceReady} />
        ))}
        {showStarters && (
          <>
            <DreamDoor onOpen={() => void interviewAct("start")} />
            <StarterIdeas
              onPick={(prompt) => {
                playTap();
                enqueue(prompt, prompt);
              }}
            />
          </>
        )}
        {/* Dream-It-Up: the answering machinery under Sparky's question bubble */}
        {interviewOpen && brief && (
          <InterviewPanel
            brief={brief}
            waiting={interviewBusy}
            onAnswer={(t) => void interviewAct("answer", t)}
            onSomethingElse={() => inputRef.current?.focus()}
            onBuildNow={() => void interviewAct("buildNow")}
            onBuild={() => void interviewAct("build")}
            onChangeSomething={() => void interviewAct("change")}
            onNeverMind={() => void interviewAct("abandon")}
          />
        )}
        {!interviewOpen && <BuildShow phase={phase} state={buildStatus?.state} busy={busy} />}
        {/* the turn died (state=error) → one-tap retry of what the kid last asked */}
        {buildStatus?.state === "error" && !busy && lastKidText && (
          <button
            type="button"
            onClick={() => {
              playTap();
              enqueue("🔁 Try again", lastKidText);
            }}
            className="btn-toy vk-pop-in border-tang-deep bg-tang px-4 py-2 text-sm text-ink"
          >
            🔁 Let’s try that again!
          </button>
        )}
      </div>

      {/* confetti + TA-DA when a watched build lands */}
      <Celebration trigger={finishCount} elapsedS={elapsedS} sound={autoRead} />

      {/* queued picks — shows a mid-build tap was registered and will run next */}
      {queue.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-1 text-xs font-bold text-ink-soft">
          <span>⏳ Up next:</span>
          {queue.map((q, i) => (
            <span key={i} className="rounded-full border-2 border-sun-deep/40 bg-sun/40 px-2 py-0.5 font-display text-ink">
              {q.label}
            </span>
          ))}
        </div>
      )}

      {/* suggestion chips (build mode only — the interview has its own answer chips) */}
      {!interviewOpen && (
        <SuggestionChips
          chips={unusedChips.map((c) => ({ _id: c._id, label: c.label, emoji: c.emoji, kind: c.kind }))}
          onPick={pickChip}
        />
      )}

      {/* input — stays live during a build so a kid can line up the next idea */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendTyped(input);
        }}
        className="flex gap-2 border-t-[3px] border-ink/10 bg-card p-3"
      >
        {sttReady && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            title="Talk to Sparky"
            aria-label="Talk to Sparky"
            className={`btn-toy shrink-0 px-4 py-2.5 text-lg ${
              listening
                ? "animate-pulse border-coral-deep bg-coral text-white"
                : "border-ink/15 bg-sky text-ink"
            }`}
          >
            {listening ? "🔴" : "🎤"}
          </button>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            listening
              ? "Listening… talk to Sparky! 🎤"
              : interviewOpen
                ? "…or type your own answer!"
                : busy
                  ? "Add another idea — it’ll go next…"
                  : "Tell Sparky your idea…"
          }
          className="min-w-0 flex-1 rounded-full border-[2.5px] border-ink/15 bg-sunken/60 px-5 py-3 font-semibold text-ink outline-none transition placeholder:text-ink-faint focus:border-aqua focus:bg-card"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="btn-toy border-lime-deep bg-lime px-7 py-2.5 text-lg text-ink"
        >
          {busy ? "＋" : "Go!"}
        </button>
      </form>
    </div>
  );
}

function Bubble({
  role,
  text,
  streaming,
  canSpeak,
}: {
  role: "kid" | "avatar" | "system";
  text: string;
  streaming?: boolean;
  canSpeak?: boolean;
}) {
  const isKid = role === "kid";
  const showSpeak = canSpeak && role === "avatar" && !!text && !streaming;
  return (
    <div className={`flex items-end gap-1 ${isKid ? "justify-end" : "justify-start"}`}>
      <div
        className={`vk-pop-in max-w-[80%] whitespace-pre-wrap px-4 py-2.5 text-[15px] font-semibold leading-snug ${
          isKid
            ? "rounded-3xl rounded-br-md border-[2.5px] border-coral-deep bg-coral text-white shadow-toy-sm"
            : "rounded-3xl rounded-bl-md border-[2.5px] border-ink/12 bg-card text-ink shadow-toy-sm"
        }`}
      >
        {text ||
          (streaming ? (
            <span className="flex items-center gap-1 py-1" aria-label="Sparky is thinking">
              <span className="vk-dot h-2 w-2 rounded-full bg-grape" style={{ animationDelay: "0ms" }} />
              <span className="vk-dot h-2 w-2 rounded-full bg-grape" style={{ animationDelay: "150ms" }} />
              <span className="vk-dot h-2 w-2 rounded-full bg-grape" style={{ animationDelay: "300ms" }} />
            </span>
          ) : (
            ""
          ))}
      </div>
      {showSpeak && (
        <button
          type="button"
          onClick={() => speak(text)}
          title="Read it to me"
          aria-label="Read it to me"
          className="mb-0.5 shrink-0 rounded-full p-1 text-ink-faint transition hover:bg-card hover:text-ink"
        >
          🔊
        </button>
      )}
    </div>
  );
}
