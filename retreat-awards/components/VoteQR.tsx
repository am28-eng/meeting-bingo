"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * QR code pointing phones at the voting page. If this screen was opened via a
 * shareable address (Wi-Fi IP or a tunnel link) we use that; if it was opened
 * as "localhost", we ask the server for its Wi-Fi address instead.
 */
export function useVoteUrl() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!LOCAL_HOSTS.has(window.location.hostname)) {
      setUrl(window.location.origin);
      return;
    }
    fetch("/api/share")
      .then((r) => r.json())
      .then((d: { lanUrls: string[] }) => setUrl(d.lanUrls[0] ?? null))
      .catch(() => setUrl(null));
  }, []);
  return url;
}

export default function VoteQR({ size = 160, className = "" }: { size?: number; className?: string }) {
  const url = useVoteUrl();
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: size * 2, margin: 1, color: { dark: "#2f2140", light: "#ffffff" } })
      .then(setImg)
      .catch(() => setImg(null));
  }, [url, size]);

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={`QR code for ${url}`} width={size} height={size} className="rounded-xl border-2 border-plum-900 bg-white p-1" />
      ) : (
        <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-xl border-2 border-dashed border-plum-300 text-xs text-plum-500">
          No shareable address yet
        </div>
      )}
      <p className="mt-2 break-all font-mono text-xs font-bold text-plum-700">{url?.replace(/^https?:\/\//, "") ?? "—"}</p>
    </div>
  );
}
