import { describe, expect, it } from "vitest";
import { reconstructTreeAsOf, type SnapshotRow } from "./reconstruct";

const row = (
  path: string,
  version: number,
  createdAt: number,
  content = `${path}@v${version}`,
): SnapshotRow => ({ path, content, contentType: "text/html", version, createdAt });

describe("reconstructTreeAsOf", () => {
  it("picks the highest eligible version per path", () => {
    const rows = [row("index.html", 1, 100), row("index.html", 2, 200), row("index.html", 3, 300)];
    const tree = reconstructTreeAsOf(rows, 250);
    expect(tree).toHaveLength(1);
    expect(tree[0].content).toBe("index.html@v2");
  });

  it("excludes paths whose first write is after asOf", () => {
    const rows = [row("index.html", 1, 100), row("late.js", 1, 500)];
    const tree = reconstructTreeAsOf(rows, 200);
    expect(tree.map((f) => f.path)).toEqual(["index.html"]);
  });

  it("uses version as the within-path tiebreak when createdAt collides", () => {
    // Two writes in the same millisecond — version must decide, not order or createdAt.
    const rows = [row("a.js", 2, 100), row("a.js", 1, 100)];
    const tree = reconstructTreeAsOf(rows, 100);
    expect(tree[0].content).toBe("a.js@v2");
  });

  it("includes a whole multi-file turn when asOf = the turn's last createdAt", () => {
    const rows = [row("index.html", 1, 100), row("style.css", 1, 102), row("game.js", 1, 104)];
    const tree = reconstructTreeAsOf(rows, 104);
    expect(tree).toHaveLength(3);
  });

  it("returns [] for an empty history or a time before everything", () => {
    expect(reconstructTreeAsOf([], 999)).toEqual([]);
    expect(reconstructTreeAsOf([row("a.js", 1, 100)], 50)).toEqual([]);
  });
});
