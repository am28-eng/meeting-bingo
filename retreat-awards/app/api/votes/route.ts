import { NextResponse } from "next/server";
import { VoteError, getBallot, submitBallot } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/votes?voter=Name — has this voter already cast a ballot? */
export async function GET(req: Request) {
  const voter = new URL(req.url).searchParams.get("voter") ?? "";
  const { epoch, ballot } = getBallot(voter);
  return NextResponse.json({ epoch, submitted: !!ballot, ballot });
}

/** POST /api/votes { voter, votes: { [awardId]: nominee } } */
export async function POST(req: Request) {
  let body: { voter?: unknown; votes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const ballot = submitBallot(body.voter, body.votes);
    return NextResponse.json({ ok: true, ballot, epoch: getBallot(ballot.voter).epoch });
  } catch (err) {
    if (err instanceof VoteError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Something went wrong saving your ballot." }, { status: 500 });
  }
}
