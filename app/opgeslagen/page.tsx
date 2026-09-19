import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enrichPosts, postFields, type RawPost } from "@/lib/posts";
import { SocialShell } from "@/components/social-shell";
import { SocialIcon } from "@/components/social-icon";
import { PostCard } from "@/components/post-card";
export default async function SavedPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const params = await searchParams, client = await createClient();
  const { data } = await client.auth.getClaims();
  const viewerId = data?.claims?.sub;
  if (!viewerId) redirect("/login?next=/opgeslagen");
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const result = await client.from("vardena_bookmarks").select(`post_id,posts!inner(${postFields})`, { count: "exact" }).eq("user_id", viewerId).eq("posts.status", "published").order("created_at", { ascending: false }).order("post_id", { ascending: false }).range((page - 1) * 30, page * 30 - 1);
  const posts = await enrichPosts(client, (result.data ?? []).map(row => row.posts) as unknown as RawPost[], viewerId);
  return <SocialShell active="saved" signedIn><header className="timeline-heading"><p className="eyebrow">Alleen voor jou</p><h1>Je leeslijst.</h1><p>Bewaar wat je later wilt bekijken. Niemand anders ziet deze lijst.</p></header><div className="saved-note"><SocialIcon name="bookmark"/> Laatst bewaard staat bovenaan · {result.count ?? 0} berichten</div>{result.error ? <p className="social-notice error" role="alert">Je opgeslagen berichten kunnen nu niet worden geladen.</p> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} viewerId={viewerId}/>) : <div className="social-empty"><h2>{page > 1 ? "Geen berichten op deze pagina." : "Een goed verhaal bewaren?"}</h2><p>Klik op het bladwijzer-icoon bij een bericht. Je vindt het hier terug zolang het openbaar is.</p><Link href="/feed" className="button small">Ontdek de tijdlijn</Link></div>}<nav className="social-pagination" aria-label="Opgeslagen pagina’s">{page > 1 ? <Link href={`/opgeslagen?pagina=${page - 1}`}>← Vorige</Link> : <span/>}{(result.count ?? 0) > page * 30 ? <Link href={`/opgeslagen?pagina=${page + 1}`}>Volgende →</Link> : null}</nav></SocialShell>;
}
