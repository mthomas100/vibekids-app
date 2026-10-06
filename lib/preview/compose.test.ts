import { describe, expect, it } from "vitest";
import { compose, ERROR_CATCHER, type FileLike } from "./compose";

const html = (body: string, head = "") =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

const f = (path: string, content: string, contentType: string): FileLike => ({
  path,
  content,
  contentType,
});

describe("compose", () => {
  it("returns null when there is no HTML entry at all", () => {
    expect(compose([f("style.css", "body{}", "text/css")])).toBeNull();
    expect(compose([])).toBeNull();
  });

  it("uses index.html by default", () => {
    const out = compose([
      f("index.html", html("<h1>hi</h1>"), "text/html"),
      f("other.html", html("<h1>other</h1>"), "text/html"),
    ]);
    expect(out).toContain("<h1>hi</h1>");
  });

  it("honors an explicit entryPath over index.html", () => {
    const out = compose(
      [
        f("index.html", html("<h1>home</h1>"), "text/html"),
        f("game.html", html("<h1>game</h1>"), "text/html"),
      ],
      "game.html",
    );
    expect(out).toContain("<h1>game</h1>");
  });

  it("falls back to any *index.html, then any text/html file", () => {
    const nested = compose([f("app/index.html", html("<p>nested</p>"), "text/html")]);
    expect(nested).toContain("nested");
    const anyHtml = compose([f("page.html", html("<p>solo</p>"), "text/html")]);
    expect(anyHtml).toContain("solo");
  });

  it("inlines a linked stylesheet as a <style> tag", () => {
    const out = compose([
      f("index.html", html("<p>x</p>", `<link rel="stylesheet" href="style.css">`), "text/html"),
      f("style.css", "body { background: pink; }", "text/css"),
    ]);
    expect(out).toContain("<style>\nbody { background: pink; }\n</style>");
    expect(out).not.toContain("<link");
  });

  it("inlines a referenced script and handles ./-prefixed hrefs", () => {
    const out = compose([
      f("index.html", html(`<script src="./game.js"></script>`), "text/html"),
      f("game.js", "console.log('go');", "text/javascript"),
    ]);
    expect(out).toContain("<script>\nconsole.log('go');\n</script>");
    expect(out).not.toContain("src=");
  });

  it("leaves references to files that don't exist untouched", () => {
    const doc = html(`<script src="missing.js"></script>`);
    const out = compose([f("index.html", doc, "text/html")]);
    expect(out).toContain(`<script src="missing.js"></script>`);
  });

  it("injects the error catcher right after <head> so it runs before app scripts", () => {
    const out = compose([f("index.html", html("<p>x</p>", "<title>t</title>"), "text/html")])!;
    expect(out).toContain(ERROR_CATCHER);
    expect(out.indexOf(ERROR_CATCHER)).toBeLessThan(out.indexOf("<title>"));
  });

  it("still injects the error catcher when the doc has no <head>", () => {
    const bare = "<p>just a paragraph</p>";
    const out = compose([f("index.html", bare, "text/html")])!;
    expect(out).toContain(ERROR_CATCHER);
    expect(out).toContain(bare);
  });

  it("escapes regex specials in paths (e.g. dots) safely", () => {
    // "app.v2.js" must only match itself, and the dot must not act as a wildcard.
    const out = compose([
      f("index.html", html(`<script src="app.v2.js"></script><script src="appxv2.js"></script>`), "text/html"),
      f("app.v2.js", "let a = 1;", "text/javascript"),
    ]);
    expect(out).toContain("let a = 1;");
    expect(out).toContain(`src="appxv2.js"`); // the lookalike is untouched
  });
});
