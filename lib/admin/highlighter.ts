import { createHighlighter, type Highlighter } from "shiki/bundle/web";

// A single Shiki highlighter for the dev admin Source view (#28). Created once (the promise
// is cached so concurrent callers share it), kept alive for the session. /admin is dev-only
// (404s in prod), so the web bundle's size is a non-issue. Supersedes ADR 0008's tentative
// highlight.js note: Shiki's TextMate grammars highlight JS-embedded-in-HTML correctly,
// which is exactly what Sparky writes.
const LANGS = ["html", "css", "javascript", "jsx", "json"] as const;
const LANG_SET = new Set<string>(LANGS);

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: [...LANGS],
      themes: ["github-dark"],
    });
  }
  return highlighterPromise;
}

export function langForContentType(contentType: string, path: string): string {
  if (path.endsWith(".jsx") || path.endsWith(".tsx")) return "jsx";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("css")) return "css";
  if (contentType.includes("json")) return "json";
  if (contentType.includes("javascript") || path.endsWith(".js")) return "javascript";
  return "html";
}

export async function highlight(content: string, lang: string): Promise<string> {
  const h = await getHighlighter();
  return h.codeToHtml(content, {
    lang: LANG_SET.has(lang) ? lang : "html",
    theme: "github-dark",
  });
}
