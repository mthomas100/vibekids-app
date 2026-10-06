// Compose a single runnable HTML document from a project's file tree — the renderer
// behind both the kid-facing preview (components/PreviewPane) and the admin console's
// Rendered tab (which feeds it a single historical snapshot). Pure: no React, no Convex.

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type FileLike = { path: string; content: string; contentType: string };

// Injected first so it catches errors from every later script. The kid's app runs in an
// opaque-origin sandbox; postMessage to the parent is its only voice — PreviewPane
// listens for these and offers "ask Sparky to fix it" (the agent can't see runtime
// errors any other way).
export const ERROR_CATCHER = `<script>(function(){var s=function(m){try{parent.postMessage({type:"vk-error",message:String(m).slice(0,300)},"*")}catch(e){}};window.addEventListener("error",function(e){s(e.message||"Something broke")});window.addEventListener("unhandledrejection",function(e){s((e.reason&&e.reason.message)||e.reason||"Something broke")});})()</script>`;

function injectErrorCatcher(html: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + ERROR_CATCHER);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + ERROR_CATCHER);
  return ERROR_CATCHER + html;
}

// v0 Tier A: compose a single HTML document from the file tree, inlining any
// separate .css / .js the entry references. (Sandpack/Tier B comes in M3.)
export function compose(files: FileLike[], entryPath?: string): string | null {
  const entry =
    files.find((f) => f.path === (entryPath ?? "index.html")) ??
    files.find((f) => f.path.endsWith("index.html")) ??
    files.find((f) => f.contentType === "text/html");
  if (!entry) return null;
  let html = entry.content;
  for (const f of files) {
    if (f.path === entry.path) continue;
    const p = escapeReg(f.path);
    if (f.contentType === "text/css") {
      html = html.replace(
        new RegExp(`<link[^>]*href=["']\\.?/?${p}["'][^>]*>`, "g"),
        `<style>\n${f.content}\n</style>`,
      );
    } else if (f.contentType.includes("javascript")) {
      html = html.replace(
        new RegExp(`<script[^>]*src=["']\\.?/?${p}["'][^>]*>\\s*</script>`, "g"),
        `<script>\n${f.content}\n</script>`,
      );
    }
  }
  return injectErrorCatcher(html);
}
