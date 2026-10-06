# Wait-time engagement — research synthesis (2026-07-08)

> Fable research agent commissioned mid-"next-level" session; the brief that killed the
> other-apps detour nudge (D25) and defines the wait-time v2 backlog. Constraints honored:
> client/Convex-only, zero extra AI calls, Toca-ethical (invitations, never obligations).

## Six load-bearing findings

1. **The labor illusion is real and strong.** Buell & Norton (Harvard, *Management Science* 2011):
   people prefer a service with a LONGER wait when it visibly shows the work being done — visible
   effort triggers reciprocity and raises perceived value. Showing Sparky's work isn't a consolation
   prize for slowness; it makes the build feel MORE valuable. "Latency is a feature" has direct
   empirical backing.
2. **Occupied time beats unoccupied; uncertainty is the killer.** Maister's waiting-lines work +
   Disney queue design: unoccupied, unexplained, uncertain waits feel longest; themed in-world waits
   feel shortest.
3. **Progress mechanics have sharp rules.** Harrison ("Rethinking the Progress Bar") + the
   stalling-bar study: a bar that stalls near the END is judged slowest and disliked most; monotonic,
   staged progress with strong early movement feels fastest. Stage-based ticker calibrated from
   historical build durations; never freeze at 90%.
4. **Streaming partial output is the #1 perceived-latency killer in AI products.** The convergent
   Bolt/Lovable/Replit-Agent/v0 pattern: plan checklist first, then file-by-file streaming into a
   live preview. Kids can't read code, so the kid-legible equivalents are (a) the preview painting
   itself in and (b) a picture checklist ticking off.
5. **Kids wait well when they have something active to do.** Delay-of-gratification research (ages
   6–12): kids who deploy attention AWAY from the wait onto an activity wait dramatically longer and
   happier. Loewenstein's curiosity gap: prediction tasks activate reward circuitry BEFORE the
   reveal — anticipation itself becomes the fun.
6. **Practice-the-core-skill beats random distraction; don't push project-hopping.** The best
   loading minigames (Bayonetta, FIFA drills, Splatoon 3 test range) practice the game's core skill.
   VibeKids' core skill is designing and testing — wait activities should be design work. Attention
   residue (Leroy 2009): a mid-build hop to another project leaves residue both ways and risks the
   kid missing the reveal — the peak-end payoff. **Verdict: keep the My Apps shelf passive during
   builds; never nudge a hop.** If the kid wanders on their own, give a persistent Sparky progress
   chip + a celebratory ding to pull them back for the reveal ("appointment waiting").

## Ranked features (top 5 ⭐)

| # | Feature | Mechanic | Principle | Effort | Feeds the build? |
|---|---|---|---|---|---|
| 1 ⭐ | **Watch It Grow** | Preview never sits blank: each part snaps into the live preview as the agent writes it, staged as construction (scaffold → parts pop in with a sparkle) | Streaming partial output + labor illusion | M | It IS the build |
| 2 ⭐ | **Sparky's Blueprint** | Picture checklist within ~2s ("🧠 game brain · 🎨 paint · 🔊 sounds · ✅ check"), items tick with real tool events; ticker phrases attach to the active item | Operational transparency + goal-gradient | S–M | Feeds trust |
| 3 ⭐ | **Design Desk: Draw-a-Sprite** | Doodle pad during the wait; drawing saved as PNG data-URI in Convex, injected into the NEXT turn as a real asset | Occupied time + competence + core-skill practice | M | Gold standard |
| 4 ⭐ | **Sound Booth** | Soundboard of silly bleeps; kid auditions by tapping, picks ≤3 for their app; templated into next turn | Micro-choice agency; audio delights 8–12s | S–M | Yes |
| 5 ⭐ | **Guess the App** | ONE prediction while building ("score at top or bottom? Lock it in!"); checked at reveal with celebration either way | Curiosity gap; prediction pre-activates reward; peak-end | S | Points at it |
| 6 | **Bug Safari** (novel) | Sparky sometimes hides one silly cosmetic quirk; first to spot it gets a sticker — converts wait into TESTER mode | Curiosity gap + role empowerment | S | Kid = test suite |
| 7 | Keep Playing v1 | On rebuild, previous version stays interactive under a "new version cooking 🍳" ribbon | Occupied time + double-buffering | S | Semi (feedback) |
| 8 | Honest Stages Meter | 4-stage meter (Plan→Build→Paint→Check) calibrated from historical build times, monotonic, no end-stall | Uncertainty + end-stall research | S | Infra for #2 |
| 9 | Next Big Idea Bin | Chips + own-idea input feed a reorderable visible "Up Next" queue | Zeigarnik + agency | S | Future builds |
| 10 | Sparky's Workshop Cam | Cutaway of the panda visibly working, states driven by real agent events | Labor illusion embodied; honest telemetry | M | Entertainment |
| 11 | App Trading Card | Kid decorates the app's collectible card during the wait; stamps onto the shelf | Collection-as-museum, no streaks/scarcity | M | Semi |
| 12 | Loading-Screen Inception (novel) | Kid makes THEIR app's loading screen while waiting; doodle becomes the real one | Meta-delight; teaches a real concept | M | Yes |
| 13 | Time-Capsule Whisper | 5s voice note ("tell future-you!") plays back at the reveal | Anticipation + peak-end | M | Entertainment |
| 14 | Come-Back Ding | If the kid self-wanders: persistent mini-Sparky progress ring + triumphant chime on completion | Appointment waiting; protects the reveal | S | Infra |
| 15 | Sparky Says | Simon-style pattern game, ONLY if idle >20s with no micro-choice pending | Pure occupied time; last resort | M | No |

## Sequencing

Don't stack activities — a tiny **wait director** schedules ONE thing at a time: instant spoken ack
(exists) → Blueprint → micro-choice (exists) ~15s in → Design Desk / Sound Booth / Guess-the-App
rotates in for long builds → Come-Back Ding + reveal. Rotate per build; every activity dismissible.

## Sources

[Labor Illusion — Buell & Norton](https://www.hbs.edu/ris/download.aspx?name=Norton_Michael_The+labor+illusion+How+operational.pdf) ·
[Maister, Psychology of Waiting Lines](http://www.columbia.edu/~ww2040/4615S13/Psychology_of_Waiting_Lines.pdf) ·
[Harrison, Rethinking the Progress Bar](https://www.chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf) ·
[Stalling progress bars](http://wdsinet.org/Annual_Meetings/2014_Proceedings/papers/paper45.pdf) ·
[Nielsen, Slow AI](https://jakobnielsenphd.substack.com/p/slow-ai) ·
[Designing for AI latency](https://brainy.ink/paper/designing-for-ai-latency) ·
[EFF: loading-screen patent expiry](https://www.eff.org/deeplinks/2015/12/loading-screen-game-patent-finally-expires) ·
[What children do while they wait (JECP)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12186540/) ·
[Loewenstein curiosity gap](https://www.cmu.edu/dietrich/sds/docs/golman/golman_loewenstein_curiosity.pdf) ·
[Leroy, attention residue](https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html) ·
[Cheng & Hill, Scratch (CSCW)](https://mako.cc/academic/cheng_hill-many_dest_many_paths_lpp_scratch-CSCW2022.pdf) ·
Cooney Center well-being framework · Toca Boca design philosophy · Roblox loading-screens docs
