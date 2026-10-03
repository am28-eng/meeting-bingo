"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Heart,
  Loader2,
  Lock,
  PartyPopper,
  Pencil,
  UserPlus,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { celebrateSmall, tint } from "@/components/theme";
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
      celebrateSmall();
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
        <div className="flex flex-1 items-center justify-center text-bubblegum-500">
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
      <div className="mb-2 inline-flex -rotate-2 items-center gap-1.5 rounded-full border-2 border-plum-900 bg-butter-200 px-3 py-1 text-xs font-bold uppercase tracking-widest text-plum-900 shadow-sticker-sm">
        <PartyPopper size={13} /> Retreat 2026
      </div>
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        <span className="text-rainbow">Awards Night!</span>
      </h1>
      <p className="mt-1 text-sm font-medium text-plum-500">Legal &amp; Contracts Edition 💼✨</p>
    </header>
  );
}

function ErrorNote({ text }: { text: string }) {
  return <p className="mt-4 rounded-2xl border-2 border-bubblegum-400 bg-bubblegum-100 p-3 text-center text-sm font-medium text-bubblegum-500">{text}</p>;
}

function IdentityStep({ onPick, busy, error }: { onPick: (name: string) => void; busy: boolean; error: string | null }) {
  const [guest, setGuest] = useState("");
  const [showGuest, setShowGuest] = useState(false);
  return (
    <section className="animate-fade-up flex flex-1 flex-col">
      <h2 className="mb-1 text-center font-display text-2xl font-extrabold">Who&apos;s voting? 👋</h2>
      <p className="mb-5 text-center text-sm text-plum-500">Tap your name to grab your ballot. One ballot each!</p>
      <div className="grid grid-cols-2 gap-3">
        {NOMINEES.map((name, i) => (
          <button
            key={name}
            disabled={busy}
            onClick={() => onPick(name)}
            className={`press group flex items-center gap-3 rounded-2xl border-2 border-plum-900 p-3 text-left shadow-sticker disabled:opacity-60 ${tint(i).card}`}
          >
            <Avatar name={name} size={40} />
            <span className="flex-1 font-bold">{name}</span>
            <ChevronRight size={18} className="text-plum-500 transition group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!showGuest ? (
          <button
            onClick={() => setShowGuest(true)}
            className="mx-auto flex items-center gap-2 text-sm font-medium text-plum-500 underline-offset-4 hover:text-plum-900 hover:underline"
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
              className="min-w-0 flex-1 rounded-2xl border-2 border-plum-900 bg-white px-4 py-3 outline-none placeholder:text-plum-300 focus:ring-4 focus:ring-lavender-200"
            />
            <button
              disabled={!guest.trim() || busy}
              className="press rounded-2xl border-2 border-plum-900 bg-mint-300 px-5 font-bold shadow-sticker-sm disabled:opacity-40"
            >
              Start
            </button>
          </form>
        )}
      </div>

      {busy && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-plum-500">
          <Loader2 size={14} className="animate-spin" /> Fetching your ballot…
        </p>
      )}
      {error && <ErrorNote text={error} />}
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
  const t = tint(index);

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
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-plum-500">
        <span>
          Voting as <span className="font-bold text-plum-900">{voter}</span>{" "}
          <button onClick={onChangeVoter} className="ml-1 underline underline-offset-2 hover:text-plum-900">
            change
          </button>
        </span>
        <span className="rounded-full border-2 border-plum-900 bg-white px-2 py-0.5 font-bold text-plum-900">
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
            className={`h-2.5 flex-1 rounded-full border-2 border-plum-900 transition ${
              i === index ? "bg-bubblegum-400" : votes[a.id] ? "bg-mint-300" : "bg-white"
            }`}
          />
        ))}
      </div>

      <article key={award.id} className={`animate-fade-up rounded-3xl border-2 border-plum-900 p-5 shadow-sticker-lg ${t.card}`}>
        <div className="mb-3 flex items-start gap-3">
          <span className="animate-wiggle inline-block text-5xl leading-none">{award.emoji}</span>
          <div>
            <p className={`mb-1 inline-block rounded-full border-2 border-plum-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${t.chip}`}>
              Award {index + 1} of {AWARDS.length}
            </p>
            <h2 className="break-words font-display text-2xl font-black leading-tight">{award.title}</h2>
            <p className="text-sm font-semibold text-plum-500">{award.subtitle}</p>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed text-plum-700">{award.description}</p>
      </article>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NOMINEES.map((name) => {
          const isSelf = voterKey(name) === voterKey(voter);
          const selected = picked === name;
          return (
            <button
              key={name}
              disabled={isSelf}
              onClick={() => choose(name)}
              aria-pressed={selected}
              className={`press relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-plum-900 p-3 ${
                selected ? `${t.chip} shadow-none ring-4 ring-bubblegum-300` : "bg-white shadow-sticker-sm hover:bg-plum-100"
              } ${isSelf ? "cursor-not-allowed border-dashed opacity-40 shadow-none" : ""}`}
            >
              {selected && (
                <span className="animate-pop absolute -right-2 -top-2 rounded-full border-2 border-plum-900 bg-bubblegum-400 p-1 text-white">
                  <Heart size={12} strokeWidth={3} fill="currentColor" />
                </span>
              )}
              <Avatar name={name} size={44} />
              <span className="text-sm font-bold">{name}</span>
              {isSelf && <span className="text-[10px] font-medium text-plum-500">That&apos;s you! 🙈</span>}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-auto flex gap-3 bg-gradient-to-t from-cream via-cream/95 to-transparent pb-2 pt-6">
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="press flex items-center justify-center gap-1 rounded-2xl border-2 border-plum-900 bg-white px-4 py-3.5 text-sm font-bold shadow-sticker-sm disabled:opacity-30"
        >
          <ArrowLeft size={16} /> Back
        </button>
        {isLast || allDone ? (
          <button
            onClick={onReview}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-mint-300 py-3.5 font-bold shadow-sticker"
          >
            Review ballot <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setIndex(index + 1)}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-white py-3.5 font-bold shadow-sticker"
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
      <h2 className="text-center font-display text-2xl font-extrabold">Review your ballot 📝</h2>
      <p className="mb-5 text-center text-sm text-plum-500">
        {voter}, tap any award to change your pick. Once locked in, it&apos;s final — no redlines!
      </p>
      <ul className="space-y-2.5">
        {AWARDS.map((a, i) => (
          <li key={a.id}>
            <button
              onClick={() => onEdit(i)}
              className={`press flex w-full items-center gap-3 rounded-2xl border-2 border-plum-900 p-3 text-left shadow-sticker-sm ${tint(i).card}`}
            >
              <span className="w-8 text-center text-2xl">{a.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{a.title}</span>
                <span className="block truncate text-xs text-plum-500">{a.subtitle}</span>
              </span>
              {votes[a.id] ? (
                <span className="flex items-center gap-2">
                  <Avatar name={votes[a.id]} size={28} />
                  <span className="text-sm font-bold">{votes[a.id]}</span>
                </span>
              ) : (
                <span className="rounded-full bg-bubblegum-200 px-2 py-0.5 text-xs font-bold text-bubblegum-500">Pick needed</span>
              )}
              <Pencil size={14} className="text-plum-500" />
            </button>
          </li>
        ))}
      </ul>

      {error && <ErrorNote text={error} />}

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-cream via-cream/95 to-transparent pb-2 pt-6">
        <button
          onClick={onSubmit}
          disabled={busy || missing.length > 0}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-bubblegum-400 py-4 text-lg font-black text-white shadow-sticker disabled:bg-plum-100 disabled:text-plum-500 disabled:shadow-none [&:not(:disabled)]:animate-jelly"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
          {missing.length > 0 ? `${missing.length} award${missing.length > 1 ? "s" : ""} still open` : "Lock in Votes 🎉"}
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
      <div className="animate-float mt-4">
        <div className="animate-pop flex h-28 w-28 items-center justify-center rounded-full border-2 border-plum-900 bg-gradient-to-br from-bubblegum-200 via-lavender-200 to-mint-200 text-6xl shadow-sticker-lg">
          🥳
        </div>
      </div>
      <h2 className="mt-7 font-display text-4xl font-black">
        <span className="text-rainbow">Votes Submitted!</span>
      </h2>
      <p className="mt-2 text-lg font-semibold text-plum-700">See you on the red carpet ✨</p>
      <p className="mt-4 max-w-sm text-sm text-plum-500">
        Thanks, {voter}! Your ballot is signed, sealed and executed in counterpart. Winners will be revealed at the ceremony.
      </p>
      {picks.length > 0 && (
        <div className="mt-8 w-full">
          <button
            onClick={() => setOpen((o) => !o)}
            className="press rounded-full border-2 border-plum-900 bg-white px-4 py-2 text-sm font-bold shadow-sticker-sm"
          >
            {open ? "Hide my picks 🙈" : "Peek at my picks 👀"}
          </button>
          {open && (
            <ul className="animate-fade-up mt-4 space-y-1.5 text-left">
              {picks.map((a, i) => (
                <li key={a.id} className={`flex items-center gap-3 rounded-xl border-2 border-plum-900 px-3 py-2 text-sm ${tint(i).card}`}>
                  <span>{a.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-plum-700">{a.title}</span>
                  <span className="font-bold">{votes[a.id]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
