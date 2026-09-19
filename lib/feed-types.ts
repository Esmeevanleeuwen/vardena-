export const feedTypes = [
  { value: "all", label: "Alles" },
  { value: "post", label: "Posts" },
  { value: "announcement", label: "Mededelingen" },
  { value: "photo", label: "Foto’s" },
] as const;
export type FeedType = typeof feedTypes[number]["value"];
export type PostKind = Exclude<FeedType, "all">;
export const topics = ["politiek", "media", "bedrijfsleven", "overig"] as const;
export function feedType(value?: string): FeedType { return feedTypes.find(t => t.value === value)?.value ?? "all"; }
export function feedTopic(value?: string) { return topics.find(t => t === value) ?? ""; }
export function feedHref(type: FeedType, popular: boolean, topic = "", page = 1) {
  const query = new URLSearchParams({ type, sort: popular ? "populair" : "nieuw" });
  if (topic) query.set("onderwerp", topic);
  if (page > 1) query.set("pagina", String(page));
  return `/feed?${query}`;
}
export function feedFingerprint(posts: { id: string; updated_at: string; likes: number; dislikes: number }[], count: number | null) {
  return JSON.stringify([count, ...posts.map(p => [p.id, p.updated_at, p.likes, p.dislikes])]);
}
export const PHOTO_BUCKET = "vardena-post-photos";
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
