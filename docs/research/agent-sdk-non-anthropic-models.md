# Can the Claude Agent SDK use non-Anthropic models?

> **What this is:** a focused technical clarification, captured 2026-06-06 and **verified against current
> docs** (context7 + web search, not training memory — the SDK moves fast). Companion to the Claude-Max
> billing stream (INDEX §5) and ADR [0001](../adr/0001-agent-sdk-on-max-subscription.md), which lock the
> Agent SDK as v0's engine. This answers a recurring question about *that* engine: is it Claude-only?
>
> **Bottom line:** **No — but with an asterisk.** The SDK is *built around* Anthropic's Claude models
> (that's the only first-class path), yet it isn't hard-locked to them. It speaks the **Anthropic Messages
> API protocol**, so you can repoint it at any endpoint that speaks that protocol — which is how people run
> non-Anthropic and local models through it. **First-class = Claude only; non-Claude = yes, via an
> Anthropic-API-compatible gateway/proxy, as a community pattern with real caveats.**

## Why it's "Claude-shaped" by default

The Agent SDK doesn't talk to a model directly — it **spawns the Claude Code CLI as a subprocess** (the
SDK's `cli_path` / `env` options pass through to "the Claude Code subprocess"). So it inherits exactly
Claude Code's model support, and authenticates the same ways — all of which serve **Claude** models:

| Native lane | Env knob | Still Claude? |
|---|---|---|
| Anthropic API (direct) | `ANTHROPIC_API_KEY` | yes |
| Max subscription (OAuth) | `CLAUDE_CODE_OAUTH_TOKEN` | yes — **the lane VibeKids dev uses** |
| Amazon Bedrock | `CLAUDE_CODE_USE_BEDROCK` | yes (different hosting/billing) |
| Google Vertex | `CLAUDE_CODE_USE_VERTEX` | yes (different hosting/billing) |

Bedrock and Vertex are different *hosting/billing* for the same Claude models — not other model families.
Out of the box, every supported lane is Claude.

## The escape hatch — it speaks the Anthropic Messages API

The SDK communicates over the **Anthropic Messages API protocol**, and `ANTHROPIC_BASE_URL` repoints it at
any endpoint that speaks that protocol. That's how non-Anthropic and local models get driven by it — put a
translation proxy in front:

- **LiteLLM** — `ANTHROPIC_BASE_URL=http://localhost:4000` and the same agent code routes to OpenAI,
  Gemini, Azure, etc. The proxy translates Anthropic ⇆ the target provider.
- **vLLM** — point at a local vLLM server; any model it serves *with tool-calling support* becomes a
  drop-in replacement for Claude.
- **Vercel AI Gateway** (and OpenRouter, claude-code-router, …) — Anthropic-compatible unified gateways,
  same `ANTHROPIC_BASE_URL` mechanism.

## The asterisk — it works, but it's not free of caveats

- **Community pattern, not an Anthropic-blessed feature.** The base-URL knob is documented for
  Bedrock/Vertex/custom gateways; using it for *non-Claude* models is a gray area
  ([anthropics/claude-code#5577](https://github.com/anthropics/claude-code/issues/5577)).
- **The harness is tuned for Claude.** System prompt, tool-call format, the agentic loop, and prompt
  caching all assume Claude's behavior. A weaker tool-calling model behind the proxy works but degrades
  (missed tool calls, sloppier multi-turn loops). The target model **must** have solid tool-calling — which
  is exactly the capability VibeKids leans on hardest (`lib/ai/tools.ts`'s seven tools, the `query()` loop
  in `app/api/chat/route.ts`).

## What this means for VibeKids

The research above is generic; here's where it lands on what's already built here:

- **Our `LLM_PROVIDER` flag is an abstraction over two *Claude* lanes — not a provider switch.**
  `lib/ai/provider.ts` toggles `subscription` (OAuth) vs `api` (key). Both are Claude; only the auth/billing
  differs. This doc clarifies that the engine *could* be pointed elsewhere, but nothing in our flag does so.
- **A non-Claude model would hook in *underneath* the flag, via `ANTHROPIC_BASE_URL` → a gateway** — it is
  not something `modelForRole()` or `LLM_PROVIDER` reaches today, and adopting it would be a new decision
  (LOG entry + likely an ADR), not a config flip.
- **It would also change the auth lane.** A custom base URL bypasses Anthropic's own authentication
  entirely, so you'd pay whatever the gateway/provider charges, and neither of the native Claude
  credentials (API key, or the opt-in personal subscription token) applies.
- **No decision changes.** v0 stays on Claude (API key by default). This is a reference
  note, not a fork — it reinforces ADR 0001 by mapping its boundaries.

## Sources

- [Agent SDK overview — Claude docs](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude Agent SDK with LiteLLM](https://docs.litellm.ai/docs/tutorials/claude_agent_sdk)
- [Claude Code — vLLM docs](https://docs.vllm.ai/en/stable/serving/integrations/claude_code/)
- [Vercel AI Gateway — Claude Code](https://vercel.com/docs/agent-resources/coding-agents/claude-code)
- [anthropics/claude-code#5577 — base URL for custom models](https://github.com/anthropics/claude-code/issues/5577)
- context7: `/anthropics/claude-agent-sdk-python` (auth methods + subprocess/`cli_path` model)

> See also: INDEX §2 (AI-layer comparison) · INDEX §5 (auth & billing) ·
> ADR [0001](../adr/0001-agent-sdk-on-max-subscription.md) · `lib/ai/provider.ts` · `lib/ai/env-guard.ts`.
