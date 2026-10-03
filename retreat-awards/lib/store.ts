import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  AWARDS,
  NOMINEES,
  canonicalName,
  voterKey,
  type AwardResult,
  type Ballot,
  type ResultsPayload,
} from "./data";

/**
 * Flat-file JSON storage. Every operation is synchronous, so within the single
 * Node process a read-modify-write can never interleave with another request.
 * Writes go to a temp file and are renamed into place so a crash never leaves
 * a half-written file behind.
 */

type DB = { epoch: string; ballots: Ballot[] };

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "votes.json");

function freshDB(): DB {
  return { epoch: crypto.randomUUID(), ballots: [] };
}

function readDB(): DB {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
    if (parsed && typeof parsed.epoch === "string" && Array.isArray(parsed.ballots)) return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[store] could not read votes file, starting fresh:", err);
    }
  }
  const db = freshDB();
  writeDB(db);
  return db;
}

function writeDB(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export class VoteError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function getBallot(voter: string): { epoch: string; ballot: Ballot | null } {
  const db = readDB();
  const key = voterKey(voter);
  return { epoch: db.epoch, ballot: db.ballots.find((b) => voterKey(b.voter) === key) ?? null };
}

export function submitBallot(voterInput: unknown, votesInput: unknown): Ballot {
  if (typeof voterInput !== "string" || !voterInput.trim()) {
    throw new VoteError("Please tell us who is voting.", 400);
  }
  if (voterInput.trim().length > 40) throw new VoteError("Name is too long.", 400);
  if (!votesInput || typeof votesInput !== "object") throw new VoteError("Missing votes.", 400);

  const voter = canonicalName(voterInput);
  const key = voterKey(voter);
  const raw = votesInput as Record<string, unknown>;
  const votes: Record<string, string> = {};

  for (const award of AWARDS) {
    const pick = raw[award.id];
    if (typeof pick !== "string" || !(NOMINEES as readonly string[]).includes(pick)) {
      throw new VoteError(`Missing or invalid vote for "${award.title}".`, 400);
    }
    if (voterKey(pick) === key) {
      throw new VoteError("Nice try — you can't vote for yourself!", 400);
    }
    votes[award.id] = pick;
  }

  const db = readDB();
  if (db.ballots.some((b) => voterKey(b.voter) === key)) {
    throw new VoteError(`${voter} has already cast a ballot.`, 409);
  }
  const ballot: Ballot = { voter, votes, submittedAt: new Date().toISOString() };
  db.ballots.push(ballot);
  writeDB(db);
  return ballot;
}

export function resetVotes(): string {
  const db = freshDB();
  writeDB(db);
  return db.epoch;
}

export function getResults(): ResultsPayload {
  const db = readDB();
  const rosterKeys = new Set(NOMINEES.map((n) => voterKey(n)));
  const rosterVoted = NOMINEES.filter((n) => db.ballots.some((b) => voterKey(b.voter) === voterKey(n)));
  const guestVoters = db.ballots.filter((b) => !rosterKeys.has(voterKey(b.voter))).map((b) => b.voter);

  const awards: AwardResult[] = AWARDS.map((award) => {
    const counts = new Map<string, number>(NOMINEES.map((n) => [n, 0]));
    for (const b of db.ballots) {
      const pick = b.votes[award.id];
      if (pick && counts.has(pick)) counts.set(pick, counts.get(pick)! + 1);
    }
    // Stable order: by count desc, then roster order.
    const tally = NOMINEES.map((name) => ({ name, count: counts.get(name)! })).sort(
      (a, b) => b.count - a.count,
    );
    const topCount = tally[0]?.count ?? 0;
    const winners = topCount > 0 ? tally.filter((t) => t.count === topCount).map((t) => t.name) : [];
    const totalVotes = tally.reduce((s, t) => s + t.count, 0);
    return { awardId: award.id, totalVotes, tally, winners, topCount };
  });

  const lastVoteAt = db.ballots.reduce<string | null>(
    (latest, b) => (!latest || b.submittedAt > latest ? b.submittedAt : latest),
    null,
  );

  return {
    epoch: db.epoch,
    rosterSize: NOMINEES.length,
    rosterVoted,
    guestVoters,
    ballotsCast: db.ballots.length,
    lastVoteAt,
    awards,
  };
}

export function exportCsv(): string {
  const results = getResults();
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: (string | number)[][] = [
    ["Award", "Subtitle", "Nominee", "Votes", "Winner"],
  ];
  for (const award of AWARDS) {
    const r = results.awards.find((a) => a.awardId === award.id)!;
    for (const t of r.tally) {
      rows.push([award.title, award.subtitle, t.name, t.count, r.winners.includes(t.name) ? "YES" : ""]);
    }
  }
  rows.push([]);
  rows.push(["Ballots cast", results.ballotsCast]);
  rows.push(["Roster voters", `${results.rosterVoted.length} of ${results.rosterSize}`]);
  if (results.guestVoters.length) rows.push(["Guest voters", results.guestVoters.join("; ")]);
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

export const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "awards2026";

export function isAdmin(req: Request): boolean {
  return req.headers.get("x-admin-passcode") === ADMIN_PASSCODE;
}
