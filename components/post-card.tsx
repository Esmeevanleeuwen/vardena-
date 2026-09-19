export type PublicPost={id:string;title:string;body:string;subject_name:string;category:string;source_url:string;created_at:string;profiles:{display_name:string;username:string}|null};
export function PostCard({post}:{post:PublicPost}){
 return <article className="post-card"><div className="post-top"><span className="tag">{post.category}</span><time dateTime={post.created_at}>{new Intl.DateTimeFormat("nl-NL",{dateStyle:"medium"}).format(new Date(post.created_at))}</time></div><p className="subject">{post.subject_name}</p><h3>{post.title}</h3><p className="excerpt">{post.body}</p><div className="post-bottom"><span>door {post.profiles?.display_name??"Vardena-lid"}</span><a href={post.source_url} target="_blank" rel="noreferrer">Bekijk bron ↗</a></div></article>;
}
