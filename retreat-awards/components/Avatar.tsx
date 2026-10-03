const PALETTE = [
  "from-bubblegum-200 to-bubblegum-400",
  "from-lavender-200 to-lavender-400",
  "from-mint-200 to-mint-400",
  "from-peach-100 to-peach-300",
  "from-sky-100 to-sky-300",
  "from-butter-100 to-butter-300",
  "from-bubblegum-100 to-lavender-300",
  "from-mint-100 to-sky-300",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

export default function Avatar({ name, size = 48, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-plum-900 bg-gradient-to-br font-display font-extrabold text-plum-900 ${PALETTE[hash(name) % PALETTE.length]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
