"use client";

type ChipKind = "idea" | "microchoice" | "activity" | "newapp";
type Chip = { _id: string; label: string; emoji?: string; kind: ChipKind };

// Microchoice chips read as "answer this fun question" (blush pink, the question itself is
// the avatar bubble above); idea chips read as "build this next" (aqua); a newapp chip is
// the big green "start it as its OWN app" CTA Sparky offers when the kid asks for a
// totally different app (tapping it makes a fresh app + builds their idea in it).
export function SuggestionChips({
  chips,
  onPick,
}: {
  chips: Chip[];
  onPick: (id: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {chips.map((c, i) => {
        // The "start a new app" button — a full-width green CTA, set apart from the small
        // aqua/pink chips so it clearly reads as "spin this up as its own app".
        if (c.kind === "newapp") {
          return (
            <button
              key={c._id}
              onClick={() => onPick(c._id)}
              className="btn-toy vk-pop-in w-full rounded-2xl border-lime-deep bg-lime px-4 py-3 text-left text-base text-ink"
            >
              {`${c.emoji ?? "🆕"} Start "${c.label}" ▸`}
            </button>
          );
        }
        const micro = c.kind === "microchoice";
        return (
          <button
            key={c._id}
            onClick={() => onPick(c._id)}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`btn-toy vk-pop-in px-4 py-2 text-sm ${
              micro
                ? "border-blush-deep bg-blush text-ink"
                : "border-aqua-deep bg-aqua text-ink"
            }`}
          >
            {c.emoji ? `${c.emoji} ` : micro ? "👉 " : ""}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
