import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "./social-icon";
import { CommentForm, DeleteCommentButton } from "./comment-form";
type Comment = { id: string; author_id: string; body: string; created_at: string; vardena_members: { username: string; display_name: string } | null };
export async function Comments({ postId, viewerId, page }: { postId: string; viewerId?: string; page: number }) {
  const client = await createClient();
  const [result, profile] = await Promise.all([
    client.from("vardena_comments").select("id,author_id,body,created_at,vardena_members(username,display_name)", { count: "exact" }).eq("post_id", postId).eq("status", "published").order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 30, page * 30 - 1),
    viewerId ? client.from("vardena_members").select("id").eq("id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const comments = (result.data ?? []) as unknown as Comment[];
  return <section className="comments-section" id="reacties" aria-label="Reacties op dit bericht"><header className="comments-heading"><h2>Het gesprek <span>{result.error ? "–" : result.count ?? 0}</span></h2><small>Nieuwste eerst</small></header><p className="comment-guidance">Reageer op de inhoud. Deel geen privégegevens en onderbouw feitelijke claims.</p>{viewerId ? profile.data ? <CommentForm postId={postId}/> : <p className="comment-prompt"><Link href="/account/profiel">Maak je openbare profiel compleet</Link> om onder je eigen naam te reageren.</p> : <p className="comment-prompt"><Link href={`/login?next=/bericht/${postId}`}>Log in</Link> of <Link href="/signup">maak een account</Link> om mee te praten.</p>}
    {result.error ? <p className="inline-error" role="alert">Reacties laden lukt nu niet. Vernieuw de pagina.</p> : comments.length ? <ol className="comment-list">{comments.map(comment => <li key={comment.id}><Avatar name={comment.vardena_members?.display_name ?? "Vardena-lid"}/><div className="comment-content"><div className="comment-meta"><Link href={`/profiel/${comment.vardena_members?.username ?? ""}`}><strong>{comment.vardena_members?.display_name ?? "Vardena-lid"}</strong></Link><time dateTime={comment.created_at}>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(comment.created_at))}</time></div><p>{comment.body}</p>{viewerId === comment.author_id ? <DeleteCommentButton postId={postId} commentId={comment.id}/> : null}</div></li>)}</ol> : <div className="comments-empty"><p>{page > 1 ? "Geen reacties op deze pagina." : "Nog geen reacties. Begin het gesprek."}</p></div>}
    <nav className="social-pagination" aria-label="Reactiepagina’s">{page > 1 ? <Link href={`/bericht/${postId}?reactiesPagina=${page - 1}#reacties`}>← Nieuwere reacties</Link> : <span/>}{(result.count ?? 0) > page * 30 ? <Link href={`/bericht/${postId}?reactiesPagina=${page + 1}#reacties`}>Oudere reacties →</Link> : null}</nav>
  </section>;
}
