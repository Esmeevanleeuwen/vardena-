"use client";
import { useEffect, useId, useState } from "react";
import type { WikipediaPerson } from "@/lib/person-lists";
export function PersonPicker({ query, person, onQuery, onSelect }: { query: string; person: WikipediaPerson | null; onQuery: (query: string) => void; onSelect: (person: WikipediaPerson | null) => void }) {
  const id = useId();
  const [results, setResults] = useState<WikipediaPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const search = query.replace(/^@/, "").trim();
    if (!open || person || search.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPending(true); setError("");
      try {
        const response = await fetch(`/api/people/search?q=${encodeURIComponent(search)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Zoeken lukt nu niet.");
        if (!controller.signal.aborted) { setResults(data.people ?? []); setActive(-1); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Zoeken lukt nu niet."); }
      finally { if (!controller.signal.aborted) setPending(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, person, retry, open]);
  function select(value: WikipediaPerson) { onSelect(value); setOpen(false); setResults([]); setActive(-1); }
  return <div className="person-picker" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    {person ? <div className="chosen-person"><span className="person-at" aria-hidden="true">@</span><div><strong>{person.name}</strong><a href={person.wikipediaUrl} target="_blank" rel="noopener noreferrer">Wikipedia ↗</a></div><button type="button" onClick={() => { onSelect(null); setOpen(true); }}>Wijzig persoon</button></div> : <>
      <label htmlFor={id}>Persoon zoeken met @naam</label><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && query.replace(/^@/, "").trim().length >= 2} aria-controls={`${id}-results`} aria-activedescendant={active >= 0 ? `${id}-result-${active}` : undefined} autoComplete="off" placeholder="@Mark Rutte" value={query} maxLength={100} required onFocus={() => setOpen(true)} onChange={e => { onQuery(e.target.value); setResults([]); setActive(-1); setError(""); setPending(e.target.value.replace(/^@/, "").trim().length >= 2); setOpen(true); }} onKeyDown={e => {
        if (e.key === "Escape") { setOpen(false); setActive(-1); }
        if ((e.key === "ArrowDown" || e.key === "ArrowUp") && results.length) { e.preventDefault(); setOpen(true); setActive(i => e.key === "ArrowDown" ? (i + 1) % results.length : (i <= 0 ? results.length - 1 : i - 1)); }
        if (e.key === "Enter") { e.preventDefault(); if (open && results.length) select(results[active >= 0 ? active : 0]); }
      }}/>
      {open && query.replace(/^@/, "").trim().length >= 2 ? <div className="person-suggestions"><ul id={`${id}-results`} role="listbox" aria-label="Personen op Wikipedia" aria-busy={pending}>{!pending && !error ? results.map((p, i) => <li key={p.wikidataId} id={`${id}-result-${i}`} role="option" aria-selected={active === i}><button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => select(p)}><strong>{p.name}</strong><span>{p.description}</span></button></li>) : null}</ul><p role="status">{pending ? "Personen zoeken…" : error || (results.length ? "Kies de juiste persoon. ↑ ↓ en Enter werken ook." : "Geen persoon gevonden. Probeer de volledige naam.")}</p>{error ? <button className="person-retry" type="button" onClick={() => { setPending(true); setRetry(n => n + 1); }}>Opnieuw zoeken</button> : null}</div> : null}
    </>}
  </div>;
}
