"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markMessagesRead, sendPrivateMessage } from "@/app/social-actions";
import type { ChatMessage } from "@/lib/social-types";
export function MessagePanel({ initial, viewerId, peerId, page }: { initial: ChatMessage[]; viewerId: string; peerId: string; page: number }) {
  const [messages, setMessages] = useState(initial), [body, setBody] = useState("");
  const [error, setError] = useState(""), [connectionError, setConnectionError] = useState("");
  const [sending, setSending] = useState(false);
  const version = useRef(0), busy = useRef(false), nearBottom = useRef(true);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (page !== 1) return;
    let active = true, running = false;
    const controller = new AbortController();
    async function refresh() {
      if (running || busy.current || document.visibilityState !== "visible") return;
      running = true;
      const requestVersion = version.current;
      try {
        const response = await fetch(`/api/messages/${peerId}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("refresh");
        const result = await response.json();
        if (active && requestVersion === version.current) { setMessages(result.messages); setConnectionError(""); }
      } catch { if (active) setConnectionError("Nieuwe berichten ophalen lukt even niet. We proberen het opnieuw."); }
      finally { running = false; }
    }
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [peerId, page]);
  useEffect(() => {
    const ids = messages.filter(m => m.recipient_id === viewerId && !m.read_at).map(m => m.id);
    if (!ids.length || document.visibilityState !== "visible") return;
    let active = true;
    markMessagesRead(peerId, ids).then(result => {
      if (active && !result.error) setMessages(previous => previous.map(m => ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
    }).catch(() => {});
    return () => { active = false; };
  }, [messages, peerId, viewerId]);
  const lastId = messages.at(-1)?.id;
  useEffect(() => { if (nearBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight; }, [lastId]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !body.trim()) return;
    busy.current = true; version.current += 1; setSending(true); setError("");
    try {
      const result = await sendPrivateMessage(peerId, body);
      if (result.error) setError(result.error);
      else if (result.message) { const message = result.message; nearBottom.current = true; setMessages(previous => [...previous.filter(m => m.id !== message.id), message].slice(-50)); setBody(""); }
    } catch { setError("Geen verbinding. Je tekst is bewaard; probeer het opnieuw."); }
    finally { busy.current = false; setSending(false); }
  }
  return <div className="message-panel"><div className="message-stream" role="log" aria-label="Gesprek" aria-live="polite" ref={list} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
    {messages.length ? messages.map(message => <div key={message.id} className={`message-bubble ${message.sender_id === viewerId ? "outgoing" : "incoming"}`}><p>{message.body}</p><div className="message-meta"><time dateTime={message.created_at}>{new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(message.created_at))}</time>{message.sender_id === viewerId ? <span>{message.read_at ? "Gelezen" : "Verstuurd"}</span> : null}</div></div>) : <div className="conversation-empty"><h2>Zeg hallo.</h2><p>Dit gesprek is alleen zichtbaar voor jullie twee.</p></div>}
  </div>{connectionError ? <p className="connection-note" role="status">{connectionError}</p> : null}{page === 1 ? <form className="message-form" onSubmit={submit}><label className="sr-only" htmlFor="message-body">Privébericht</label><textarea id="message-body" value={body} onChange={event => setBody(event.target.value)} disabled={sending} required maxLength={3000} rows={3} placeholder="Schrijf een privébericht…" onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>{error ? <p className="inline-error" role="alert">{error}</p> : null}<div className="composer-foot"><small>{body.length}/3000 · Shift + Enter voor een nieuwe regel</small><button className="button small" disabled={sending || !body.trim()}>{sending ? "Versturen…" : "Versturen"}</button></div></form> : <p className="social-notice"><Link href={`/inbox/${peerId}`}>Ga naar de nieuwste berichten om te antwoorden →</Link></p>}</div>;
}
