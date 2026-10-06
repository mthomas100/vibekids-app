import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Dream-It-Up interviews. The latest brief per project is the live one; older rows
// are history. All writes funnel through here (the interview route + its two tools).

const questionShape = v.object({
  text: v.string(),
  options: v.array(v.object({ emoji: v.string(), label: v.string() })),
});

// The latest brief for a project (the UI keys the interview panel off this).
export const getForProject = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) =>
    ctx.db
      .query("briefs")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .first(),
});

// Open a fresh interview (abandoning any unfinished one) with the opening question.
export const start = mutation({
  args: {
    projectId: v.id("projects"),
    maxQuestions: v.number(),
    question: questionShape,
  },
  handler: async (ctx, { projectId, maxQuestions, question }) => {
    const stale = await ctx.db
      .query("briefs")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    for (const b of stale) {
      if (b.status === "active" || b.status === "readyToBuild") {
        await ctx.db.patch(b._id, { status: "abandoned", updatedAt: Date.now() });
      }
    }
    const now = Date.now();
    return ctx.db.insert("briefs", {
      projectId,
      status: "active",
      qa: [],
      currentQuestion: question,
      maxQuestions,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Record the kid's answer to the open question and clear it (the next question —
// or the recap — arrives via setQuestion/finish). Typing after the recap reopens
// the interview: the answer lands against `fallbackQuestion`. Returns the new qa.
export const recordAnswer = mutation({
  args: {
    briefId: v.id("briefs"),
    answer: v.string(),
    fallbackQuestion: v.optional(v.string()),
  },
  handler: async (ctx, { briefId, answer, fallbackQuestion }) => {
    const brief = await ctx.db.get(briefId);
    // Status guard: a brief that already went to build (or was abandoned) is closed —
    // late/racing writes must not resurrect it.
    if (!brief || (brief.status !== "active" && brief.status !== "readyToBuild")) return [];
    const q = brief.currentQuestion?.text ?? fallbackQuestion ?? "What should we make?";
    const qa = [...brief.qa, { q, a: answer }];
    await ctx.db.patch(briefId, {
      qa,
      currentQuestion: undefined,
      status: "active",
      updatedAt: Date.now(),
    });
    return qa;
  },
});

// Put the next question (and its tappable options) on the brief.
export const setQuestion = mutation({
  args: { briefId: v.id("briefs"), question: questionShape },
  handler: async (ctx, { briefId, question }) => {
    const brief = await ctx.db.get(briefId);
    // Only a live interview takes questions — the kid may have smashed "build it!"
    // while the model was still thinking one up.
    if (!brief || (brief.status !== "active" && brief.status !== "readyToBuild")) return;
    await ctx.db.patch(briefId, {
      currentQuestion: question,
      status: "active",
      updatedAt: Date.now(),
    });
  },
});

// Wrap the interview: store the recap + builder spec. Defaults to readyToBuild
// (the recap card gate); pass status:"building" to skip the gate ("build it now!").
export const finish = mutation({
  args: {
    briefId: v.id("briefs"),
    recap: v.optional(v.string()),
    buildBrief: v.optional(v.string()),
    status: v.optional(v.union(v.literal("readyToBuild"), v.literal("building"))),
  },
  handler: async (ctx, { briefId, recap, buildBrief, status }) => {
    const brief = await ctx.db.get(briefId);
    // Same race guard: a closed brief stays closed (a model finish_interview landing
    // after the kid's "build it now!" must not rewind building → readyToBuild).
    if (!brief || (brief.status !== "active" && brief.status !== "readyToBuild")) return;
    await ctx.db.patch(briefId, {
      recap,
      buildBrief,
      currentQuestion: undefined,
      status: status ?? "readyToBuild",
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    briefId: v.id("briefs"),
    status: v.union(
      v.literal("active"),
      v.literal("readyToBuild"),
      v.literal("building"),
      v.literal("done"),
      v.literal("abandoned"),
    ),
  },
  handler: (ctx, { briefId, status }) =>
    ctx.db.patch(briefId, { status, updatedAt: Date.now() }),
});
