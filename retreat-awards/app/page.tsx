"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Lock,
  Pencil,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { AWARDS, NOMINEES, voterKey } from "@/lib/data";

type Step = "loading" | "identity" | "voting" | "review" | "submitted";
type Votes = Record<string, string>;

const BALLOT_KEY = "retreat-awards:ballot";
const DRAFT_KEY = "retreat-awards:draft";

type StoredBallot = { voter: string; epoch: string; votes: Votes };
type Draft = { voter: string; votes: Votes; index: number };

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — the server is still the source of truth */
  }
}

async function checkServer(voter: string): Promise<{ epoch: string; submitted: boolean; votes?: Votes }> {
  const res = await fetch(`/api/votes?voter=${encodeURIComponent(voter)}`, { cache: "no-store" });
  const data = await res.json();
  return { epoch: data.epoch, submitted: data.submitted, votes: data.ballot?.votes };
}

export default function VotePage() {
  const [step, setStep] = useState<Step>("loading");
  const [voter, setVoter] = useState("");
  const [votes, setVotes] = useState<Votes>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Restore state on load: a submitted ballot (verified against the server, in case
  // the admin reset the votes) or an in-progress draft.
  useEffect(() => {
    (async () => {
      const stored = load<StoredBallot>(BALLOT_KEY);
      if (stored) {
        try {
          const s = await checkServer(stored.voter);
          if (s.submitted && s.epoch === stored.epoch) {
            setVoter(stored.voter);
            setVotes(s.votes ?? stored.votes);
            setStep("submitted");
            return;
          }
        } catch {
          // Offline: trust local state rather than inviting a double vote.
          setVoter(stored.voter);
          setVotes(stored.votes);
          setStep("submitted");
          return;
        }
        save(BALLOT_KEY, null);
      }
      const draft = load<Draft>(DRAFT_KEY);
      if (draft?.voter) {
        setVoter(draft.voter);
        setVotes(draft.votes ?? {});
        setIndex(Math.min(draft.index ?? 0, AWARDS.length - 1));
        setStep("voting");
        return;
      }
      setStep("identity");
    })();
  }, []);

  // Persist the draft so an accidental refresh mid-ballot loses nothing.
  useEffect(() => {
    if (step === "voting" || step === "review") save(DRAFT_KEY, { voter, votes, index });
  }, [step, voter, votes, index]);

  // While showing the "submitted" screen, notice if the admin resets the votes.
  useEffect(() => {
    if (step !== "submitted") return;
    const stored = load<StoredBallot>(BALLOT_KEY);
    if (!stored) return;
    const t = setInterval(async () => {
      try {
        const s = await checkServer(stored.voter);
        if (!s.submitted || s.epoch !== stored.epoch) {
          save(BALLOT_KEY, null);
          save(DRAFT_KEY, null);
          setVotes({});
          setIndex(0);
          setVoter("");
          setStep("identity");
        }
      } catch {
        /* ignore transient network errors */
      }
    }, 10000);
    return () => clearInterval(t);
  }, [step]);

  const startAs = useCallback(async (name: string) => {
    setError(null);
    setBusy(true);
    try {
      const s = await checkServer(name);
      if (s.submitted) {
        setError(`${name} has already voted. If that wasn't you, ask the host to help.`);
        return;
      }
      setVoter(name);
      setVotes({});
      setIndex(0);
      setStep("voting");
      window.scrollTo({ top: 0 });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter, votes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      save(BALLOT_KEY, { voter: data.ballot.voter, epoch: data.epoch, votes } satisfies StoredBallot);
      save(DRAFT_KEY, null);
      setVoter(data.ballot.voter);
      setStep("submitted");
      window.scrollTo({ top: 0 });
      const colors = ["#dcb145", "#f1dd95", "#ffffff", "#a87623"];
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, colors });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
    } catch {
      setError("Couldn't reach the server. Your picks are saved on this device — try again.");
    } finally {
      setBusy(false);
    }
  }, [voter, votes]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-6 sm:pt-10">
      <Header />
      {step === "loading" && (
        <div className="flex flex-1 items-center justify-center text-gold-300">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {step === "identity" && <IdentityStep onPick={startAs} busy={busy} error={error} />}
      {step === "voting" && (
        <VotingStep
          voter={voter}
          votes={votes}
          index={index}
          setIndex={setIndex}
          onVote={(awardId, name) => setVotes((v) => ({ ...v, [awardId]: name }))}
          onReview={() => {
            setStep("review");
            window.scrollTo({ top: 0 });
          }}
          onChangeVoter={() => {
            save(DRAFT_KEY, null);
            setVotes({});
            setStep("identity");
          }}
        />
      )}
      {step === "review" && (
        <ReviewStep
          voter={voter}
          votes={votes}
          busy={busy}
          error={error}
          onEdit={(i) => {
            setIndex(i);
            setError(null);
            setStep("voting");
          }}
          onSubmit={submit}
        />
      )}
      {step === "submitted" && <SubmittedStep voter={voter} votes={votes} />}
    </main>
  );
}

function Header() {
  return (
    <header className="mb-6 text-center">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-gold-200">
        <Trophy size={12} /> Retreat 2026
      </div>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">
        <span className="text-gold-gradient">Awards Night</span>
      </h1>
      <p className="mt-1 text-sm text-white/50">Legal &amp; Contracts Edition</p>
    </header>
  );
}

function IdentityStep({ onPick, busy, error }: { onPick: (name: string) => void; busy: boolean; error: string | null }) {
  const [guest, setGuest] = useState("");
  const [showGuest, setShowGuest] = useState(false);
  return (
    <section className="animate-fade-up flex flex-1 flex-col">
      <h2 className="mb-1 text-center font-display text-2xl">Who is voting?</h2>
      <p className="mb-5 text-center text-sm text-white/55">Pick your name to get your ballot. One ballot per person.</p>
      <div className="grid grid-cols-2 gap-3">
        {NOMINEES.map((name) => (
          <button
            key={name}
            disabled={busy}
            onClick={() => onPick(name)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 p-3 text-left transition hover:border-gold-400/60 hover:bg-ink-700 active:scale-[0.98] disabled:opacity-60"
          >
            <Avatar name={name} size={40} />
            <span className="flex-1 font-medium">{name}</span>
            <ChevronRight size={16} className="text-white/30 transition group-hover:text-gold-300" />
          </button>
        ))}
      </div>

      <div className="mt-5">
        {!showGuest ? (
          <button
            onClick={() => setShowGuest(true)}
            className="mx-auto flex items-center gap-2 text-sm text-white/50 underline-offset-4 hover:text-gold-200 hover:underline"
          >
            <UserPlus size={14} /> Not on the list? Enter your name
          </button>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (guest.trim()) onPick(guest.trim());
            }}
          >
            <input
              autoFocus
              value={guest}
              maxLength={40}
              onChange={(e) => setGuest(e.target.value)}
              placeholder="Your name"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-ink-800 px-4 py-3 outline-none placeholder:text-white/30 focus:border-gold-400"
            />
            <button
              disabled={!guest.trim() || busy}
              className="rounded-xl bg-gold-400 px-4 font-semibold text-ink-950 disabled:opacity-40"
            >
              Start
            </button>
          </form>
        )}
      </div>

      {busy && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gold-200">
          <Loader2 size={14} className="animate-spin" /> Fetching your ballot…
        </p>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-300">{error}</p>}
    </section>
  );
}

function VotingStep({
  voter,
  votes,
  index,
  setIndex,
  onVote,
  onReview,
  onChangeVoter,
}: {
  voter: string;
  votes: Votes;
  index: number;
  setIndex: (i: number) => void;
  onVote: (awardId: string, name: string) => void;
  onReview: () => void;
  onChangeVoter: () => void;
}) {
  const award = AWARDS[index];
  const picked = votes[award.id];
  const done = AWARDS.filter((a) => votes[a.id]).length;
  const isLast = index === AWARDS.length - 1;
  const allDone = done === AWARDS.length;

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(advanceTimer.current ?? undefined), [index]);

  const choose = (name: string) => {
    onVote(award.id, name);
    // Gentle auto-advance keeps thumbs moving; the last card goes to review.
    clearTimeout(advanceTimer.current ?? undefined);
    advanceTimer.current = setTimeout(() => {
      if (!isLast) setIndex(index + 1);
      else onReview();
    }, 380);
  };

  return (
    <section className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between text-xs text-white/50">
        <span>
          Voting as <span className="font-semibold text-gold-200">{voter}</span>{" "}
          <button onClick={onChangeVoter} className="ml-1 underline underline-offset-2 hover:text-white">
            change
          </button>
        </span>
        <span>
          {done}/{AWARDS.length} picked
        </span>
      </div>

      {/* Progress dots — tap to jump */}
      <div className="mb-4 flex gap-1.5">
        {AWARDS.map((a, i) => (
          <button
            key={a.id}
            aria-label={`Go to ${a.title}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 flex-1 rounded-full transition ${
              i === index ? "bg-gold-300" : votes[a.id] ? "bg-gold-600" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      <article key={award.id} className="animate-fade-up rounded-3xl gold-border bg-ink-900/80 p-5 shadow-2xl shadow-black/40">
        <div className="mb-3 flex items-start gap-3">
          <span className="text-4xl leading-none">{award.emoji}</span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-400">
              Award {index + 1} of {AWARDS.length}
            </p>
            <h2 className="break-words font-display text-2xl font-bold leading-tight text-gold-100">{award.title}</h2>
            <p className="text-sm italic text-white/60">{award.subtitle}</p>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed text-white/80">{award.description}</p>
      </article>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {NOMINEES.map((name) => {
          const isSelf = voterKey(name) === voterKey(voter);
          const selected = picked === name;
          return (
            <button
              key={name}
              disabled={isSelf}
              onClick={() => choose(name)}
              aria-pressed={selected}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition active:scale-[0.97] ${
                selected
                  ? "border-gold-300 bg-gold-400/15 shadow-[0_0_24px_-4px_rgb(220_177_69/0.6)]"
                  : "border-white/10 bg-ink-800/80 hover:border-gold-400/50"
              } ${isSelf ? "cursor-not-allowed opacity-35" : ""}`}
            >
              {selected && (
                <span className="animate-pop absolute right-2 top-2 rounded-full bg-gold-300 p-0.5 text-ink-950">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <Avatar name={name} size={44} />
              <span className="text-sm font-medium">{name}</span>
              {isSelf && <span className="text-[10px] text-white/60">That&apos;s you!</span>}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-auto flex gap-3 bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent pb-2 pt-6">
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="flex items-center justify-center gap-1 rounded-2xl border border-white/15 px-4 py-3.5 text-sm disabled:opacity-30"
        >
          <ArrowLeft size={16} /> Back
        </button>
        {isLast || allDone ? (
          <button
            onClick={onReview}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-400 py-3.5 font-semibold text-ink-950 transition disabled:bg-white/10 disabled:text-white/40"
          >
            Review ballot <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setIndex(index + 1)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gold-400/50 py-3.5 font-semibold text-gold-100"
          >
            {picked ? "Next award" : "Skip for now"} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

function ReviewStep({
  voter,
  votes,
  busy,
  error,
  onEdit,
  onSubmit,
}: {
  voter: string;
  votes: Votes;
  busy: boolean;
  error: string | null;
  onEdit: (i: number) => void;
  onSubmit: () => void;
}) {
  const missing = AWARDS.filter((a) => !votes[a.id]);
  return (
    <section className="animate-fade-up flex flex-1 flex-col">
      <h2 className="text-center font-display text-2xl">Review your ballot</h2>
      <p className="mb-5 text-center text-sm text-white/55">
        {voter}, tap any award to change your pick. Once locked in, it&apos;s final — no redlines.
      </p>
      <ul className="space-y-2">
        {AWARDS.map((a, i) => (
          <li key={a.id}>
            <button
              onClick={() => onEdit(i)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/70 p-3 text-left transition hover:border-gold-400/50"
            >
              <span className="w-8 text-center text-2xl">{a.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gold-100">{a.title}</span>
                <span className="block truncate text-xs text-white/50">{a.subtitle}</span>
              </span>
              {votes[a.id] ? (
                <span className="flex items-center gap-2">
                  <Avatar name={votes[a.id]} size={28} />
                  <span className="text-sm font-medium">{votes[a.id]}</span>
                </span>
              ) : (
                <span className="text-xs font-medium text-red-300">Pick needed</span>
              )}
              <Pencil size={14} className="text-white/30" />
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-300">{error}</p>}

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent pb-2 pt-6">
        <button
          onClick={onSubmit}
          disabled={busy || missing.length > 0}
          className="animate-pulse-gold flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 py-4 text-lg font-bold text-ink-950 disabled:animate-none disabled:from-white/10 disabled:via-white/10 disabled:to-white/10 disabled:text-white/40"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
          {missing.length > 0 ? `${missing.length} award${missing.length > 1 ? "s" : ""} still open` : "Lock in Votes"}
        </button>
      </div>
    </section>
  );
}

function SubmittedStep({ voter, votes }: { voter: string; votes: Votes }) {
  const picks = useMemo(() => AWARDS.filter((a) => votes[a.id]), [votes]);
  const [open, setOpen] = useState(false);
  return (
    <section className="animate-fade-up flex flex-1 flex-col items-center text-center">
      <div className="animate-pop mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 to-gold-600 text-ink-950 shadow-[0_0_60px_-10px_rgb(220_177_69/0.8)]">
        <Sparkles size={44} />
      </div>
      <h2 className="mt-6 font-display text-3xl font-bold text-gold-100">Votes Submitted!</h2>
      <p className="mt-2 text-lg text-white/80">See you on the red carpet ✨</p>
      <p className="mt-4 max-w-sm text-sm text-white/50">
        Thanks, {voter}. Your ballot is signed, sealed and executed in counterpart. Winners will be revealed at the ceremony.
      </p>
      {picks.length > 0 && (
        <div className="mt-8 w-full">
          <button onClick={() => setOpen((o) => !o)} className="text-sm text-gold-300 underline underline-offset-4">
            {open ? "Hide my picks" : "Peek at my picks"}
          </button>
          {open && (
            <ul className="animate-fade-up mt-4 space-y-1.5 text-left">
              {picks.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl bg-ink-800/60 px-3 py-2 text-sm">
                  <span>{a.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-white/70">{a.title}</span>
                  <span className="font-medium text-gold-100">{votes[a.id]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
