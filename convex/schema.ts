import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// VibeKids v0 data model. No auth — everything is scoped to an anonymous
// `workspaceId` the client keeps in localStorage. (Accounts / child profiles /
// snapshots come back in Phase 1 with Clerk.)
export default defineSchema({
  // A buildable app.
  projects: defineTable({
    workspaceId: v.string(), // anonymous local workspace (no login in v0)
    name: v.string(),
    template: v.optional(v.string()), // "blank" | "game" | "story" | "quiz"
    entryPath: v.optional(v.string()), // file the preview renders, e.g. "index.html"
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  // The live source tree the agent edits; the preview renders from this.
  files: defineTable({
    projectId: v.id("projects"),
    path: v.string(), // "index.html", "style.css", "App.jsx"
    content: v.string(),
    contentType: v.string(), // "text/html" | "text/css" | "text/javascript" | "text/jsx"
    version: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_path", ["projectId", "path"]),

  // Append-only history of every file write. A `files` row is HEAD (what the preview
  // renders); each fileVersions row is an immutable snapshot of the file at one `version`.
  // Powers the admin time-machine — source/diff/rollback now, kid-side "go back" later.
  // Invariant: files.version === max(version) over rows with the same fileId.
  fileVersions: defineTable({
    projectId: v.id("projects"), // denormalized → project-wide timeline without a join
    fileId: v.id("files"), // the live HEAD row this is a version of
    path: v.string(), // denormalized → survives a future file delete
    content: v.string(), // FULL snapshot (not a delta — see ADR 0008)
    contentType: v.string(),
    version: v.number(), // mirrors files.version AFTER this write
    turnMessageId: v.optional(v.id("messages")), // the per-turn avatar bubble that produced it
    source: v.union(
      v.literal("create"), // create_project starter
      v.literal("write"), // write_file
      v.literal("edit"), // edit_file
      v.literal("rollback"), // restored from an older version
      v.literal("backfill"), // one-off migration baseline
    ),
    createdAt: v.number(),
  })
    .index("by_file", ["fileId"]) // per-file timeline + rollback list (dominant read)
    .index("by_project", ["projectId"]) // project-wide timeline
    .index("by_project_turn", ["projectId", "turnMessageId"]) // group-by-turn (time machine)
    .index("by_file_version", ["fileId", "version"]), // O(1) "fetch file X at version N"

  // The chat transcript. Avatar messages stream in (streaming=true while in flight).
  messages: defineTable({
    projectId: v.id("projects"),
    role: v.union(v.literal("kid"), v.literal("avatar"), v.literal("system")),
    text: v.string(),
    streaming: v.optional(v.boolean()),
    toolName: v.optional(v.string()), // set on tool-activity messages ("write_file", …)
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Tappable chips / micro-choices / mini-activities the avatar offers.
  suggestions: defineTable({
    projectId: v.id("projects"),
    messageId: v.optional(v.id("messages")),
    kind: v.union(
      v.literal("idea"), // "next thing to build" chip
      v.literal("microchoice"), // build-feeding choice during a wait (color/sound/name)
      v.literal("activity"), // tiny while-you-wait mini-activity
      v.literal("newapp"), // offer to start this idea as its own brand-new app
    ),
    label: v.string(),
    emoji: v.optional(v.string()),
    payload: v.optional(v.any()), // e.g. the prompt to send when tapped
    used: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Dream-It-Up mode: one interview per project run — Sparky asks a few questions
  // BEFORE building so the kid's vision (not a one-shot prompt) drives the build.
  // The latest row is the live interview; qa is the growing spec; currentQuestion's
  // options render as tappable chips. (Amends D17's 1-question grill — see LOG.)
  briefs: defineTable({
    projectId: v.id("projects"),
    status: v.union(
      v.literal("active"), // interview running — panel shows question + chips
      v.literal("readyToBuild"), // recap shown; waiting on Build it! / Change something
      v.literal("building"), // compiled brief handed to the build turn
      v.literal("done"), // the build it fed finished (kept for provenance)
      v.literal("abandoned"), // kid bailed or started over
    ),
    qa: v.array(v.object({ q: v.string(), a: v.string() })), // the dream, one answer at a time
    currentQuestion: v.optional(
      v.object({
        text: v.string(),
        options: v.array(v.object({ emoji: v.string(), label: v.string() })),
      }),
    ),
    maxQuestions: v.number(), // hard budget (research: >5 = interrogation fatigue)
    recap: v.optional(v.string()), // kid-facing "here's our plan!" line
    buildBrief: v.optional(v.string()), // builder-facing spec the model wrote
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Single live "what's happening right now" row per project (the build ticker).
  // `phase` is the kid-facing copy ("Painting the buttons…"); `state` is the
  // machine-readable lifecycle the UI keys moods/celebrations off (never regex the copy).
  buildStatus: defineTable({
    projectId: v.id("projects"),
    phase: v.string(), // kid-facing present-continuous copy
    state: v.optional(
      v.union(
        v.literal("thinking"), // turn started, model hasn't acted yet
        v.literal("building"), // a tool is doing build work
        v.literal("done"), // the turn finished cleanly
        v.literal("error"), // the turn died; friendly copy in `phase`
      ),
    ),
    file: v.optional(v.string()),
    pct: v.optional(v.number()),
    log: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),
});
