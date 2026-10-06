"use client";

// The blank page killed (first-run gap vs Lovable/Bolt/v0 example prompts, kid-sized):
// an empty app greets the kid with six big tappable idea cards — wide walls, one tap
// to magic. Tapping sends the prompt as if the kid typed it.

const STARTERS: { emoji: string; label: string; prompt: string }[] = [
  {
    emoji: "🐉",
    label: "A dragon that flies when you click",
    prompt: "Make a dragon that flaps its wings and flies up every time I click it!",
  },
  {
    emoji: "🎨",
    label: "A rainbow drawing app",
    prompt: "Make a drawing app where I can paint with rainbow colors and a big eraser!",
  },
  {
    emoji: "🚀",
    label: "A dodge-the-asteroids game",
    prompt: "Make a space game where I fly a rocket and dodge asteroids to get points!",
  },
  {
    emoji: "😂",
    label: "A silly joke machine",
    prompt: "Make a joke machine with a big button that tells a new silly kid joke each press!",
  },
  {
    emoji: "🎹",
    label: "A piano with animal sounds",
    prompt: "Make a piano where every key plays a different funny animal sound!",
  },
  {
    emoji: "🍕",
    label: "Build-your-own pizza",
    prompt: "Make a pizza builder where I click toppings to pile them on a giant pizza!",
  },
];

export function StarterIdeas({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="mt-6">
      <p className="text-center font-display text-xl font-bold text-ink">
        Let’s make something! ✨
      </p>
      <p className="mb-4 mt-1 text-center font-semibold text-ink-soft">
        Tap an idea — or tell me your own below!
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {STARTERS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="card-sticker vk-pop-in flex flex-col items-center gap-1.5 p-3 text-center transition hover:-translate-y-1 hover:shadow-toy active:translate-y-0"
          >
            <span className="text-4xl drop-shadow-sm">{s.emoji}</span>
            <span className="font-display text-[13px] font-bold leading-tight text-ink">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
