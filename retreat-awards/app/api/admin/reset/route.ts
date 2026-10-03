import { NextResponse } from "next/server";
import { isAdmin, resetVotes } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  const epoch = resetVotes();
  return NextResponse.json({ ok: true, epoch });
}
