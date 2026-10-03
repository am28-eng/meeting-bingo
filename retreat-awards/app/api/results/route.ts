import { NextResponse } from "next/server";
import { getResults } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getResults(), { headers: { "Cache-Control": "no-store" } });
}
