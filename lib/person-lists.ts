export const MAX_LIST_PEOPLE = 30;
export type WikipediaPerson = { wikidataId: string; name: string; wikipediaUrl: string; description: string };
export type PersonListEntry = { wikidataId: string; name: string; wikipediaUrl: string; dossier: string; context: string; evidence: string; sourceUrl: string };
export type PersonDraft = { key: string; query: string; person: WikipediaPerson | null; dossier: string; context: string; evidence: string; sourceUrl: string };
export const validEntityId = (value: unknown): value is string => typeof value === "string" && /^Q[1-9][0-9]{0,11}$/.test(value);
export function safeWikipediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try { const u = new URL(value); return u.protocol === "https:" && ["nl.wikipedia.org", "en.wikipedia.org"].includes(u.hostname) && !u.username && !u.password && !u.port && !u.search && !u.hash && u.pathname.startsWith("/wiki/") && u.pathname.length > 6 && !/\s/.test(value); } catch { return false; }
}
export function safeSourceUrl(value: string) {
  if (!value) return "";
  const u = new URL(value);
  if (u.protocol !== "https:" || !u.hostname || u.username || u.password || /\s/.test(value) || u.href.length > 2048) throw new Error("Gebruik een geldige https-bron.");
  return u.href;
}
export function parsePersonList(value: string): PersonListEntry[] {
  if (value.length > 100000) throw new Error("Je lijst is te groot.");
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("Voeg personen toe aan je lijst."); }
  if (!Array.isArray(parsed) || !parsed.length || parsed.length > MAX_LIST_PEOPLE) throw new Error(`Voeg 1 tot ${MAX_LIST_PEOPLE} personen toe.`);
  const ids = new Set<string>();
  return parsed.map((item: unknown, index) => {
    if (!item || typeof item !== "object") throw new Error("Ongeldige lijstregel.");
    const r = item as Record<string, unknown>;
    if (!validEntityId(r.wikidataId) || typeof r.name !== "string" || !safeWikipediaUrl(r.wikipediaUrl)) throw new Error(`Kies de persoon op regel ${index + 1} uit de Wikipedia-suggesties.`);
    if (ids.has(r.wikidataId)) throw new Error(`${r.name} staat al in je lijst.`);
    ids.add(r.wikidataId);
    const text = (key: string, min: number, max: number) => {
      if (typeof r[key] !== "string") throw new Error(`Vul regel ${index + 1} volledig in.`);
      const value = r[key].trim();
      if (value.length < min || value.length > max) throw new Error(`Controleer de tekstlengte op regel ${index + 1}.`);
      return value;
    };
    return { wikidataId: r.wikidataId, wikipediaUrl: r.wikipediaUrl, name: text("name", 2, 160), dossier: text("dossier", 2, 160), context: text("context", 2, 1000), evidence: text("evidence", 2, 600), sourceUrl: safeSourceUrl(text("sourceUrl", 0, 2048)) };
  });
}

// Markdown tables and spreadsheet columns. Names separated by " / " get their own row.
export function parsePastedTable(text: string): Omit<PersonDraft, "key" | "person">[] {
  if (text.length > 100000) throw new Error("Plak maximaal 100.000 tekens.");
  const rows: Omit<PersonDraft, "key" | "person">[] = [];
  const clean = (v: string) => v.trim().replace(/\*\*/g, "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/\\\|/g, "|");
  for (const line of text.split(/\r?\n/).filter(l => l.trim())) {
    const cells = line.includes("\t") ? line.split("\t") : line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/);
    const c = cells.map(clean);
    if (/^(persoon(?:\b|dossier)|naam\b|person\b)/i.test(c[0]) || c.every(v => !v || /^:?-{3,}:?$/.test(v))) continue;
    if (c.length < 4) throw new Error("Gebruik vier kolommen: persoon, dossier, toelichting en bewijsinschatting. Een vijfde kolom met bronlinks mag ook.");
    const source = c[4]?.match(/\[[^\]]*\]\((https:\/\/[^)]+)\)/)?.[1] ?? c[4] ?? "";
    for (const name of c[0].split(/\s+\/\s+/)) rows.push({ query: name.replace(/^@/, "").trim(), dossier: c[1], context: c[2], evidence: c[3], sourceUrl: source });
  }
  if (!rows.length || rows.length > MAX_LIST_PEOPLE) throw new Error(`Plak een tabel met 1 tot ${MAX_LIST_PEOPLE} personen.`);
  if (rows.some(r => !r.query || r.query.length > 160 || r.dossier.length > 160 || r.context.length > 1000 || r.evidence.length > 600 || r.sourceUrl.length > 2048)) throw new Error("Een tabelregel is onvolledig of te lang. Kort de tekst in en probeer opnieuw.");
  return rows;
}
