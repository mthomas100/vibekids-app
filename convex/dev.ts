import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// DEV-ONLY maintenance: wipe ALL app data (every row in every table) for a clean slate
// between paradigm changes / test runs. internalMutation → never reachable from the
// browser; guarded by a confirm string so it can't fire by accident. The kid app
// (app/page.tsx) recreates an empty "My First App" on the next load.
//   npx convex run dev:wipeAllData '{"confirm":"yes-delete-everything"}'
export const wipeAllData = internalMutation({
  args: { confirm: v.string() },
  handler: async (ctx, { confirm }) => {
    if (confirm !== "yes-delete-everything") {
      throw new Error(
        'Refusing: pass {"confirm":"yes-delete-everything"} to wipe all data.',
      );
    }
    const tables = [
      "fileVersions",
      "files",
      "messages",
      "suggestions",
      "buildStatus",
      "projects",
    ] as const;
    const deleted: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
      deleted[table] = rows.length;
    }
    return deleted;
  },
});
