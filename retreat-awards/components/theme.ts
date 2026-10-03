import confetti from "canvas-confetti";

/** One pastel tint per award, cycled by index. Full class names so Tailwind picks them up. */
export const TINTS = [
  { card: "bg-bubblegum-100", chip: "bg-bubblegum-300", bar: "bg-bubblegum-400" },
  { card: "bg-lavender-100", chip: "bg-lavender-300", bar: "bg-lavender-400" },
  { card: "bg-mint-100", chip: "bg-mint-300", bar: "bg-mint-400" },
  { card: "bg-peach-100", chip: "bg-peach-300", bar: "bg-peach-300" },
  { card: "bg-sky-100", chip: "bg-sky-300", bar: "bg-sky-300" },
  { card: "bg-butter-100", chip: "bg-butter-300", bar: "bg-butter-300" },
] as const;

export const tint = (i: number) => TINTS[i % TINTS.length];

export const PASTEL_CONFETTI = ["#ff7eb6", "#ffa8cc", "#a78bfa", "#c4b5fd", "#4fcf9a", "#8fe3be", "#ffbf94", "#9fd0ff", "#ffe67a"];

let emojiShapes: confetti.Shape[] | null = null;
function shapes(): confetti.Shape[] {
  if (!emojiShapes) {
    try {
      emojiShapes = ["🎉", "⭐", "💖", "✨"].map((text) => confetti.shapeFromText({ text, scalar: 2 }));
    } catch {
      emojiShapes = [];
    }
  }
  return emojiShapes;
}

/** Small burst for the voter's phone after submitting. */
export function celebrateSmall() {
  confetti({ particleCount: 110, spread: 80, origin: { y: 0.7 }, colors: PASTEL_CONFETTI });
  setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0 }, colors: PASTEL_CONFETTI }), 250);
  setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1 }, colors: PASTEL_CONFETTI }), 400);
}

/** Big confetti cannon for the stage reveal, with emoji confetti mixed in. */
export function celebrateBig() {
  const end = Date.now() + 2600;
  confetti({ particleCount: 180, spread: 110, startVelocity: 55, origin: { y: 0.65 }, colors: PASTEL_CONFETTI, scalar: 1.2 });
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: PASTEL_CONFETTI });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: PASTEL_CONFETTI });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  const emoji = shapes();
  if (emoji.length) {
    setTimeout(() => confetti({ particleCount: 40, spread: 140, startVelocity: 40, origin: { y: 0.4 }, shapes: emoji, scalar: 2 }), 600);
  }
}
