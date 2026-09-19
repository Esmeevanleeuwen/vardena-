import Link from "next/link";
import Image from "next/image";
import type { PublicPost } from "@/lib/posts";
import { Avatar } from "./social-icon";
import { PostActions } from "./post-actions";
export type { PublicPost } from "@/lib/posts";
export function PostCard({ post, viewerId, full = false }: { post: PublicPost; viewerId?: string; full?: boolean }) {
  const organization = post.vardena_organizations;
  const name = organization?.name ?? post.member?.display_name ?? post.profiles?.display_name ?? "Vardena-lid";
  const profileUrl = organization ? `/organisaties/${organization.slug}` : post.member ? `/profiel/${post.member.username}` : undefined;
  const href = `/bericht/${post.id}`;
  return <article className="post-card social-post">
    <div className="social-post-header"><Avatar name={name}/><div className="post-author">{profileUrl ? <Link href={profileUrl}><strong>{name}</strong></Link> : <strong>{name}</strong>}<div className="post-meta">{organization ? <span>Organisatie</span> : post.member ? <span>@{post.member.username}</span> : null}<Link href={href}><time dateTime={post.created_at}>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeZone: "Europe/Amsterdam" }).format(new Date(post.created_at))}</time></Link></div></div><span className="topic-pill">{post.category}</span></div>
    <p className="post-subject">{post.kind === "announcement" ? <span className="content-label announcement">Mededeling</span> : post.kind === "photo" ? <span className="content-label">Foto</span> : null}Over {post.subject_name}</p>
    <h3><Link href={href}>{post.title}</Link></h3>
    <p className={full ? "post-text" : "post-text post-preview"}>{post.body}</p>
    {!full && post.body.length > 350 ? <Link className="read-post" href={href}>Lees verder</Link> : null}
    {post.kind === "photo" ? post.photoUrl ? <figure className="post-photo"><a href={full ? post.photoUrl : href} target={full ? "_blank" : undefined} rel={full ? "noopener noreferrer" : undefined}><Image unoptimized src={post.photoUrl} alt={post.media_alt ?? "Foto bij de bijdrage"} loading="lazy" width={720} height={480}/></a></figure> : <p className="photo-unavailable">De foto kan nu niet worden geladen.</p> : null}
    {post.source_url ? <a className="source-chip" href={post.source_url} target="_blank" rel="noopener noreferrer">Bekijk openbare bron ↗</a> : <p className="post-source-note">{post.kind === "photo" ? "Fotobijdrage" : "Eigen mededeling"} · geen externe bron toegevoegd</p>}
    <PostActions key={`${post.id}:${post.likes}:${post.dislikes}:${post.vote}`} postId={post.id} title={post.title} likes={post.likes} dislikes={post.dislikes} vote={post.vote} signedIn={Boolean(viewerId)} available={post.reactionsAvailable} messageTo={!organization && post.member && post.author_id !== viewerId ? post.author_id : undefined} shareUrl={new URL(href, process.env.NEXT_PUBLIC_SITE_URL ?? "https://vardena.vercel.app").toString()}/>
  </article>;
}
