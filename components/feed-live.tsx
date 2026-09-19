"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
export function FeedLive({ fingerprint, query, enabled }: { fingerprint: string; query: string; enabled: boolean }) {
  const router = useRouter();
  const [changed, setChanged] = useState(false), [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    const controller = new AbortController();
    async function check() {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const response = await fetch(`/api/feed/status?${query}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        setFailed(false);
        const different = data.fingerprint !== fingerprint;
        setChanged(different);
        // Do not interrupt drafts or move the feed while someone reads further down.
        const writing = document.querySelector(".post-composer[open]") || document.activeElement?.matches("input,textarea,select,button");
        if (different && window.scrollY < 180 && !writing) startTransition(() => router.refresh());
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { busy = false; }
    }
    const timer = window.setInterval(check, 20000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("online", check); };
  }, [enabled, fingerprint, query, router]);
  return <div className="feed-live" aria-live="polite"><span className={failed ? "live-state offline" : "live-state"}>{enabled ? failed ? "Verbinding onderbroken · we proberen opnieuw" : "Live · controle elke 20 sec." : "Oudere berichten · live op pagina 1"}</span><button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Bijwerken…" : changed ? "Nieuwe activiteit bekijken ↑" : failed ? "Opnieuw proberen" : "Verversen"}</button></div>;
}
