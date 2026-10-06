"use client";

import { useEffect, useRef } from "react";

// Renders composed HTML in an opaque-origin sandboxed iframe — same security model as the
// kid PreviewPane. Sets `srcdoc` IMPERATIVELY in an effect (after layout) so the document
// loads into an already-sized iframe and paints fully.
//
// Why not the `srcDoc` JSX prop: in the (static) admin console the prop makes the iframe
// parse + lay out its document before the flex layout has given the iframe its final
// height, and the page never repaints — so it stays blank (or paints a sliver). The kid
// app escapes this only because its page repaints constantly (streaming chat + avatar).
// Assigning srcdoc post-layout via a ref is the reliable fix for both admin previews.
export function SandboxedPreview({ srcDoc, title }: { srcDoc: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    // Once the doc has loaded into the (now full-size) iframe, force one reflow so it
    // repaints at the final height — without this the doc lays out while the iframe is
    // momentarily short and the static page never repaints it (blank / sliver).
    const nudge = () => {
      frame.style.display = "none";
      void frame.offsetHeight;
      frame.style.display = "";
    };
    frame.addEventListener("load", nudge);
    frame.srcdoc = srcDoc;
    return () => frame.removeEventListener("load", nudge);
  }, [srcDoc]);
  return (
    <div className="relative h-full w-full">
      <iframe
        ref={ref}
        title={title}
        // SECURITY: allow-scripts WITHOUT allow-same-origin → opaque origin (matches the kid
        // preview): no access to the parent page / cookies / storage. Never add same-origin.
        sandbox="allow-scripts allow-modals"
        className="absolute inset-0 h-full w-full border-0 bg-white"
      />
    </div>
  );
}
