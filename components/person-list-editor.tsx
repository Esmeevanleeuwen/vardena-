"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_LIST_PEOPLE, parsePastedTable, type PersonDraft, type WikipediaPerson } from "@/lib/person-lists";
import { PersonPicker } from "./person-picker";
const empty = (key: string): PersonDraft => ({ key, query: "", person: null, dossier: "", context: "", evidence: "", sourceUrl: "" });
export function PersonListEditor() {
  const [rows, setRows] = useState<PersonDraft[]>([empty("first")]);
  const [table, setTable] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [linking, setLinking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function update(key: string, patch: Partial<PersonDraft>) { setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row)); }
  function choose(key: string, person: WikipediaPerson | null) {
    if (person && rows.some(row => row.key !== key && row.person?.wikidataId === person.wikidataId)) { setError(`${person.name} staat al in je lijst.`); return; }
    setError(""); update(key, { person, ...(person ? { query: person.name } : {}) });
  }
  function move(index: number, direction: number) {
    setRows(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  async function linkNames() {
    const unresolved = rows.filter(row => !row.person && row.query.trim().length >= 2);
    controller.current?.abort(); const control = new AbortController(); controller.current = control;
    setLinking(true); setError(""); let linked = 0;
    const selected = new Set(rows.flatMap(row => row.person ? [row.person.wikidataId] : []));
    const normalized = (name: string) => name.replace(/^@/, "").trim().normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    try {
      for (let i = 0; i < unresolved.length; i++) {
        const row = unresolved[i]; setProgress(`Namen koppelen: ${i + 1} van ${unresolved.length}…`);
        const response = await fetch(`/api/people/search?q=${encodeURIComponent(row.query.replace(/^@/, "").trim())}`, { signal: control.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Koppelen lukt nu niet.");
        const matches = (result.people as WikipediaPerson[]).filter(person => normalized(person.name) === normalized(row.query));
        if (matches.length === 1 && !selected.has(matches[0].wikidataId)) { update(row.key, { person: matches[0], query: matches[0].name }); selected.add(matches[0].wikidataId); linked++; }
      }
      setProgress(`${linked} namen gekoppeld. Controleer de gekozen personen${linked < unresolved.length ? " en kies de overige namen handmatig" : ""}.`);
    } catch (e) { setProgress(control.signal.aborted ? "Koppelen gestopt. Je lijst blijft staan." : ""); if (!control.signal.aborted) setError(e instanceof Error ? e.message : "Koppelen lukt niet."); }
    finally { setLinking(false); }
  }
  const serialized = rows.map(row => ({ wikidataId: row.person?.wikidataId ?? "", name: row.person?.name ?? "", wikipediaUrl: row.person?.wikipediaUrl ?? "", dossier: row.dossier, context: row.context, evidence: row.evidence, sourceUrl: row.sourceUrl }));
  return <section className="person-list-editor" aria-label="Personenlijst samenstellen"><div className="list-editor-heading"><div><h3>Wie staan er op je lijst?</h3><p>De eerste drie personen komen in de tijdlijn. Lezers kunnen de rest uitklappen.</p></div><span>{rows.length}/{MAX_LIST_PEOPLE}</span></div>
    <details className="list-import"><summary>Een bestaande tabel plakken</summary><p>Plak een tabel uit ChatGPT of een spreadsheet: persoon · dossier · toelichting · bewijsinschatting. Bronlinks mogen in een vijfde kolom.</p><label>Tabel<textarea rows={4} maxLength={100000} value={table} onChange={e => setTable(e.target.value)} placeholder="| Persoon | Dossier | Wat bleef buiten beeld? | Sterkte bewijs |"/></label><button type="button" className="button small ghost" disabled={linking || !table.trim()} onClick={() => {
      try {
        const imported = parsePastedTable(table).map(row => ({ ...row, key: crypto.randomUUID(), person: null }));
        const existing = rows.filter(row => row.query || row.dossier || row.context || row.evidence || row.sourceUrl);
        if (existing.length + imported.length > MAX_LIST_PEOPLE) throw new Error(`Je lijst mag maximaal ${MAX_LIST_PEOPLE} personen bevatten.`);
        setRows([...existing, ...imported]); setTable(""); setError(""); setProgress(`${imported.length} personen overgenomen. Koppel nu de namen aan Wikipedia.`);
      } catch (e) { setError(e instanceof Error ? e.message : "Deze tabel kon niet worden ingelezen."); }
    }}>Tabel overnemen</button></details>
    {rows.some(row => !row.person && row.query.length >= 2) ? <div className="list-link-names"><button type="button" className="button small ghost" disabled={linking} onClick={linkNames}>Namen aan Wikipedia koppelen</button>{linking ? <button type="button" className="list-plain-button" onClick={() => controller.current?.abort()}>Stoppen</button> : null}</div> : null}
    <p className="list-editor-status" role="status">{progress}</p>{error ? <p className="inline-error" role="alert">{error}</p> : null}
    <fieldset className="list-rows-fieldset" disabled={linking}>
      {rows.map((row, i) => <div key={row.key} className="person-editor-row"><div className="person-row-tools"><span>Persoon {i + 1}{i < 3 ? " · in het voorbeeld" : ""}</span><div><button type="button" aria-label={`Persoon ${i + 1} omhoog`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button type="button" aria-label={`Persoon ${i + 1} omlaag`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button><button type="button" aria-label={`Persoon ${i + 1} verwijderen`} disabled={rows.length === 1} onClick={() => setRows(current => current.filter(r => r.key !== row.key))}>Verwijder</button></div></div>
        <PersonPicker query={row.query} person={row.person} onQuery={query => update(row.key, { query })} onSelect={person => choose(row.key, person)}/>
        <label>Dossier<input value={row.dossier} onChange={e => update(row.key, { dossier: e.target.value })} minLength={2} maxLength={160} required placeholder="Bijvoorbeeld: Teevendeal"/></label>
        <label>Wat bleef buiten beeld? / Toelichting<textarea value={row.context} onChange={e => update(row.key, { context: e.target.value })} minLength={2} maxLength={1000} required rows={2}/></label>
        <label>Sterkte bewijs · jouw inschatting<textarea value={row.evidence} onChange={e => update(row.key, { evidence: e.target.value })} minLength={2} maxLength={600} required rows={2} placeholder="Wat staat vast en wat is nog betwist?"/></label>
        <label>Bron voor dit dossier (optioneel)<input value={row.sourceUrl} onChange={e => update(row.key, { sourceUrl: e.target.value })} type="url" maxLength={2048} placeholder="https://…"/></label>
      </div>)}
      <button type="button" className="button small ghost add-list-person" disabled={rows.length >= MAX_LIST_PEOPLE} onClick={() => setRows(current => [...current, empty(crypto.randomUUID())])}>+ Persoon toevoegen</button>
    </fieldset>
    <input type="hidden" name="peopleList" value={JSON.stringify(serialized)}/>
    <p className="composer-guidance">Wikipedia beschrijft de persoon. De dossiertekst en bewijsinschatting komen van jou. Voeg waar mogelijk de bron van je bevinding toe.</p>
  </section>;
}
