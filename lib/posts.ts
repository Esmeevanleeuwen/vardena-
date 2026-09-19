import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "@/lib/social-types";
export const postFields = "id,author_id,title,body,subject_name,category,source_url,created_at,profiles(display_name,username)";
export type RawPost = { id: string; author_id: string; title: string; body: string; subject_name: string; category: string; source_url: string; created_at: string; profiles: { display_name: string; username: string } | null };
export type PublicPost = RawPost & { member?: Member; likes: number; dislikes: number; vote: number; reactionsAvailable: boolean };
export async function enrichPosts(supabase: SupabaseClient, posts: RawPost[], userId?: string): Promise<PublicPost[]> {
  if (!posts.length) return [];
  const ids = posts.map(p => p.id);
  const [stats, members, votes] = await Promise.all([
    supabase.from("vardena_post_stats").select("post_id,likes,dislikes").in("post_id", ids),
    supabase.from("vardena_members").select("id,username,display_name,bio").in("id", [...new Set(posts.map(p => p.author_id))]),
    userId ? supabase.from("vardena_reactions").select("post_id,value").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (stats.error || votes.error) console.error("[social] Reactions read failed", { code: stats.error?.code ?? votes.error?.code });
  const byPost = new Map((stats.data ?? []).map(s => [s.post_id, s]));
  const byMember = new Map((members.data ?? []).map(m => [m.id, m as Member]));
  const byVote = new Map((votes.data ?? []).map(v => [v.post_id, v.value]));
  return posts.map(p => ({ ...p, member: byMember.get(p.author_id), likes: Number(byPost.get(p.id)?.likes ?? 0), dislikes: Number(byPost.get(p.id)?.dislikes ?? 0), vote: Number(byVote.get(p.id) ?? 0), reactionsAvailable: !stats.error && !votes.error }));
}
