import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/app/actions";
import { PostCard } from "@/components/post-card";
import { PostFields } from "@/components/post-fields";
import { PostComposer } from "@/components/post-composer";
import { ActionForm } from "@/components/organization-forms";
import { FeedLive } from "@/components/feed-live";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
import { enrichPosts, readTimeline, type RawPost } from "@/lib/posts";
import { feedTypes, feedType, feedTopic, feedHref, feedFingerprint, topics } from "@/lib/feed-types";
type Props = { searchParams: Promise<{ error?: string; message?: string; pagina?: string; sort?: string; type?: string; onderwerp?: string; geplaatst?: string }> };
type Group = { role: string; vardena_organizations: { id: string; slug: string; name: string } | null };
export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams, supabase = await createClient();
  const popular = params.sort !== "nieuw", type = feedType(params.type), topic = feedTopic(params.onderwerp);
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const [{ data: auth }, result] = await Promise.all([supabase.auth.getClaims(), readTimeline(supabase, page, popular, type, topic)]);
  const viewerId = auth?.claims?.sub;
  const [posts, member, memberships] = await Promise.all([
    enrichPosts(supabase, (result.data ?? []) as unknown as RawPost[], viewerId),
    viewerId ? supabase.from("vardena_members").select("id,display_name").eq("id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
    viewerId ? supabase.from("vardena_org_members").select("role,vardena_organizations(id,slug,name)").eq("user_id",viewerId).eq("status","active").order("created_at").limit(20) : Promise.resolve({ data: [] }),
  ]);
  const groups = (memberships.data ?? []) as unknown as Group[];
  const publishers = groups.filter(g => ["owner","admin"].includes(g.role) && g.vardena_organizations);
  const name = member.data?.display_name ?? "Vardena-lid";
  const fingerprint = feedFingerprint(posts, result.count);
  const query = feedHref(type,popular,topic).split("?")[1];
  if (result.error) console.error("[posts] Feed read failed", { code: result.error.code });
  return <SocialShell signedIn={Boolean(viewerId)}>
    <header className="timeline-heading home-heading"><div><p className="eyebrow">Jouw openbare tijdlijn</p><h1>{viewerId ? "Welkom terug." : "Ontdek Vardena."}</h1></div><Link className="home-about" href="/over">Transparant voor iedereen ↗</Link></header>
    {params.error ? <p className="social-notice error" role="alert">{params.error}</p> : null}{params.message ? <p className="social-notice success" role="status">{params.message}</p> : null}
    {viewerId ? <>
      <PostComposer key={params.geplaatst ?? "draft"} initiallyOpen={Boolean(params.error)}><summary><Avatar name={name}/><span>Wat wil je delen, {name}?<small>Een post, mededeling of foto</small></span><span className="composer-plus" aria-hidden="true">+</span></summary>
        <ActionForm action={createPost} label="Openbaar publiceren" pendingLabel="Publiceren…">
          {publishers.length ? <label>Plaatsen als<select name="organizationId"><option value="">{name} · persoonlijk</option>{publishers.map(g => <option key={g.vardena_organizations!.id} value={g.vardena_organizations!.id}>{g.vardena_organizations!.name} · organisatie</option>)}</select></label> : null}
          <PostFields/>
        </ActionForm>
      </PostComposer>
      {groups.length ? <div className="home-groups"><span>Mijn groepen</span>{groups.map(g => g.vardena_organizations ? <Link key={g.vardena_organizations.id} href={`/organisaties/${g.vardena_organizations.slug}/groep`}>{g.vardena_organizations.name} ↗</Link> : null)}</div> : null}
      {!member.data ? <div className="profile-prompt"><Link href="/account/profiel">Kies je publieke naam en maak je profiel compleet →</Link></div> : null}
    </> : <div className="home-welcome"><p>Volg wat er speelt. Bekijk bronnen, deel inzichten en ontmoet organisaties.</p><Link className="button small" href="/signup">Doe mee</Link><Link className="home-login" href="/login">Inloggen</Link></div>}
    <nav className="feed-type-tabs" aria-label="Soort bijdrage">{feedTypes.map(t => <Link key={t.value} href={feedHref(t.value,popular,topic)} className={type === t.value ? "active" : ""} aria-current={type === t.value ? "page" : undefined}>{t.label}</Link>)}</nav>
    <div className="feed-controls"><nav className="feed-sort" aria-label="Tijdlijn sorteren"><Link href={feedHref(type,true,topic)} className={popular ? "active" : ""} aria-current={popular ? "page" : undefined}>Populair</Link><Link href={feedHref(type,false,topic)} className={!popular ? "active" : ""} aria-current={!popular ? "page" : undefined}>Nieuwste</Link></nav><span>{result.error ? "" : `${result.count ?? 0} ${(result.count ?? 0) === 1 ? "bijdrage" : "bijdragen"}`}</span></div>
    <nav className="feed-topics" aria-label="Onderwerp filteren"><Link href={feedHref(type,popular)} className={!topic ? "active" : ""} aria-current={!topic ? "page" : undefined}>Alle onderwerpen</Link>{topics.map(t => <Link key={t} href={feedHref(type,popular,t)} className={topic === t ? "active" : ""} aria-current={topic === t ? "page" : undefined}>{t[0].toUpperCase()+t.slice(1)}</Link>)}</nav>
    <p className="feed-ranking">{popular ? "Likes − dislikes bepalen de volgorde. Populariteit is geen bewijs." : "Nieuwste eerst. Geen persoonlijke selectie of betaalde voorrang."} <Link href="/over">Uitleg</Link></p>
    <FeedLive key={`${query}:${page}:${fingerprint}`} fingerprint={fingerprint} query={query} enabled={page === 1}/>
    <section className="timeline-posts" aria-label="Berichten">{result.error ? <div className="social-empty" role="alert"><h2>Berichten laden lukt nu niet.</h2><p>Probeer de feed hierboven te verversen.</p></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} viewerId={viewerId}/>) : <div className="social-empty"><span className="empty-feed-mark" aria-hidden="true">{type === "photo" ? "▧" : "≡"}</span><h2>{type === "photo" ? "Nog geen foto’s hier." : type === "announcement" ? "Nog geen mededelingen hier." : "Nog geen posts hier."}</h2><p>{topic ? "Voor dit onderwerp zijn nog geen bijdragen geplaatst." : "De eerste bijdrage kan van jou zijn."}</p><Link className="button small ghost" href={viewerId ? "#nieuw" : "/signup"}>{viewerId ? "Deel een bijdrage" : "Maak een account"}</Link>{topic ? <Link className="empty-reset" href={feedHref(type,popular)}>Toon alle onderwerpen</Link> : null}</div>}</section>
    <nav className="social-pagination" aria-label="Berichtpagina’s">{page > 1 ? <Link href={feedHref(type,popular,topic,page-1)}>← Vorige</Link> : <span/>}{(result.count ?? 0) > page*30 ? <Link href={feedHref(type,popular,topic,page+1)}>Volgende →</Link> : null}</nav>
  </SocialShell>;
}
