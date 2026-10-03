import os from "node:os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function rank(ip: string) {
  if (ip.startsWith("192.168.")) return 0;
  if (ip.startsWith("10.")) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
  return 3;
}

/** Wi-Fi/LAN addresses of the computer running the app, so phones know where to go. */
export async function GET(req: Request) {
  const port = new URL(req.url).port || "3000";
  const lanUrls = Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal)
    // Home/venue Wi-Fi addresses first; VPN and virtual adapters usually use other ranges.
    .sort((a, b) => rank(a.address) - rank(b.address))
    .map((i) => `http://${i.address}:${port}`);
  return NextResponse.json({ lanUrls });
}
