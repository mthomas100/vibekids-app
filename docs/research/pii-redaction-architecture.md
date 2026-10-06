# PII redaction & content-moderation architecture — what others do, and the self-hosting question

> **What this is:** an implementation question — should sensitive data be stripped from a kid's input
> on-device (e.g. with regex at voice-capture time) or on the backend before inference, what do others in
> this space do, and is self-hosting a monitoring model common? Researched and captured 2026-05-31. This
> is the **technical "how"** behind the **prompt-PII-scrubbing** item flagged in the COPPA feasibility
> review (an archived research note, not included) — the one product-specific gap v0 doesn't have yet.
>
> **Bottom line:** the on-device instinct maps almost exactly onto the standard production pattern (a *"local AI
> proxy"*) — with **three refinements**: use **regex + a small NER model** (regex alone misses the stuff
> that actually trips up a kids' app), mind the **voice/ASR ordering trap**, and do it **on-device AND
> server-side** (defense in depth, fail closed). Self-hosting your monitoring is **common and legitimate**
> — but it's **two jobs / two tools**: small purpose-built NER for PII, a **Llama-Guard-class** model for
> content safety. And it's a **mitigation, not a loophole** — it closes one specific gap, it doesn't
> dissolve your COPPA duties. **Not legal advice.**

## The proposed approach: right shape, three refinements

The proposed pattern — detect and strip sensitive data locally, send only sanitized text onward
— is the canonical one, sometimes called a **"local AI proxy"**: detect PII locally → replace it with
**stable placeholders** → send only sanitized text to the cloud model → **restore** the original values
before the user sees the response. The key property: the model **never sees the original values, only the
placeholder tokens** — so *"make a game for me, `[NAME_1]`"* still works structurally, but the kid's actual
name never leaves your boundary. So yes — right track. Three refinements matter:

### 1. Regex alone is not enough — pair it with a lightweight NER

Regex nails **structured** PII (emails, phones, SSNs, card numbers via a Luhn check) but misses the stuff
that actually trips up a kids' app: **names**, *"I go to Lincoln Elementary,"* *"my mom's a nurse at
County General"* — unstructured and contextual. The standard fix is **regex + a small named-entity-
recognition model**. **GLiNER** is the one most reach for: **zero-shot** (you hand it labels like
`name, address, school` at runtime), tiny, runs locally. PII-tuned GLiNER variants (Knowledgator/Wordcab,
NVIDIA, Gretel) cover 55+ categories, shipped as **quantized ONNX** small enough for edge/on-device use.
So "on-device regex" should really be **"on-device regex + small NER,"** with deterministic checks as a
backstop.

### 2. The voice angle has a trap

If a kid **speaks** to the app, the audio has to be **transcribed first** — and the raw voice itself is
**biometric data** (now explicitly PII under the amended COPPA Rule) *plus* it carries the spoken PII. If
your transcription (ASR) runs in the **cloud**, the audio has **already left the device** before any
on-device regex can touch it. So *"on-device redaction at voice detection"* only fully delivers **if the
transcription is also on-device.** If ASR is cloud-based, you've **disclosed before you've redacted** —
the same ordering bug as the prompt case, just one hop earlier.

### 3. Do it on-device AND server-side — not either/or

Client-side redaction is the strongest privacy posture (data never leaves the kid's device) and it's a
real shipping pattern — **Cherry Studio** runs an ~80 MB on-device NER model so no sensitive data ever
leaves the device. But you **can't fully trust the client** (an old app version or a tampered client
could send raw text). So treat on-device as the **first** layer and **also** redact **server-side before
the inference call** (the right chokepoint) as defense in depth. And **fail closed** — if the scrubber
errors, **don't forward.**

## What others in the space are doing

The landscape has consolidated around a few options:

- **Microsoft Presidio** — the de-facto open-source standard. Two pieces (an **analyzer** that finds PII +
  an **anonymizer** that masks/replaces/tokenizes), built for exactly this: strip PII before it leaves
  your server but preserve enough structure that the LLM can still do its job. Self-hostable; combines
  regex + NER.
- **GLiNER / purpose-built NER** (above) — when you want something lighter than Presidio's orchestration,
  or need on-device.
- **Managed cloud services** — Google Cloud DLP, AWS Comprehend PII, Azure AI Language PII. Easy to
  integrate, but they carry the trust-boundary problem below.
- **Commercial PII-for-LLM vendors** — Nightfall, Private AI, Skyflow (tokenization/vaulting), Protecto,
  and AI-gateway products like Gravitee that filter PII at the gateway before the model. Less engineering
  lift, but cost money and (for the SaaS ones) reintroduce the trust-boundary issue.
- **OpenAI's Privacy Filter** (shipped 2026) — notable because even OpenAI now ships a small, locally-
  runnable PII model; the whole framing is *scrub before data reaches a frontier model* — which validates
  the proposed architecture.

**Two consistent lessons across all of them:**
1. **Apply redaction to input, output, AND logs** — not just one.
2. **Detecting PII is the easy half.** The hard half is the **placeholder↔value mapping, restoration,
   observability** (logging *that* PII was present without logging the PII itself), and the long tail of
   edge cases. **Budget for that, not just the detector.**

## Self-hosting "to get around this" — yes, but mind the distinction

This conflates **two different jobs that use two different tools**:

- **Job 1 — PII redaction** (*is there sensitive data to strip?*). The self-hosted standard here is **not**
  a big general LLM — it's the **small, purpose-built models** (Presidio, GLiNER, DeBERTa-PII). They're
  cheaper, faster, and more reliable for this than a general LLM (which produces inconsistent output and
  can even **hallucinate entities**). Light enough for **CPU or on-device** → self-hosting here is cheap
  and very achievable for a solo dev.
- **Job 2 — content moderation** (*is the prompt or output harmful — violence, sexual content, self-harm?*).
  This is where self-hosting an actual **classifier-LLM** is the common pattern. Standard tool: **Meta's
  Llama Guard** (v3/v4), with NVIDIA's NeMo models as an alternative. Llama Guard is explicitly an
  **input-output safeguard** for classifying safety risks in prompts *and* responses, released with **open
  weights** specifically so it can be self-hosted/extended/distilled — an open alternative to proprietary
  moderation APIs.

So: **yes, self-hosting your monitoring is a very common and legitimate pattern** — just use small NER
tools for PII and a Llama-Guard-class model for content safety.

**Why people self-host** is exactly the thing that matters for a kids' app: a **cloud detection service has
to receive the *unredacted* data to inspect it.** Routing data through a cloud DLP API to sanitize it means
**unredacted regulated data has already crossed an external trust boundary before any redaction happens** —
and contractual terms alone cannot fully mitigate that. **Self-hosting (or on-device) keeps detection
inside your perimeter,** which closes that gap. For a product where you specifically don't want to spray
kids' data across extra third parties, that's a strong reason to self-host the detection step.

**The honest tradeoff:** the **PII side is cheap** (small models, CPU/edge). The **content-moderation side
isn't free** — hosting Llama Guard needs a **GPU worker** (money + ops burden). A reasonable solo-dev
sequence: **self-host/on-device the PII redaction from day one** (cheap, closes the disclosure gap), and
for content moderation either run a **small quantized guard model** or **start with a moderation API and
move to self-hosted Llama Guard as volume justifies the GPU.**

**Framing correction ("get around" is the wrong frame):** self-hosting **doesn't make your COPPA obligations
disappear** — it closes **one specific gap** (the detector itself being a third-party disclosure). It's a
**smart mitigation, not a loophole.** The deliberately-collected data, consent, retention, and parent-
access duties all still stand.

## What this means for VibeKids

- **This is the "how" behind the COPPA gap.** The COPPA feasibility review (archived note, not included)
  flagged prompt-PII-scrubbing as the one product-specific item v0 lacks; this is the pipeline to build
  when Phase 1 opens.
- **The server-side chokepoint already exists.** `app/api/chat/` is the Node route running the Agent SDK
  loop — redact **there, before the inference call**, and **fail closed**. Tool handlers in
  `lib/ai/tools.ts` persist to Convex, so also scrub **before logging/persisting** prompts (lesson #1
  above: input + output + logs).
- **The voice trap is LIVE in v0 — and already a known deferred obligation.** v0 voice uses **Web Speech
  STT, which sends audio to Google/Apple = cloud ASR.** Per this research, on-device *text* redaction
  **can't protect that audio: it's already disclosed** (and it's biometric). This is exactly **ADR 0006
  §Deferred** + a standing watch-out (kid audio = biometric; Web Speech STT sends audio to Google/
  Apple — a hard gate before any real kid). Closing it needs **on-device ASR**, which leans on the same
  **cross-origin-isolation (COOP/COEP) keystone — #26** — that on-device TTS (Kokoro) needs. So **text PII
  redaction and on-device ASR are coupled;** the keystone unlocks both.
- **Content moderation maps to an existing convention.** `CLAUDE.md` already says *"moderate model text
  out"*; `lib/ai/persona.ts` is the input guard. **Llama Guard** is the self-hosted production answer for
  the harmful-content classifier (input *and* output) — GPU-costed, so **sequence it** (moderation API
  first → self-host as volume grows).
- **Cost fits the low-spend + data-light posture.** PII NER is **CPU/on-device cheap** (fits
  "minimal by design"); Llama Guard GPU is a real cost to **defer**, not take on at POC.
- **The "minimize" through-line, a third time.** The constrained, guided product (see
  the constrained-generation wedge in `CONTEXT.md`) **shrinks the PII surface**
  — fewer open text boxes where a kid can type their address means fewer chances for the detector to miss
  something. **Narrowing the input space makes every one of these tools more reliable.**

## Caveats

- **Not legal advice.** These are engineering mitigations; they reduce risk, they don't remove COPPA
  obligations (consent, retention, parent access, data minimization all still stand).
- Tool/model names (GLiNER, Presidio, Llama Guard v3/v4, OpenAI Privacy Filter) are current to ~mid-2026;
  this space moves fast — re-check versions before building.

> See also: ADR 0004 (kids-as-profiles) ·
> ADR 0006 §Deferred + issues #8/#9 (voice consent) · #26 (cross-origin isolation keystone) ·
> `CLAUDE.md` kid-safety conventions.
