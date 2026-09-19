"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid, messageFields, type FormState, type ChatMessage } from "@/lib/social-types";

export async function setReaction(postId: string, value: number): Promise<{ error: string } | { likes: number; dislikes: number; value: number }> {
  if (!isUuid(postId) || ![0, 1, -1].includes(value)) return { error: "Ongeldige reactie." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Log in om te reageren." };
  const { data: post } = await supabase.from("posts").select("id").eq("id", postId).eq("status", "published").maybeSingle();
  if (!post) return { error: "Dit bericht is niet meer beschikbaar." };
  const { error } = value === 0
    ? await supabase.from("vardena_reactions").delete().eq("post_id", postId).eq("user_id", user.id)
    : await supabase.from("vardena_reactions").upsert({ post_id: postId, user_id: user.id, value }, { onConflict: "post_id,user_id" });
  if (error) return { error: "Je reactie kon niet worden opgeslagen. Probeer het opnieuw." };
  const { data: stats, error: statsError } = await supabase.from("vardena_post_stats").select("likes,dislikes").eq("post_id", postId).maybeSingle();
  if (statsError) return { error: "Je reactie is opgeslagen, maar de telling kon niet worden geladen. Vernieuw de pagina." };
  return { likes: Number(stats?.likes ?? 0), dislikes: Number(stats?.dislikes ?? 0), value };
}

export async function saveSocialProfile(_previous: FormState, data: FormData): Promise<FormState> {
  const username = String(data.get("username") ?? "").trim().toLowerCase();
  const display_name = String(data.get("displayName") ?? "").trim();
  const bio = String(data.get("bio") ?? "").trim();
  if (!/^[a-z0-9_]{3,30}$/.test(username) || !display_name || display_name.length > 80 || bio.length > 280) return { error: "Gebruik een naam en een gebruikersnaam van 3–30 letters, cijfers of underscores." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Log opnieuw in om je profiel op te slaan." };
  const { error } = await supabase.from("vardena_members").upsert({ id: user.id, username, display_name, bio }, { onConflict: "id" });
  if (error) return { error: error.code === "23505" ? "Deze gebruikersnaam is al in gebruik. Kies een andere." : "Je profiel kon niet worden opgeslagen. Probeer het opnieuw." };
  revalidatePath("/", "layout");
  redirect("/profiel/" + username);
}

export async function sendPrivateMessage(peerId: string, body: string): Promise<{ error?: string; message?: ChatMessage }> {
  if (!isUuid(peerId) || typeof body !== "string" || !body.trim() || body.trim().length > 3000) return { error: "Schrijf een bericht van maximaal 3000 tekens." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Log opnieuw in om je bericht te sturen." };
  if (peerId === user.id) return { error: "Kies iemand anders om een bericht te sturen." };
  const { data, error } = await supabase.from("vardena_messages").insert({ sender_id: user.id, recipient_id: peerId, body: body.trim() }).select(messageFields).single();
  if (error) return { error: "Het bericht kon niet worden verstuurd. Controleer of jullie beiden een Vardena-profiel hebben en probeer opnieuw." };
  return { message: data as ChatMessage };
}

export async function markMessagesRead(peerId: string, ids: string[]) {
  if (!isUuid(peerId) || !Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== "string" || !isUuid(id))) return { error: true };
  if (!ids.length) return { error: false };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: true };
  const { error } = await supabase.from("vardena_messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).eq("sender_id", peerId).in("id", ids).is("read_at", null);
  return { error: Boolean(error) };
}
