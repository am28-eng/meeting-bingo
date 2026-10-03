"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import confetti from "canvas-confetti";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  LayoutGrid,
  Maximize,
  Minimize,
  Presentation,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { AWARDS, NOMINEES, type AwardResult, type ResultsPayload } from "@/lib/data";
import { fetcher } from "@/lib/fetcher";
import { drumroll, fanfare, tick } from "@/lib/sound";

type Mode = "overview" | "stage";
const REVEALED_KEY = "retreat-awards:revealed";
const GOLD = ["#dcb145", "#f1dd95", "#f8efcc", "#a87623", "#ffffff"];

function fireConfettiCannon() {
  const end = Date.now() + 2600;
  confetti({ particleCount: 180, spread: 100, startVelocity: 55, origin: { y: 0.65 }, colors: GOLD, scalar: 1.2 });
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: GOLD });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: GOLD });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  setTimeout(
    () => confetti({ particleCount: 120, spread: 160, startVelocity: 35, origin: { y: 0.3 }, colors: GOLD, shapes: ["star"] }),
    700,
  );
}

export default function ResultsPage() {
  const { data, error } = useSWR<ResultsPayload>("/api/results", fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: true,
  });
  const [mode, setMode] = useState<Mode>("overview");
  const [soundOn, setSoundOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  return (
    <main className="flex min-h-dvh flex-col">
      <TopBar
        data={data}
        mode={mode}
        setMode={setMode}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        fullscreen={fullscreen}
        toggleFullscreen={toggleFullscreen}
        offline={!!error}
      />
      {!data ? (
        <div className="flex flex-1 items-center justify-center text-white/50">
          {error ? "Can't reach the server — retrying…" : "Loading the envelopes…"}
        </div>
      ) : mode === "overview" ? (
        <Overview data={data} onPresent={() => setMode("stage")} />
      ) : (
        <Stage data={data} soundOn={soundOn} toggleFullscreen={toggleFullscreen} />
      )}
    </main>
  );
}

