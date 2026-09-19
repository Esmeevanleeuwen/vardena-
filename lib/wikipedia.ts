import { validEntityId, safeWikipediaUrl, type WikipediaPerson } from "./person-lists";
type Entity = { id: string; labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }>; sitelinks?: Record<string, { title: string; url?: string }>; claims?: { P31?: { rank?: string; mainsnak?: { datavalue?: { value?: { id?: string } } } }[] } };
type ApiResponse = { error?: unknown; search?: { id: string }[]; entities?: Record<string, Entity> };
async function wikidata(params: Record<string, string>): Promise<ApiResponse> {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({ format: "json", ...params }).toString();
  const response = await fetch(url, { headers: { "User-Agent": "Vardena/1.0 (https://vardena.nl; public person lookup)", Accept: "application/json" }, signal: AbortSignal.timeout(10000), next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Wikipedia opzoeken lukt nu niet.");
  const data = await response.json() as ApiResponse;
  if (data.error) throw new Error("Wikipedia opzoeken lukt nu niet.");
  return data;
}
export async function resolveWikipediaPeople(ids: string[]): Promise<WikipediaPerson[]> {
  if (!ids.length) return [];
  if (ids.length > 30 || ids.some(id => !validEntityId(id))) throw new Error("Ongeldige personen.");
  const data = await wikidata({ action: "wbgetentities", ids: [...new Set(ids)].sort().join("|"), props: "labels|descriptions|sitelinks|claims", languages: "nl|en", sitefilter: "nlwiki|enwiki" });
  return ids.flatMap(id => {
    const entity = data.entities?.[id];
    if (!entity?.claims?.P31?.some(c => c.rank !== "deprecated" && c.mainsnak?.datavalue?.value?.id === "Q5")) return [];
    const language = entity.sitelinks?.nlwiki ? "nl" : "en", article = entity.sitelinks?.[`${language}wiki`];
    const name = entity.labels?.nl?.value ?? entity.labels?.en?.value;
    if (!name || name.length > 160 || !article?.title) return [];
    const wikipediaUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`;
    if (!safeWikipediaUrl(wikipediaUrl)) return [];
    return [{ wikidataId: id, name, wikipediaUrl, description: (entity.descriptions?.nl?.value ?? entity.descriptions?.en?.value ?? "Persoon op Wikipedia").slice(0, 240) }];
  });
}
export async function searchWikipediaPeople(query: string): Promise<WikipediaPerson[]> {
  const search = query.replace(/^@/, "").trim();
  if (search.length < 2 || search.length > 100) return [];
  const data = await wikidata({ action: "wbsearchentities", search, language: "nl", uselang: "nl", type: "item", limit: "8" });
  return resolveWikipediaPeople((data.search ?? []).map(r => r.id).filter(validEntityId));
}
