// Sparky's while-you-wait fun facts & jokes — rotated during builds so the wait has
// treats in it. Kid-true (8–12, 2nd–4th grade reading level), maker-curious, zero
// guilt/pressure. Pure content: no AI calls, no network.

export const FUN_FACTS: string[] = [
  "Did you know? The first computer bug was a REAL moth stuck inside a computer! 🦋",
  "Joke: Why did the computer go to the doctor? It caught a virus! 🤒",
  "Did you know? The people who make video games play them hundreds of times to find bugs! 🎮",
  "Joke: What do you call a robot who takes the long way? R2-Detour! 🤖",
  "Did you know? Minecraft was made by a small team — big things start small! ⛏️",
  "Tip: The best builders make a tiny version FIRST, then add cool stuff one piece at a time. 🧱",
  "Did you know? Computers only really understand two things: 1 and 0. Everything is built from those! 💡",
  "Joke: Why was the math book sad? Too many problems! 📚",
  "Did you know? The first video game ever was made in 1958 — it was tennis with glowing dots! 🎾",
  "Tip: If an idea feels too big, split it into tiny pieces. That's what real coders do! ✂️",
  "Did you know? Roblox games are made by kids and grown-ups all over the world! 🌍",
  "Joke: What's a computer's favorite snack? Micro-CHIPS! 🍟",
  "Did you know? Astronauts' spaceships run on code, just like your app! 🚀",
  "Did you know? Some games take YEARS to build — you're building yours in minutes! ⏱️",
  "Joke: Why don't robots ever panic? They have nerves of steel! 🦾",
  "Tip: Wild ideas make the BEST apps. The sillier, the better! 🤪",
  "Did you know? The internet sends messages as light zooming through glass threads under the ocean! 🌊",
  "Joke: What did one pixel say to the other? I've got my eye on you! 👀",
  "Did you know? Emoji are code too — every 🐼 is a secret number underneath! 🔢",
  "Tip: When something breaks, that's not failing — that's finding out how it works! 🔧",
];

// Deterministic-ish rotation seeded by an index the caller advances on a timer.
export function factAt(i: number): string {
  return FUN_FACTS[((i % FUN_FACTS.length) + FUN_FACTS.length) % FUN_FACTS.length];
}

export function randomFactIndex(): number {
  return Math.floor(Math.random() * FUN_FACTS.length);
}
