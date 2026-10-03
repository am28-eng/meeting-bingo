const PALETTE = [
  "from-amber-300 to-yellow-600",
  "from-rose-300 to-rose-600",
  "from-sky-300 to-indigo-600",
  "from-emerald-300 to-teal-600",
  "from-violet-300 to-purple-600",
  "from-orange-300 to-red-600",
  "from-cyan-300 to-blue-600",
  "from-fuchsia-300 to-pink-600",
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-ink-950 shadow-inner ${PALETTE[hash(name) % PALETTE.length]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
