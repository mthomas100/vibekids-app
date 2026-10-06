import { query, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) =>
    ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect(),
});

// The 3 ways content lands in a file via the public write path. (rollback/backfill
// are internal-only sources, recorded directly through recordVersion.)
const writeSource = v.union(v.literal("create"), v.literal("write"), v.literal("edit"));

// Upsert by (projectId, path); bumps version AND records an immutable snapshot in
// fileVersions. This is what the agent's create_project / write_file / edit_file tools
// call — the preview re-renders reactively, and every write becomes undoable history.
export const write = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    content: v.string(),
    contentType: v.optional(v.string()),
    // The avatar turn that produced this write — groups a turn's edits for the time
    // machine (kid-side "go back"). Threaded from the chat route; optional elsewhere.
    turnMessageId: v.optional(v.id("messages")),
    source: v.optional(writeSource),
  },
  handler: (ctx, args) => writeFile(ctx, args),
});

// The shared write choke point. Both the public `write` mutation AND project-level
// rollback (fileVersions.rollbackProjectToTurn) funnel through here, so EVERY write bumps
// the file version and appends a fileVersions snapshot via recordVersion — the invariant
// files.version === max(fileVersions.version) holds by construction. Unlike the public
// `write`, this helper accepts the full source union (incl. "rollback") because internal
// callers need it; the public mutation still restricts `source` to writeSource.
export async function writeFile(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    path: string;
    content: string;
    contentType?: string;
    turnMessageId?: Id<"messages">;
    source?: "create" | "write" | "edit" | "rollback" | "backfill";
  },
): Promise<Id<"files">> {
  const { projectId, path, content, contentType, turnMessageId, source } = args;
  const now = Date.now();
  const ct = contentType ?? guessContentType(path);
  const src = source ?? "write";
  const existing = await ctx.db
    .query("files")
    .withIndex("by_project_path", (q) =>
      q.eq("projectId", projectId).eq("path", path),
    )
    .unique();
  await ctx.db.patch(projectId, { updatedAt: now });
  if (existing) {
    const version = existing.version + 1;
    await ctx.db.patch(existing._id, { content, contentType: ct, version, updatedAt: now });
    await recordVersion(ctx, {
      projectId, fileId: existing._id, path, content,
      contentType: ct, version, turnMessageId, source: src, now,
    });
    return existing._id;
  }
  const fileId = await ctx.db.insert("files", {
    projectId,
    path,
    content,
    contentType: ct,
    version: 1,
    updatedAt: now,
  });
  await recordVersion(ctx, {
    projectId, fileId, path, content,
    contentType: ct, version: 1, turnMessageId, source: src, now,
  });
  return fileId;
}

// Append one immutable snapshot to fileVersions. The single choke point every write
// path (write + rollback) funnels through, so "every write is versioned" is a
// structural guarantee, not a per-call-site convention. Snapshots the NEW state, so
// files.version always === max(version) for that fileId (history's head == HEAD).
// Exported so rollback (convex/fileVersions.ts) funnels through the same choke point.
export async function recordVersion(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    fileId: Id<"files">;
    path: string;
    content: string;
    contentType: string;
    version: number;
    turnMessageId?: Id<"messages">;
    source: "create" | "write" | "edit" | "rollback" | "backfill";
    now: number;
  },
) {
  await ctx.db.insert("fileVersions", {
    projectId: args.projectId,
    fileId: args.fileId,
    path: args.path,
    content: args.content,
    contentType: args.contentType,
    version: args.version,
    turnMessageId: args.turnMessageId,
    source: args.source,
    createdAt: args.now,
  });
}

function guessContentType(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".jsx") || path.endsWith(".tsx")) return "text/jsx";
  if (path.endsWith(".js")) return "text/javascript";
  if (path.endsWith(".json")) return "application/json";
  return "text/plain";
}
