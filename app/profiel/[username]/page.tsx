import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enrichPosts, postFields, type RawPost } from "@/lib/posts";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
import { PostCard } from "@/components/post-card";
export default async function MemberPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ pagina?: string }> }) {
  const { username } = await params, search = await searchParams;
  if (!/^[a-z0-9_]{3,30}$/.test(username)) notFound();
  const page = Math.min(10000, Math.max(1, Math.floor(Number(search.pagina) || 1)));
  const supabase = await createClient();
  const [{ data: member, error }, { data: auth }] = await Promise.all([supabase.from("vardena_members").select("id,username,display_name,bio").eq("username", username).maybeSingle(), supabase.auth.getClaims()]);
  if (error) throw new Error("Dit profiel kan nu niet worden geladen.");
  if (!member) notFound();
  const result = await supabase.from("posts").select(postFields, { count: "exact" }).eq("author_id", member.id).eq("status", "published").order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 30, page * 30 - 1);
  const viewerId = auth?.claims?.sub;
  const posts = await enrichPosts(supabase, (result.data ?? []) as unknown as RawPost[], viewerId);
  return <SocialShell active="people" signedIn={Boolean(viewerId)}><header className="profile-heading"><Link className="back-link" href="/mensen">← Mensen</Link><div className="profile-title"><Avatar name={member.display_name} large/><div><h1>{member.display_name}</h1><p>@{member.username}</p></div></div>{member.bio ? <p className="profile-bio">{member.bio}</p> : null}<Link className="button small" href={viewerId === member.id ? "/account/profiel" : `/inbox/${member.id}`}>{viewerId === member.id ? "Profiel bewerken" : "Stuur privébericht"}</Link></header><h2 className="list-label">Berichten</h2>{result.error ? <p className="social-notice error" role="alert">Berichten kunnen nu niet worden geladen.</p> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} viewerId={viewerId}/>) : <div className="social-empty">Nog geen openbare berichten.</div>}<div className="social-pagination">{page > 1 ? <Link href={`?pagina=${page - 1}`}>← Nieuwer</Link> : <span/>}{(result.count ?? 0) > page * 30 ? <Link href={`?pagina=${page + 1}`}>Ouder →</Link> : null}</div></SocialShell>;
}
