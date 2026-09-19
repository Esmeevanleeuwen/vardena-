"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/social-types";

export async function setBookmark(postId: string, saved: boolean): Promise<{ error?: string }> {
  if (!isUuid(postId) || typeof saved !== "boolean") return { error: "Ongeldig bericht." };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "Log opnieuw in om een bericht te bewaren." };
  const { error } = saved
    ? await client.from("vardena_bookmarks").upsert({ user_id: user.id, post_id: postId }, { onConflict: "user_id,post_id", ignoreDuplicates: true })
    : await client.from("vardena_bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
  if (error) return { error: "Bewaren lukt nu niet. Mogelijk is dit bericht niet meer openbaar." };
  revalidatePath("/opgeslagen");
  return {};
}

export async function addComment(postId: string, commentId: string, body: string): Promise<{ error?: string }> {
  if (!isUuid(postId) || !isUuid(commentId) || typeof body !== "string" || body.trim().length < 2 || body.trim().length > 1200) return { error: "Schrijf een reactie van 2 tot 1200 tekens." };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "Log opnieuw in om te reageren." };
  const { error } = await client.from("vardena_comments").insert({ id: commentId, post_id: postId, author_id: user.id, body: body.trim() });
  if (error) {
    // Retrying a submitted draft must not publish a duplicate.
    if (error.code !== "23505") return { error: "Plaatsen lukt niet. Controleer je openbare profiel en probeer opnieuw." };
    const { data } = await client.from("vardena_comments").select("id").eq("id", commentId).eq("author_id", user.id).eq("post_id", postId).eq("body", body.trim()).maybeSingle();
    if (!data) return { error: "Deze reactie kon niet worden geplaatst. Vernieuw de pagina." };
  }
  revalidatePath(`/bericht/${postId}`);
  revalidatePath("/feed");
  revalidatePath("/opgeslagen");
  return {};
}

export async function deleteComment(postId: string, commentId: string): Promise<{ error?: string }> {
  if (!isUuid(postId) || !isUuid(commentId)) return { error: "Ongeldige reactie." };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "Log opnieuw in om je reactie te verwijderen." };
  const { error } = await client.from("vardena_comments").delete().eq("id", commentId).eq("post_id", postId).eq("author_id", user.id);
  if (error) return { error: "Verwijderen lukt nu niet. Probeer opnieuw." };
  revalidatePath(`/bericht/${postId}`);
  revalidatePath("/feed");
  revalidatePath("/opgeslagen");
  return {};
}
