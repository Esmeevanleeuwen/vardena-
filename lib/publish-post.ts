import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./social-types";
import { isManager } from "./organization-types";
import { MAX_PHOTO_BYTES, PHOTO_BUCKET, topics } from "./feed-types";
import { parsePersonList, type PersonListEntry } from "./person-lists";
import { resolveWikipediaPeople } from "./wikipedia";

// Runs only on the server, always with the signed-in user's client (never a service key).
export async function publishPost(supabase: SupabaseClient, userId: string, data: FormData, organizationId: string | null = null): Promise<{ id?: string; error?: string }> {
  const field = (name: string) => String(data.get(name) ?? "").trim();
  const title = field("title"), body = field("body"), subject_name = field("subjectName"), category = field("category");
  const kind = field("kind") || "post", media_alt = field("photoAlt");
  let source_url: string | null = field("sourceUrl") || null;
  if (!["post", "announcement", "photo", "list"].includes(kind) || title.length < 5 || title.length > 140 || body.length < 20 || body.length > 3000 || subject_name.length < 2 || subject_name.length > 120 || !topics.some(t => t === category)) return { error: "Controleer de velden. Gebruik een titel van 5–140 tekens en een bericht van 20–3000 tekens." };
  if (source_url) {
    try {
      const source = new URL(source_url);
      if (source.protocol !== "https:" || !source.hostname || source.username || source.password || /\s/.test(source_url) || source.href.length > 2048) throw new Error();
      source_url = source.href;
    } catch { return { error: "Gebruik een geldige https-link voor je bron." }; }
  }
  if (kind === "post" && !source_url) return { error: "Voeg een openbare bron toe aan je post." };
  if (organizationId) {
    if (!isUuid(organizationId)) return { error: "Kies een geldige organisatie." };
    const { data: membership, error } = await supabase.from("vardena_org_members").select("role").eq("org_id", organizationId).eq("user_id", userId).eq("status", "active").maybeSingle();
    if (error || !isManager(membership?.role)) return { error: "Alleen beheerders publiceren namens de organisatie." };
  }
  let media_path: string | null = null;
  let people_list: PersonListEntry[] = [];
  if (kind === "list") {
    try {
      people_list = parsePersonList(field("peopleList"));
      const people = await resolveWikipediaPeople(people_list.map(person => person.wikidataId));
      const canonical = new Map(people.map(person => [person.wikidataId, person]));
      people_list = people_list.map(row => {
        const person = canonical.get(row.wikidataId);
        if (!person) throw new Error(`Kies ${row.name} opnieuw uit de Wikipedia-suggesties.`);
        return { ...row, name: person.name, wikipediaUrl: person.wikipediaUrl };
      });
    } catch (error) { return { error: error instanceof Error ? error.message : "Controleer je personenlijst en probeer opnieuw." }; }
  }
  if (kind === "photo") {
    const file = data.get("photo");
    if (!(file instanceof File) || !file.size || file.size > MAX_PHOTO_BYTES) return { error: "Kies een foto van maximaal 3 MB." };
    if (media_alt.length < 5 || media_alt.length > 300) return { error: "Beschrijf wat er op de foto staat (5–300 tekens)." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b);
    const webp = String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
    const extension = file.type === "image/jpeg" && jpeg ? "jpg" : file.type === "image/png" && png ? "png" : file.type === "image/webp" && webp ? "webp" : null;
    if (!extension) return { error: "Dit bestand is geen ondersteunde foto. Kies JPG, PNG of WebP." };
    media_path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from(PHOTO_BUCKET).upload(media_path, bytes, { contentType: file.type, upsert: false, cacheControl: "300" });
    if (upload.error) return { error: "De foto uploaden lukt niet. Je tekst blijft staan; probeer het opnieuw." };
  }
  const result = await supabase.from("posts").insert({ author_id: userId, organization_id: organizationId, title, body, subject_name, category, kind, source_url, media_path, media_alt: media_path ? media_alt : null, people_list }).select("id").single();
  if (result.error) {
    if (media_path) await supabase.storage.from(PHOTO_BUCKET).remove([media_path]);
    console.error("[posts] Publish failed", { code: result.error.code });
    return { error: "Publiceren lukt nu niet. Je tekst blijft staan." };
  }
  return { id: result.data.id };
}
