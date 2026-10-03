"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Download, Loader2, LogOut, Presentation, RotateCcw, ShieldCheck, Vote } from "lucide-react";
import Avatar from "@/components/Avatar";
import VoteQR from "@/components/VoteQR";
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
      className="mx-auto mt-16 max-w-sm rounded-3xl border-2 border-plum-900 bg-lavender-100 p-6 text-center shadow-sticker-lg"
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
      <div className="mb-2 text-5xl">🔐</div>
      <h1 className="font-display text-2xl font-black">Host Controls</h1>
      <p className="mb-5 mt-1 text-sm text-plum-500">Enter the host passcode to continue.</p>
      <input
        type="password"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Passcode"
        className="w-full rounded-2xl border-2 border-plum-900 bg-white px-4 py-3 text-center tracking-widest outline-none focus:ring-4 focus:ring-bubblegum-200"
      />
      {error && <p className="mt-3 text-sm font-semibold text-bubblegum-500">{error}</p>}
      <button
        disabled={!code || busy}
        className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-mint-300 py-3 font-black shadow-sticker disabled:opacity-40"
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
        <h1 className="flex items-center gap-2 font-display text-2xl font-black">
          <span className="text-3xl">🎛️</span> Host Controls
        </h1>
        <button onClick={onLogout} className="flex items-center gap-1 text-sm font-semibold text-plum-500 hover:text-plum-900">
          <LogOut size={14} /> Lock
        </button>
      </div>

      <section className="mb-5 rounded-3xl border-2 border-plum-900 bg-white p-5 shadow-sticker">
        <p className="text-sm font-semibold text-plum-500">Ballots cast</p>
        <p className="font-display text-4xl font-black">
          {data ? data.rosterVoted.length : "–"} <span className="text-xl text-plum-500">of {NOMINEES.length}</span>
          {!!data?.guestVoters.length && <span className="ml-2 text-base text-plum-500">+{data.guestVoters.length} guest</span>}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {NOMINEES.map((n) => {
            const has = data?.rosterVoted.includes(n);
            return (
              <div key={n} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-sm font-bold ${has ? "border-plum-900 bg-mint-200" : "border-dashed border-plum-300 text-plum-300"}`}>
                <Avatar name={n} size={22} className={has ? "" : "opacity-40 grayscale"} />
                {n}
              </div>
            );
          })}
        </div>
        {!!data?.guestVoters.length && <p className="mt-3 text-xs text-plum-500">Guests: {data.guestVoters.join(", ")}</p>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={exportCsv}
          disabled={busy !== null}
          className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-sky-200 p-4 font-black shadow-sticker disabled:opacity-50"
        >
          {busy === "export" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Export Tally to CSV
        </button>
        <button
          onClick={() => setConfirming(true)}
          disabled={busy !== null}
          className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-bubblegum-200 p-4 font-black shadow-sticker disabled:opacity-50"
        >
          <RotateCcw size={18} /> Reset All Votes
        </button>
        <Link href="/results" className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-white p-4 text-sm font-bold shadow-sticker-sm">
          <Presentation size={16} /> Open ceremony screen
        </Link>
        <Link href="/" className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-white p-4 text-sm font-bold shadow-sticker-sm">
          <Vote size={16} /> Open voting page
        </Link>
      </section>

      <section className="mt-5 flex flex-col items-center rounded-3xl border-2 border-plum-900 bg-lavender-100 p-5 shadow-sticker">
        <p className="mb-2 text-sm font-black uppercase tracking-wider">📱 Scan to vote</p>
        <VoteQR size={150} />
        <p className="mt-2 max-w-xs text-center text-xs text-plum-500">Phones must be on the same Wi-Fi as this computer, unless you&apos;re using a share link (see README).</p>
      </section>

      {notice && (
        <p className={`mt-4 rounded-2xl border-2 border-plum-900 p-3 text-center text-sm font-semibold ${notice.kind === "ok" ? "bg-mint-100" : "bg-bubblegum-100 text-bubblegum-500"}`}>
          {notice.text}
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-plum-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="animate-pop w-full max-w-sm rounded-3xl border-2 border-plum-900 bg-white p-6 text-center shadow-sticker-lg">
            <div className="mb-2 text-5xl">😱</div>
            <h2 className="font-display text-xl font-black">Reset all votes?</h2>
            <p className="mt-2 text-sm text-plum-500">
              This permanently deletes all {data?.ballotsCast ?? 0} ballots. Everyone will be able to vote again. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirming(false)} disabled={busy !== null} className="press flex-1 rounded-2xl border-2 border-plum-900 bg-white py-3 text-sm font-bold shadow-sticker-sm">
                Cancel
              </button>
              <button
                onClick={reset}
                disabled={busy !== null}
                className="press flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-plum-900 bg-bubblegum-500 py-3 text-sm font-black text-white shadow-sticker-sm disabled:opacity-60"
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
