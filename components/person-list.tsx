"use client";
import { useId, useState } from "react";
import { safeWikipediaUrl, type PersonListEntry } from "@/lib/person-lists";
export function PersonList({ entries, full = false }: { entries: PersonListEntry[]; full?: boolean }) {
  const [expanded, setExpanded] = useState(full);
  const id = useId();
  return <section className="person-list" aria-label="Personen in deze lijst"><header><strong>{entries.length} {entries.length === 1 ? "persoon" : "personen"}</strong><span>Dossiers & onderbouwing</span></header><ol id={id}>
    {entries.slice(0, expanded ? entries.length : 3).map((entry, index) => <li key={entry.wikidataId} className="person-list-row"><span className="list-person-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div className="list-person-content"><div className="list-person-name">{safeWikipediaUrl(entry.wikipediaUrl) ? <a href={entry.wikipediaUrl} target="_blank" rel="noopener noreferrer" aria-label={`${entry.name} op Wikipedia`}><span aria-hidden="true">@</span>{entry.name} <small>Wikipedia ↗</small></a> : <strong>{entry.name}</strong>}<span className="list-dossier">{entry.dossier}</span></div><p className="list-person-context">{entry.context}</p><div className="list-evidence"><strong>Sterkte bewijs</strong><p>{entry.evidence}</p></div>{entry.sourceUrl ? <a className="list-source" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Bron bij dit dossier ↗</a> : null}</div></li>)}
  </ol>{entries.length > 3 ? <button className="list-expand" type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Toon minder ↑" : `Bekijk alle ${entries.length} personen (+${entries.length - 3}) ↓`}</button> : null}<p className="person-list-note">Dossierinformatie en bewijsinschatting door de auteur. Wikipedia-links gaan over de persoon.</p></section>;
}
