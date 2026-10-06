import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) =>
    ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect(),
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("kid"), v.literal("avatar"), v.literal("system")),
    text: v.string(),
    streaming: v.optional(v.boolean()),
    toolName: v.optional(v.string()),
  },
  handler: (ctx, args) => ctx.db.insert("messages", { ...args, createdAt: Date.now() }),
});

// Append a streamed delta to an in-flight avatar message.
export const appendText = mutation({
  args: { messageId: v.id("messages"), delta: v.string() },
  handler: async (ctx, { messageId, delta }) => {
    const m = await ctx.db.get(messageId);
    if (!m) return;
    await ctx.db.patch(messageId, { text: m.text + delta });
  },
});

export const finish = mutation({
  args: { messageId: v.id("messages") },
  handler: (ctx, { messageId }) => ctx.db.patch(messageId, { streaming: false }),
});
