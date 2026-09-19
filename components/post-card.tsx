import Link from "next/link";
import type { PublicPost } from "@/lib/posts";
import { Avatar } from "./social-icon";
import { PostActions } from "./post-actions";
export type { PublicPost } from "@/lib/posts";
export function PostCard({ post, viewerId, full = false }: { post: PublicPost; viewerId?: string; full?: boolean }) {
  const name = post.member?.display_name ?? post.profiles?.display_name ?? "Vardena-lid";
  const profileUrl = post.member ? `/profiel/${post.member.username}` : undefined;
  const href = `/bericht/${post.id}`;
  return <article className="post-card social-post">
    <div className="social-post-header"><Avatar name={name}/><div className="post-author">{profileUrl ? <Link href={profileUrl}><strong>{name}</strong></Link> : <strong>{name}</strong>}<div className="post-meta">{post.member ? <span>@{post.member.username}</span> : null}<Link href={href}><time dateTime={post.created_at}>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeZone: "Europe/Amsterdam" }).format(new Date(post.created_at))}</time></Link></div></div><span className="topic-pill">{post.category}</span></div>
    <p className="post-subject">Over {post.subject_name}</p>
    <h3><Link href={href}>{post.title}</Link></h3>
    <p className={full ? "post-text" : "post-text post-preview"}>{post.body}</p>
    {!full && post.body.length > 350 ? <Link className="read-post" href={href}>Lees verder</Link> : null}
    <a className="source-chip" href={post.source_url} target="_blank" rel="noopener noreferrer">Bekijk openbare bron ↗</a>
    <PostActions key={`${post.id}:${post.likes}:${post.dislikes}:${post.vote}`} postId={post.id} title={post.title} likes={post.likes} dislikes={post.dislikes} vote={post.vote} signedIn={Boolean(viewerId)} available={post.reactionsAvailable} messageTo={post.member && post.author_id !== viewerId ? post.author_id : undefined} shareUrl={new URL(href, process.env.NEXT_PUBLIC_SITE_URL ?? "https://vardena.vercel.app").toString()}/>
  </article>;
}
