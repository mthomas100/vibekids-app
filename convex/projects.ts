import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForWorkspace = query({
  args: { workspaceId: v.string() },
  handler: (ctx, { workspaceId }) =>
    ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .collect(),
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) => ctx.db.get(projectId),
});

// ADMIN: every project across all workspaces, newest-updated first. Powers the
// dev-only admin console picker. No auth in v0 — the /admin route gates access.
export const listAll = query({
  args: {},
  handler: (ctx) => ctx.db.query("projects").order("desc").collect(),
});

export const create = mutation({
  args: {
    workspaceId: v.string(),
    name: v.string(),
    template: v.optional(v.string()),
  },
  handler: (ctx, args) =>
    ctx.db.insert("projects", { ...args, updatedAt: Date.now() }),
});

export const setEntry = mutation({
  args: { projectId: v.id("projects"), entryPath: v.string() },
  handler: (ctx, { projectId, entryPath }) =>
    ctx.db.patch(projectId, { entryPath, updatedAt: Date.now() }),
});

// Rename a project (= an app). Sparky calls this on create_project so the shelf shows a
// real app name ("Dino Jump Game") instead of the placeholder "New app".
export const setName = mutation({
  args: { projectId: v.id("projects"), name: v.string() },
  handler: (ctx, { projectId, name }) =>
    ctx.db.patch(projectId, { name, updatedAt: Date.now() }),
});
