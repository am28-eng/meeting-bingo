import { NextResponse } from "next/server";
import { exportCsv, isAdmin } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Verifies the passcode (used by the admin login form). */
export async function HEAD(req: Request) {
  return new Response(null, { status: isAdmin(req) ? 204 : 401 });
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(exportCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="retreat-awards-tally-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
