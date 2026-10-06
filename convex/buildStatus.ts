import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// One live "what's happening right now" row per project — the build ticker.
export const getForProject = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) =>
    ctx.db
      .query("buildStatus")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .unique(),
});

const buildState = v.union(
  v.literal("thinking"),
  v.literal("building"),
  v.literal("done"),
  v.literal("error"),
);

export const set = mutation({
  args: {
    projectId: v.id("projects"),
    phase: v.string(), // kid-facing present-continuous, e.g. "Painting the buttons…"
    state: v.optional(buildState), // machine-readable lifecycle for the UI
    file: v.optional(v.string()),
    pct: v.optional(v.number()),
    log: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, phase, state, file, pct, log }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("buildStatus")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { phase, state, file, pct, log, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("buildStatus", { projectId, phase, state, file, pct, log, updatedAt: now });
  },
});
