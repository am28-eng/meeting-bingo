"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, Download, KeyRound, Loader2, LogOut, Presentation, RotateCcw, ShieldCheck, Vote } from "lucide-react";
import Avatar from "@/components/Avatar";
import { NOMINEES, type ResultsPayload } from "@/lib/data";
import { fetcher } from "@/lib/fetcher";

const PASS_KEY = "retreat-awards:admin";

export default function AdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setPasscode(sessionStorage.getItem(PASS_KEY));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-8">
      {passcode ? (
        <Dashboard
          passcode={passcode}
          onLogout={() => {
            try {
              sessionStorage.removeItem(PASS_KEY);
            } catch {
              /* ignore */
            }
            setPasscode(null);
          }}
        />
      ) : (
        <Login
          onSuccess={(code) => {
            try {
              sessionStorage.setItem(PASS_KEY, code);
            } catch {
              /* ignore */
            }
            setPasscode(code);
          }}
        />
      )}
    </main>
  );
}

function Login({ onSuccess }: { onSuccess: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-16 max-w-sm rounded-3xl gold-border bg-ink-900/80 p-6 text-center"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/admin/export", { method: "HEAD", headers: { "x-admin-passcode": code } });
          if (res.ok) onSuccess(code);
          else setError("Incorrect passcode.");
        } catch {
          setError("Couldn't reach the server.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <KeyRound className="mx-auto mb-3 text-gold-300" />
      <h1 className="font-display text-2xl font-bold text-gold-100">Admin Controls</h1>
      <p className="mb-5 mt-1 text-sm text-white/50">Enter the host passcode to continue.</p>
      <input
        type="password"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Passcode"
        className="w-full rounded-xl border border-white/15 bg-ink-800 px-4 py-3 text-center tracking-widest outline-none focus:border-gold-400"
      />
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <button
        disabled={!code || busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 py-3 font-semibold text-ink-950 disabled:opacity-40"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Unlock
      </button>
    </form>
  );
}

function Dashboard({ passcode, onLogout }: { passcode: string; onLogout: () => void }) {
  const { data, mutate } = useSWR<ResultsPayload>("/api/results", fetcher, { refreshInterval: 2500 });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"reset" | "export" | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const exportCsv = async () => {
    setBusy("export");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/export", { headers: { "x-admin-passcode": passcode } });
      if (res.status === 401) return onLogout();
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "retreat-awards-tally.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ kind: "ok", text: "Tally exported." });
    } catch {
      setNotice({ kind: "err", text: "Export failed." });
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy("reset");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST", headers: { "x-admin-passcode": passcode } });
      if (res.status === 401) return onLogout();
      if (!res.ok) throw new Error();
      await mutate();
      setNotice({ kind: "ok", text: "All votes have been reset. Voters can now vote again." });
    } catch {
      setNotice({ kind: "err", text: "Reset failed." });
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-gold-100">
          <ShieldCheck className="text-gold-300" /> Admin Controls
        </h1>
        <button onClick={onLogout} className="flex items-center gap-1 text-sm text-white/50 hover:text-white">
          <LogOut size={14} /> Lock
        </button>
      </div>

      <section className="mb-4 rounded-2xl border border-white/10 bg-ink-900/70 p-5">
        <p className="text-sm text-white/50">Ballots cast</p>
        <p className="font-display text-4xl font-bold text-gold-100">
          {data ? data.rosterVoted.length : "–"} <span className="text-xl text-white/40">of {NOMINEES.length}</span>
          {!!data?.guestVoters.length && <span className="ml-2 text-base text-white/40">+{data.guestVoters.length} guest</span>}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {NOMINEES.map((n) => {
            const has = data?.rosterVoted.includes(n);
            return (
              <div key={n} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${has ? "bg-emerald-400/10 text-emerald-200" : "bg-white/5 text-white/40"}`}>
                <Avatar name={n} size={22} className={has ? "" : "opacity-40 grayscale"} />
                {n}
              </div>
            );
          })}
        </div>
        {!!data?.guestVoters.length && <p className="mt-3 text-xs text-white/50">Guests: {data.guestVoters.join(", ")}</p>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={exportCsv}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 font-semibold text-gold-100 hover:bg-gold-400/20 disabled:opacity-50"
        >
          {busy === "export" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Export Tally to CSV
        </button>
        <button
          onClick={() => setConfirming(true)}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
        >
          <RotateCcw size={18} /> Reset All Votes
        </button>
        <Link href="/results" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-sm text-white/70 hover:border-gold-400/40">
          <Presentation size={16} /> Open ceremony screen
        </Link>
        <Link href="/" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-sm text-white/70 hover:border-gold-400/40">
          <Vote size={16} /> Open voting page
        </Link>
      </section>

      {notice && (
        <p className={`mt-4 rounded-xl p-3 text-center text-sm ${notice.kind === "ok" ? "bg-emerald-400/10 text-emerald-200" : "bg-red-500/10 text-red-300"}`}>
          {notice.text}
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="animate-pop w-full max-w-sm rounded-3xl border border-red-400/30 bg-ink-900 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 text-red-300" size={36} />
            <h2 className="font-display text-xl font-bold">Reset all votes?</h2>
            <p className="mt-2 text-sm text-white/60">
              This permanently deletes all {data?.ballotsCast ?? 0} ballots. Everyone will be able to vote again. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirming(false)} disabled={busy !== null} className="flex-1 rounded-xl border border-white/15 py-3 text-sm">
                Cancel
              </button>
              <button
                onClick={reset}
                disabled={busy !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy === "reset" && <Loader2 size={14} className="animate-spin" />} Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