function TopBar({
  data,
  mode,
  setMode,
  soundOn,
  setSoundOn,
  fullscreen,
  toggleFullscreen,
  offline,
}: {
  data?: ResultsPayload;
  mode: Mode;
  setMode: (m: Mode) => void;
  soundOn: boolean;
  setSoundOn: (b: boolean) => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  offline: boolean;
}) {
  const voted = data ? data.rosterVoted.length : "–";
  const total = data?.rosterSize ?? NOMINEES.length;
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/5 bg-ink-950/60 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <Trophy className="text-gold-300" size={20} />
        <span className="font-display text-lg font-bold">
          <span className="text-gold-gradient">Retreat Awards Night</span>
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/5 px-3 py-1 text-sm">
        <span className="relative flex h-2 w-2">
          {!offline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${offline ? "bg-red-400" : "bg-emerald-400"}`} />
        </span>
        <span className="font-semibold text-gold-100">
          {voted} of {total}
        </span>
        <span className="text-white/60">ballots cast</span>
        {!!data?.guestVoters.length && <span className="text-white/40">+{data.guestVoters.length} guest</span>}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex rounded-full border border-white/10 p-0.5">
          <button
            onClick={() => setMode("overview")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${mode === "overview" ? "bg-gold-400 text-ink-950" : "text-white/70"}`}
          >
            <LayoutGrid size={14} /> Overview
          </button>
          <button
            onClick={() => setMode("stage")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${mode === "stage" ? "bg-gold-400 text-ink-950" : "text-white/70"}`}
          >
            <Presentation size={14} /> Stage
          </button>
        </div>
        <IconBtn label={soundOn ? "Mute" : "Unmute"} onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </IconBtn>
        <IconBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </IconBtn>
      </div>
    </header>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-gold-400/50 hover:text-gold-200"
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Overview */

function Overview({ data, onPresent }: { data: ResultsPayload; onPresent: () => void }) {
  const [showTallies, setShowTallies] = useState(false);
  const pct = Math.round((data.rosterVoted.length / data.rosterSize) * 100);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-3xl gold-border bg-ink-900/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Users size={18} className="text-gold-300" /> Voter turnout
            </h2>
            <span className="text-sm text-white/50">
              {data.lastVoteAt ? `Last ballot ${new Date(data.lastVoteAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Waiting for the first ballot…"}
            </span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-200 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-3">
            {NOMINEES.map((n) => {
              const has = data.rosterVoted.includes(n);
              return (
                <div key={n} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition ${has ? "bg-gold-400/15 text-gold-100" : "bg-white/5 text-white/35"}`}>
                  <Avatar name={n} size={26} className={has ? "" : "opacity-30 grayscale"} />
                  {n}
                  {has && <span className="text-xs text-emerald-300">✓</span>}
                </div>
              );
            })}
            {data.guestVoters.map((n) => (
              <div key={n} className="flex items-center gap-2 rounded-full bg-gold-400/10 py-1 pl-1 pr-3 text-sm text-gold-100/80">
                <Avatar name={n} size={26} /> {n} <span className="text-[10px] text-white/40">guest</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-row gap-3 lg:flex-col">
          <button
            onClick={onPresent}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 px-6 py-4 font-bold text-ink-950"
          >
            <Presentation size={18} /> Start the ceremony
          </button>
          <button
            onClick={() => setShowTallies((s) => !s)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-4 text-sm text-white/80 hover:border-gold-400/50"
          >
            {showTallies ? <EyeOff size={16} /> : <Eye size={16} />}
            {showTallies ? "Hide tallies" : "Show tallies (spoilers!)"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AWARDS.map((award, i) => {
          const r = data.awards.find((a) => a.awardId === award.id)!;
          return (
            <article key={award.id} className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="text-3xl">{award.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400">Award {i + 1}</p>
                  <h3 className="break-words font-display font-bold leading-tight text-gold-100">{award.title}</h3>
                  <p className="text-xs italic text-white/50">{award.subtitle}</p>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60">{r.totalVotes} vote{r.totalVotes === 1 ? "" : "s"}</span>
              </div>
              <TallyBars result={r} hidden={!showTallies} compact />
            </article>
          );
        })}
      </section>
    </div>
  );
}

function TallyBars({ result, hidden, compact }: { result: AwardResult; hidden?: boolean; compact?: boolean }) {
  const max = Math.max(1, result.topCount);
  const rows = compact ? result.tally.filter((t) => t.count > 0).slice(0, 4) : result.tally.filter((t) => t.count > 0);
  if (rows.length === 0) return <p className="text-sm text-white/30">No votes yet.</p>;
  return (
    <ul className={`space-y-1.5 transition ${hidden ? "pointer-events-none select-none blur-md" : ""}`} aria-hidden={hidden}>
      {rows.map((t) => {
        const win = result.winners.includes(t.name);
        return (
          <li key={t.name} className="flex items-center gap-2">
            <span className={`w-16 shrink-0 truncate text-sm ${compact ? "" : "sm:w-24 sm:text-base"} ${win ? "font-semibold text-gold-100" : "text-white/70"}`}>
              {t.name}
            </span>
            <span className={`flex-1 overflow-hidden rounded-full bg-white/5 ${compact ? "h-2.5" : "h-4"}`}>
              <span
                className={`block h-full rounded-full transition-all duration-700 ${win ? "bg-gradient-to-r from-gold-500 to-gold-200" : "bg-white/25"}`}
                style={{ width: `${(t.count / max) * 100}%` }}
              />
            </span>
            <span className="w-6 text-right text-sm tabular-nums text-white/70">{t.count}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------- Stage */

type RevealPhase = "idle" | "countdown" | "revealed";

function loadRevealed(epoch: string): Record<string, true> {
  try {
    const saved = JSON.parse(localStorage.getItem(REVEALED_KEY) ?? "null");
    return saved?.epoch === epoch ? saved.revealed ?? {} : {};
  } catch {
    return {};
  }
}

function Stage({ data, soundOn, toggleFullscreen }: { data: ResultsPayload; soundOn: boolean; toggleFullscreen: () => void }) {
  // index === AWARDS.length is the closing "Hall of Fame" slide.
  const [index, setIndex] = useState(0);
  // Stage only mounts client-side (after results load), so reading storage here is safe.
  const [revealed, setRevealed] = useState<Record<string, true>>(() => loadRevealed(data.epoch));
  const [phase, setPhase] = useState<RevealPhase>(() => (revealed[AWARDS[0].id] ? "revealed" : "idle"));
  const [count, setCount] = useState(3);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Remember which awards have been revealed (per voting epoch) across refreshes.
  // Votes were reset by the admin: forget what has been revealed.
  const epochRef = useRef(data.epoch);
  useEffect(() => {
    if (epochRef.current === data.epoch) return;
    epochRef.current = data.epoch;
    setRevealed({});
    setPhase("idle");
  }, [data.epoch]);
  useEffect(() => {
    try {
      localStorage.setItem(REVEALED_KEY, JSON.stringify({ epoch: data.epoch, revealed }));
    } catch {
      /* ignore */
    }
  }, [revealed, data.epoch]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const award = AWARDS[index];
  const result = award ? data.awards.find((a) => a.awardId === award.id)! : null;

  useEffect(() => {
    clearTimers();
    setPhase(award && revealed[award.id] ? "revealed" : "idle");
  }, [index]);

  const reveal = useCallback(() => {
    if (!award || phase === "countdown") return;
    clearTimers();
    setPhase("countdown");
    setCount(3);
    if (soundOn) {
      drumroll(3);
      tick();
    }
    timers.current.push(
      setTimeout(() => {
        setCount(2);
        if (soundOn) tick();
      }, 1000),
      setTimeout(() => {
        setCount(1);
        if (soundOn) tick(true);
      }, 2000),
      setTimeout(() => {
        setPhase("revealed");
        setRevealed((r) => ({ ...r, [award.id]: true }));
        if (result && result.winners.length > 0) {
          if (soundOn) fanfare();
          fireConfettiCannon();
        }
      }, 3000),
    );
  }, [award, phase, soundOn, result]);

  const go = useCallback((delta: number) => {
    setIndex((i) => Math.min(AWARDS.length, Math.max(0, i + delta)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (phase === "idle") reveal();
        else if (phase === "revealed") go(1);
      } else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, reveal, phase, toggleFullscreen]);

  return (
    <div className="relative flex flex-1 flex-col">
      {/* progress */}
      <div className="flex justify-center gap-1.5 px-4 pt-4">
        {[...AWARDS, null].map((a, i) => (
          <button
            key={a?.id ?? "finale"}
            aria-label={a ? a.title : "Hall of Fame"}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-gold-300" : a && revealed[a.id] ? "w-4 bg-gold-600" : "w-4 bg-white/15"}`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-10">
        {award && result ? (
          <AwardSlide key={award.id} index={index} award={award} result={result} phase={phase} count={count} onReveal={reveal} />
        ) : (
          <HallOfFame data={data} revealed={revealed} />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-5 sm:px-8">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <p className="hidden text-xs text-white/30 md:block">← → navigate · Space reveal · F fullscreen</p>
        <div className="flex gap-2">
          {award && phase === "revealed" && (
            <button
              onClick={() => {
                setRevealed((r) => {
                  const rest = { ...r };
                  delete rest[award.id];
                  return rest;
                });
                setPhase("idle");
              }}
              title="Hide this result again"
              className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs text-white/50"
            >
              <RotateCcw size={12} /> Re-hide
            </button>
          )}
          <button
            onClick={() => go(1)}
            disabled={index === AWARDS.length}
            className="flex items-center gap-1 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
          >
            {index === AWARDS.length - 1 ? "Finale" : "Next"} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AwardSlide({
  index,
  award,
  result,
  phase,
  count,
  onReveal,
}: {
  index: number;
  award: (typeof AWARDS)[number];
  result: AwardResult;
  phase: RevealPhase;
  count: number;
  onReveal: () => void;
}) {
  const tie = result.winners.length > 1;
  return (
    <div className="animate-fade-up flex w-full max-w-4xl flex-col items-center">
      <p className="mb-3 text-xs uppercase tracking-[0.35em] text-gold-400 sm:text-sm">
        Award {index + 1} of {AWARDS.length}
      </p>
      <div className="mb-3 text-6xl sm:text-8xl">{award.emoji}</div>
      <h2 className="break-words font-display text-4xl font-black leading-tight sm:text-6xl lg:text-7xl">
        <span className="text-gold-gradient">{award.title}</span>
      </h2>
      <p className="mt-2 font-display text-lg italic text-white/70 sm:text-2xl">{award.subtitle}</p>
      <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-white/70 sm:text-xl">{award.description}</p>

      <div className="mt-8 flex min-h-[260px] w-full flex-col items-center justify-center sm:min-h-[320px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onReveal}
              className="animate-pulse-gold flex items-center gap-3 rounded-full bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 px-10 py-5 text-xl font-bold text-ink-950 transition hover:scale-105 sm:text-2xl"
            >
              <Sparkles /> Reveal Winner
            </button>
            <p className="text-sm text-white/40">{result.totalVotes} vote{result.totalVotes === 1 ? "" : "s"} sealed in the envelope</p>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm uppercase tracking-[0.4em] text-white/50">And the award goes to…</p>
            <span key={count} className="animate-count font-display text-[9rem] font-black leading-none text-gold-200 sm:text-[12rem]">
              {count}
            </span>
          </div>
        )}

        {phase === "revealed" &&
          (result.winners.length === 0 ? (
            <p className="text-xl text-white/50">No votes were cast for this award… yet.</p>
          ) : (
            <div className="flex w-full flex-col items-center">
              {tie && (
                <p className="animate-fade-up mb-3 rounded-full bg-gold-400/15 px-4 py-1 text-sm font-semibold uppercase tracking-[0.25em] text-gold-200">
                  It&apos;s a tie — joint winners!
                </p>
              )}
              <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-10">
                {result.winners.map((w, i) => (
                  <div key={w} className="animate-pop flex flex-col items-center" style={{ animationDelay: `${i * 150}ms` }}>
                    <Crown className="mb-1 text-gold-300 drop-shadow-[0_0_12px_rgb(220_177_69/0.8)]" size={tie ? 32 : 44} />
                    <div className="rounded-full p-1.5 shadow-[0_0_80px_-10px_rgb(220_177_69/0.9)] ring-4 ring-gold-300">
                      <Avatar name={w} size={tie ? 96 : 136} />
                    </div>
                    <p className={`mt-3 font-display font-black text-gold-100 ${tie ? "text-4xl sm:text-5xl" : "text-5xl sm:text-7xl"}`}>{w}</p>
                  </div>
                ))}
              </div>
              <p className="animate-fade-up mt-3 text-lg text-white/70" style={{ animationDelay: "300ms" }}>
                with <span className="font-bold text-gold-200">{result.topCount}</span> of {result.totalVotes} votes
                {tie ? " each" : ""}
              </p>
              <div className="animate-fade-up mt-6 w-full max-w-xl text-left" style={{ animationDelay: "600ms" }}>
                <TallyBars result={result} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function HallOfFame({ data, revealed }: { data: ResultsPayload; revealed: Record<string, true> }) {
  return (
    <div className="animate-fade-up w-full max-w-5xl">
      <Trophy className="mx-auto mb-3 text-gold-300" size={48} />
      <h2 className="font-display text-4xl font-black sm:text-6xl">
        <span className="text-gold-gradient">Hall of Fame</span>
      </h2>
      <p className="mt-2 text-white/60">Thank you for a fabulous retreat — this ballot is now fully executed.</p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        {AWARDS.map((a) => {
          const r = data.awards.find((x) => x.awardId === a.id)!;
          const shown = !!revealed[a.id];
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/70 p-3">
              <span className="text-2xl">{a.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gold-100">{a.title}</p>
                <p className="truncate text-xs text-white/50">{a.subtitle}</p>
              </div>
              <span className="text-right text-sm font-semibold">
                {!shown ? (
                  <span className="text-white/30">Unrevealed</span>
                ) : r.winners.length ? (
                  r.winners.join(" & ")
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
