import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Claude Agent SDK spawns a subprocess / ships a bundled binary, so keep it
  // out of the Next server bundle — load it from node_modules at runtime instead.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  // Pin the workspace root: a stray lockfile in $HOME otherwise makes Turbopack
  // guess the wrong root and warn on every boot (#5). NOTE: process.cwd(), not
  // __dirname — Next 16 transpiles this TS config before executing it, so __dirname
  // is not the repo root. `next dev`/`next build` always run from the repo root.
  turbopack: { root: process.cwd() },
  // Move the dev-only route indicator off the bottom-left, where it overlapped the
  // chat input, to the bottom-right (over the preview's corner). (Next 16: `position`.)
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
