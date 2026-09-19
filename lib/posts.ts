import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "@/lib/social-types";
import { PHOTO_BUCKET, type FeedType, type PostKind } from "./feed-types";
export const postFields = "id,author_id,organization_id,title,body,subject_name,category,source_url,created_at,updated_at,kind,media_path,media_alt,profiles(display_name,username),vardena_organizations(id,slug,name)";
export type RawPost = { id: string; author_id: string; organization_id: string | null; title: string; body: string; subject_name: string; category: string; source_url: string | null; created_at: string; updated_at: string; kind: PostKind; media_path: string | null; media_alt: string | null; profiles: { display_name: string; username: string } | null; vardena_organizations: { id: string; slug: string; name: string } | null };
export type PublicPost = RawPost & { member?: Member; photoUrl?: string; likes: number; dislikes: number; vote: number; reactionsAvailable: boolean; comments: number; commentsAvailable: boolean; bookmarked: boolean; bookmarksAvailable: boolean };
export async function enrichPosts(supabase: SupabaseClient, posts: RawPost[], userId?: string): Promise<PublicPost[]> {
  if (!posts.length) return [];
  const ids = posts.map(p => p.id);
  const paths = posts.flatMap(p => p.media_path ? [p.media_path] : []);
  const [stats, members, votes, photos, comments, bookmarks] = await Promise.all([
    supabase.from("vardena_post_stats").select("post_id,likes,dislikes").in("post_id", ids),
    supabase.from("vardena_members").select("id,username,display_name,bio").in("id", [...new Set(posts.map(p => p.author_id))]),
    userId ? supabase.from("vardena_reactions").select("post_id,value").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [], error: null }),
    paths.length ? supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600) : Promise.resolve({ data: [], error: null }),
    supabase.from("vardena_comment_stats").select("post_id,comments").in("post_id", ids),
    userId ? supabase.from("vardena_bookmarks").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (stats.error || votes.error) console.error("[social] Reactions read failed", { code: stats.error?.code ?? votes.error?.code });
  const byPost = new Map((stats.data ?? []).map(s => [s.post_id, s]));
  const byMember = new Map((members.data ?? []).map(m => [m.id, m as Member]));
  const byVote = new Map((votes.data ?? []).map(v => [v.post_id, v.value]));
  const byPhoto = new Map((photos.data ?? []).map(p => [p.path, p.signedUrl ?? undefined]));
  const byComment = new Map((comments.data ?? []).map(c => [c.post_id, Number(c.comments)]));
  const saved = new Set((bookmarks.data ?? []).map(b => b.post_id));
  return posts.map(p => ({ ...p, photoUrl: p.media_path ? byPhoto.get(p.media_path) : undefined, member: byMember.get(p.author_id), likes: Number(byPost.get(p.id)?.likes ?? 0), dislikes: Number(byPost.get(p.id)?.dislikes ?? 0), vote: Number(byVote.get(p.id) ?? 0), reactionsAvailable: !stats.error && !votes.error, comments: byComment.get(p.id) ?? 0, commentsAvailable: !comments.error, bookmarked: saved.has(p.id), bookmarksAvailable: !bookmarks.error }));
}

export async function readFeedStatus(supabase: SupabaseClient, page: number, popular: boolean, type: FeedType = "all", topic = "", search = "") {
  let query = supabase.from("vardena_popular_posts").select("id,updated_at,likes,dislikes,comments",{count:"exact"});
  if (type !== "all") query = query.eq("kind",type);
  if (topic) query = query.eq("category",topic);
  if (search) query = query.textSearch("search_document", search, { config: "dutch", type: "websearch" });
  if (popular) query = query.order("score",{ascending:false}).order("likes",{ascending:false});
  return query.order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*30,page*30-1);
}
export async function readTimeline(supabase: SupabaseClient, page: number, popular: boolean, type: FeedType = "all", topic = "", search = "") {
  const ranking=await readFeedStatus(supabase,page,popular,type,topic,search);
  if(ranking.error||!ranking.data?.length)return {data:[],count:ranking.count,error:ranking.error};
  const posts=await supabase.from("posts").select(postFields).eq("status","published").in("id",ranking.data.map(p=>p.id));
  const positions=new Map(ranking.data.map((p,i)=>[p.id,i]));
  return {data:(posts.data??[]).sort((a,b)=>(positions.get(a.id)??0)-(positions.get(b.id)??0)),count:ranking.count,error:posts.error};
}
