"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  LayoutGrid,
  Maximize,
  Minimize,
  PartyPopper,
  Presentation,
  QrCode,
  RotateCcw,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import VoteQR from "@/components/VoteQR";
import { celebrateBig, tint } from "@/components/theme";
import { AWARDS, NOMINEES, type AwardResult, type ResultsPayload } from "@/lib/data";
import { fetcher } from "@/lib/fetcher";
import { drumroll, fanfare, tick } from "@/lib/sound";

type Mode = "overview" | "stage";
const REVEALED_KEY = "retreat-awards:revealed";

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
        <div className="flex flex-1 items-center justify-center font-semibold text-plum-500">
          {error ? "Can't reach the server — retrying…" : "Opening the envelopes… ✉️"}
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
    <header className="flex flex-wrap items-center gap-3 border-b-2 border-plum-900 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <span className="animate-wiggle inline-block text-2xl">🏆</span>
        <span className="font-display text-xl font-black">
          <span className="text-rainbow">Retreat Awards Night</span>
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-full border-2 border-plum-900 bg-mint-100 px-3 py-1 text-sm shadow-sticker-sm">
        <span className="relative flex h-2.5 w-2.5">
          {!offline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-75" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${offline ? "bg-bubblegum-500" : "bg-mint-400"}`} />
        </span>
        <span className="font-black">
          {voted} of {total}
        </span>
        <span className="font-medium text-plum-700">ballots cast</span>
        {!!data?.guestVoters.length && <span className="text-plum-500">+{data.guestVoters.length} guest</span>}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-full border-2 border-plum-900 bg-white p-0.5">
          <button
            onClick={() => setMode("overview")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${mode === "overview" ? "bg-lavender-300" : "text-plum-500"}`}
          >
            <LayoutGrid size={14} /> Overview
          </button>
          <button
            onClick={() => setMode("stage")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${mode === "stage" ? "bg-bubblegum-300" : "text-plum-500"}`}
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
      className="press rounded-full border-2 border-plum-900 bg-white p-2 shadow-sticker-sm"
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
      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
        <div className="rounded-3xl border-2 border-plum-900 bg-white p-5 shadow-sticker">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl font-black">
              <Users size={20} className="text-lavender-400" /> Who&apos;s voted?
            </h2>
            <span className="text-sm text-plum-500">
              {data.lastVoteAt
                ? `Last ballot ${new Date(data.lastVoteAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "Waiting for the first ballot… ⏳"}
            </span>
          </div>
          <div className="mb-4 h-4 overflow-hidden rounded-full border-2 border-plum-900 bg-plum-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-bubblegum-300 via-lavender-300 to-mint-300 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {NOMINEES.map((n) => {
              const has = data.rosterVoted.includes(n);
              return (
                <div
                  key={n}
                  className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-bold transition ${
                    has ? "border-plum-900 bg-mint-200" : "border-dashed border-plum-300 bg-white/60 text-plum-300"
                  }`}
                >
                  <Avatar name={n} size={26} className={has ? "" : "opacity-40 grayscale"} />
                  {n}
                  {has && <span>✅</span>}
                </div>
              );
            })}
            {data.guestVoters.map((n) => (
              <div key={n} className="flex items-center gap-2 rounded-full border-2 border-plum-900 bg-butter-200 py-1 pl-1 pr-3 text-sm font-bold">
                <Avatar name={n} size={26} /> {n} <span className="text-[10px] font-medium text-plum-500">guest</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-plum-900 bg-lavender-100 p-4 shadow-sticker">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-black uppercase tracking-wider">
            <QrCode size={16} /> Scan to vote
          </p>
          <VoteQR size={130} />
        </div>

        <div className="flex flex-row gap-3 lg:flex-col">
          <button
            onClick={onPresent}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-bubblegum-400 px-6 py-4 font-black text-white shadow-sticker"
          >
            <PartyPopper size={20} /> Start the ceremony!
          </button>
          <button
            onClick={() => setShowTallies((s) => !s)}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-white px-6 py-4 text-sm font-bold shadow-sticker"
          >
            {showTallies ? <EyeOff size={16} /> : <Eye size={16} />}
            {showTallies ? "Hide tallies" : "Peek at tallies (spoilers!)"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AWARDS.map((award, i) => {
          const r = data.awards.find((a) => a.awardId === award.id)!;
          const t = tint(i);
          return (
            <article key={award.id} className={`rounded-3xl border-2 border-plum-900 p-4 shadow-sticker ${t.card}`}>
              <div className="mb-3 flex items-start gap-3">
                <span className="text-3xl">{award.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-plum-500">Award {i + 1}</p>
                  <h3 className="break-words font-display font-black leading-tight">{award.title}</h3>
                  <p className="text-xs font-semibold text-plum-500">{award.subtitle}</p>
                </div>
                <span className={`shrink-0 rounded-full border-2 border-plum-900 px-2 py-0.5 text-xs font-bold ${t.chip}`}>
                  {r.totalVotes} vote{r.totalVotes === 1 ? "" : "s"}
                </span>
              </div>
              <TallyBars result={r} barClass={t.bar} hidden={!showTallies} compact />
            </article>
          );
        })}
      </section>
    </div>
  );
}

function TallyBars({ result, barClass, hidden, compact }: { result: AwardResult; barClass: string; hidden?: boolean; compact?: boolean }) {
  const max = Math.max(1, result.topCount);
  const rows = compact ? result.tally.filter((t) => t.count > 0).slice(0, 4) : result.tally.filter((t) => t.count > 0);
  if (rows.length === 0) return <p className="text-sm font-medium text-plum-500">No votes yet 🦗</p>;
  return (
    <ul className={`space-y-1.5 transition ${hidden ? "pointer-events-none select-none blur-md" : ""}`} aria-hidden={hidden}>
      {rows.map((t) => {
        const win = result.winners.includes(t.name);
        return (
          <li key={t.name} className="flex items-center gap-2">
            <span className={`w-16 shrink-0 truncate text-sm ${compact ? "" : "sm:w-24 sm:text-base"} ${win ? "font-black" : "font-medium text-plum-700"}`}>
              {t.name}
            </span>
            <span className={`flex-1 overflow-hidden rounded-full border-2 border-plum-900 bg-white ${compact ? "h-3.5" : "h-5"}`}>
              <span
                className={`block h-full rounded-full transition-all duration-700 ${win ? barClass : "bg-plum-100"}`}
                style={{ width: `${(t.count / max) * 100}%` }}
              />
            </span>
            <span className="w-6 text-right text-sm font-bold tabular-nums">{t.count}</span>
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
          celebrateBig();
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
            className={`h-3 rounded-full border-2 border-plum-900 transition-all ${
              i === index ? "w-10 bg-bubblegum-400" : a && revealed[a.id] ? "w-5 bg-mint-300" : "w-5 bg-white"
            }`}
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
          className="press flex items-center gap-1 rounded-full border-2 border-plum-900 bg-white px-4 py-2 text-sm font-bold shadow-sticker-sm disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <p className="hidden text-xs font-medium text-plum-500 md:block">← → navigate · Space reveal · F fullscreen</p>
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
              className="flex items-center gap-1 rounded-full border-2 border-dashed border-plum-300 px-3 py-2 text-xs font-medium text-plum-500"
            >
              <RotateCcw size={12} /> Re-hide
            </button>
          )}
          <button
            onClick={() => go(1)}
            disabled={index === AWARDS.length}
            className="press flex items-center gap-1 rounded-full border-2 border-plum-900 bg-white px-4 py-2 text-sm font-bold shadow-sticker-sm disabled:opacity-30"
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
  const t = tint(index);
  // Once the reveal starts, shrink the heading so the winner fits on a projector without scrolling.
  const compact = phase !== "idle";
  return (
    <div className="animate-fade-up flex w-full max-w-4xl flex-col items-center">
      <p className={`mb-4 rounded-full border-2 border-plum-900 px-4 py-1 text-xs font-black uppercase tracking-[0.25em] shadow-sticker-sm sm:text-sm ${t.chip}`}>
        Award {index + 1} of {AWARDS.length}
      </p>
      <div className="animate-float mb-3">
        <span className={`animate-wiggle inline-block ${compact ? "text-5xl sm:text-6xl" : "text-7xl sm:text-9xl"}`}>{award.emoji}</span>
      </div>
      <h2
        className={`break-words font-display font-black leading-tight tracking-tight ${
          compact ? "text-3xl sm:text-5xl" : "text-4xl sm:text-6xl lg:text-7xl"
        }`}
      >
        {award.title}
      </h2>
      <p className="mt-2 font-display text-lg font-bold text-plum-500 sm:text-2xl">{award.subtitle}</p>
      {!compact && (
        <p className={`mx-auto mt-5 max-w-3xl rounded-3xl border-2 border-plum-900 p-5 text-base leading-relaxed text-plum-700 shadow-sticker sm:text-xl ${t.card}`}>
          {award.description}
        </p>
      )}

      <div className="mt-6 flex min-h-[260px] w-full flex-col items-center justify-center sm:min-h-[320px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onReveal}
              className="press animate-jelly flex items-center gap-3 rounded-full border-2 border-plum-900 bg-bubblegum-400 px-10 py-5 text-xl font-black text-white shadow-sticker-lg sm:text-3xl"
            >
              <Sparkles /> Reveal Winner!
            </button>
            <p className="text-sm font-medium text-plum-500">
              {result.totalVotes} vote{result.totalVotes === 1 ? "" : "s"} sealed in the envelope 💌
            </p>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-plum-500">And the award goes to… 🥁</p>
            <span
              key={count}
              className={`animate-count font-display text-[9rem] font-black leading-none sm:text-[12rem] ${
                count === 3 ? "text-bubblegum-400" : count === 2 ? "text-lavender-400" : "text-mint-400"
              }`}
              style={{ WebkitTextStroke: "4px #2f2140" }}
            >
              {count}
            </span>
          </div>
        )}

        {phase === "revealed" &&
          (result.winners.length === 0 ? (
            <p className="text-xl font-semibold text-plum-500">No votes were cast for this award… yet! 🦗</p>
          ) : (
            <div className="flex w-full flex-col items-center">
              {tie && (
                <p className="animate-pop mb-4 rounded-full border-2 border-plum-900 bg-butter-200 px-4 py-1 text-sm font-black uppercase tracking-widest shadow-sticker-sm">
                  It&apos;s a tie — joint winners! 👯
                </p>
              )}
              <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-10">
                {result.winners.map((w, i) => (
                  <div key={w} className="animate-pop flex flex-col items-center" style={{ animationDelay: `${i * 150}ms` }}>
                    <Crown className="animate-wiggle mb-1 fill-butter-300 text-plum-900" size={tie ? 36 : 48} />
                    <div className="rounded-full border-2 border-plum-900 bg-white p-2 shadow-sticker-lg">
                      <Avatar name={w} size={tie ? 96 : 136} />
                    </div>
                    <p className={`mt-4 font-display font-black ${tie ? "text-4xl sm:text-5xl" : "text-5xl sm:text-7xl"}`}>
                      <span className="text-rainbow">{w}</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="animate-fade-up mt-3 text-lg font-semibold text-plum-700" style={{ animationDelay: "300ms" }}>
                with <span className="font-black text-bubblegum-500">{result.topCount}</span> of {result.totalVotes} votes
                {tie ? " each" : ""} 🎉
              </p>
              <div className="animate-fade-up mt-6 w-full max-w-xl rounded-3xl border-2 border-plum-900 bg-white p-4 text-left shadow-sticker" style={{ animationDelay: "600ms" }}>
                <TallyBars result={result} barClass={t.bar} />
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
      <div className="animate-float mb-2 text-7xl">🏆</div>
      <h2 className="font-display text-4xl font-black sm:text-6xl">
        <span className="text-rainbow">Hall of Fame</span>
      </h2>
      <p className="mt-2 font-medium text-plum-500">Thank you for a fabulous retreat — this ballot is now fully executed! 🖋️</p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        {AWARDS.map((a, i) => {
          const r = data.awards.find((x) => x.awardId === a.id)!;
          const shown = !!revealed[a.id];
          return (
            <div key={a.id} className={`flex items-center gap-3 rounded-2xl border-2 border-plum-900 p-3 shadow-sticker-sm ${tint(i).card}`}>
              <span className="text-2xl">{a.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{a.title}</p>
                <p className="truncate text-xs text-plum-500">{a.subtitle}</p>
              </div>
              <span className="text-right text-sm font-black">
                {!shown ? (
                  <span className="font-medium text-plum-300">🤫 Secret</span>
                ) : r.winners.length ? (
                  r.winners.join(" & ")
                ) : (
                  <span className="text-plum-300">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
