import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const suggestionKind = v.union(
  v.literal("idea"),
  v.literal("microchoice"),
  v.literal("activity"),
  v.literal("newapp"),
);

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) =>
    ctx.db
      .query("suggestions")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect(),
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    messageId: v.optional(v.id("messages")),
    kind: suggestionKind,
    label: v.string(),
    emoji: v.optional(v.string()),
    payload: v.optional(v.any()),
  },
  handler: (ctx, args) =>
    ctx.db.insert("suggestions", { ...args, used: false, createdAt: Date.now() }),
});

export const markUsed = mutation({
  args: { suggestionId: v.id("suggestions") },
  handler: (ctx, { suggestionId }) => ctx.db.patch(suggestionId, { used: true }),
});
