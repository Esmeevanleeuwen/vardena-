import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "@/lib/social-types";
export const postFields = "id,author_id,organization_id,title,body,subject_name,category,source_url,created_at,profiles(display_name,username),vardena_organizations(id,slug,name)";
export type RawPost = { id: string; author_id: string; organization_id: string | null; title: string; body: string; subject_name: string; category: string; source_url: string; created_at: string; profiles: { display_name: string; username: string } | null; vardena_organizations: { id: string; slug: string; name: string } | null };
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

export async function readTimeline(supabase: SupabaseClient, page: number, popular: boolean) {
  if (!popular) return supabase.from("posts").select(postFields,{count:"exact"}).eq("status","published").order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*30,page*30-1);
  const ranking=await supabase.from("vardena_popular_posts").select("id",{count:"exact"}).order("score",{ascending:false}).order("likes",{ascending:false}).order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*30,page*30-1);
  if(ranking.error||!ranking.data?.length)return {data:[],count:ranking.count,error:ranking.error};
  const posts=await supabase.from("posts").select(postFields).eq("status","published").in("id",ranking.data.map(p=>p.id));
  const positions=new Map(ranking.data.map((p,i)=>[p.id,i]));
  return {data:(posts.data??[]).sort((a,b)=>(positions.get(a.id)??0)-(positions.get(b.id)??0)),count:ranking.count,error:posts.error};
}
