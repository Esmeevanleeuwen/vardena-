import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/app/actions";
import { PostCard } from "@/components/post-card";
import { PostFields } from "@/components/post-fields";
import { PostComposer } from "@/components/post-composer";
import { ActionForm } from "@/components/organization-forms";
import { FeedLive } from "@/components/feed-live";
import { SocialShell } from "@/components/social-shell";
import { Avatar, SocialIcon, type IconName } from "@/components/social-icon";
import { DiscoveryContext } from "@/components/discovery-context";
import { enrichPosts, readTimeline, type RawPost } from "@/lib/posts";
import { feedTypes, feedType, feedTopic, feedSearch, feedHref, feedFingerprint, topics, type FeedType } from "@/lib/feed-types";
type Props = { searchParams: Promise<{ error?: string; message?: string; pagina?: string; sort?: string; type?: string; onderwerp?: string; geplaatst?: string; q?: string; schrijven?: string }> };
type Group = { role: string; vardena_organizations: { id: string; slug: string; name: string } | null };
const tabIcons: Record<FeedType, IconName> = { all: "grid", post: "comment", announcement: "megaphone", photo: "photo", list: "list" };
export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams, supabase = await createClient();
  const popular = params.sort !== "nieuw", type = feedType(params.type), topic = feedTopic(params.onderwerp), search = feedSearch(params.q);
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const [{ data: auth }, result] = await Promise.all([supabase.auth.getClaims(), readTimeline(supabase, page, popular, type, topic, search)]);
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
  const query = feedHref(type,popular,topic,1,search).split("?")[1];
  if (result.error) console.error("[posts] Feed read failed", { code: result.error.code });
  return <SocialShell signedIn={Boolean(viewerId)} discovery context={<Suspense fallback={<div className="context-card">Organisaties laden…</div>}><DiscoveryContext signedIn={Boolean(viewerId)}/></Suspense>}>
    <header className="timeline-heading home-heading"><div><p className="eyebrow">Inzicht begint hier</p><h1>{viewerId ? "Jouw tijdlijn." : "Nieuwsgierig? Blijf dat."}</h1><p className="home-subtitle">Verhalen, bronnen en de mensen erachter.</p></div><span className="home-mark" aria-hidden="true"><SocialIcon name="spark"/></span></header>
    <form className="feed-search" action="/feed" role="search" key={`${type}:${popular}:${topic}:${search}`}><SocialIcon name="search"/><label className="sr-only" htmlFor="feed-search">Zoek in berichten</label><input id="feed-search" type="search" name="q" defaultValue={search} maxLength={100} placeholder="Zoek een onderwerp, naam of verhaal…"/><input type="hidden" name="type" value={type}/><input type="hidden" name="sort" value={popular ? "populair" : "nieuw"}/>{topic ? <input type="hidden" name="onderwerp" value={topic}/> : null}<button type="submit">Zoeken</button></form>
    {params.error ? <p className="social-notice error" role="alert">{params.error}</p> : null}{params.message ? <p className="social-notice success" role="status">{params.message}</p> : null}
    {viewerId ? <>
      <PostComposer key={`${params.geplaatst ?? "draft"}:${params.schrijven ?? "post"}`} initiallyOpen={Boolean(params.error) || params.schrijven === "lijst"}><summary><Avatar name={name}/><span>Wat wil je delen, {name}?<small>Een post, update, foto of personenlijst</small></span><span className="composer-plus" aria-hidden="true">+</span></summary>
        <ActionForm action={createPost} label="Openbaar publiceren" pendingLabel="Publiceren…">
          {publishers.length ? <label>Plaatsen als<select name="organizationId"><option value="">{name} · persoonlijk</option>{publishers.map(g => <option key={g.vardena_organizations!.id} value={g.vardena_organizations!.id}>{g.vardena_organizations!.name} · organisatie</option>)}</select></label> : null}
          <PostFields initialKind={params.schrijven === "lijst" ? "list" : "post"}/>
        </ActionForm>
      </PostComposer>
      {groups.length ? <div className="home-groups"><span>Mijn groepen</span>{groups.map(g => g.vardena_organizations ? <Link key={g.vardena_organizations.id} href={`/organisaties/${g.vardena_organizations.slug}/groep`}>{g.vardena_organizations.name} ↗</Link> : null)}</div> : null}
      {!member.data ? <div className="profile-prompt"><Link href="/account/profiel">Kies je publieke naam en maak je profiel compleet →</Link></div> : null}
    </> : <div className="home-welcome"><div><strong>Meer zien. Samen begrijpen.</strong><p>Maak een account om mee te praten en je ontdekkingen te bewaren.</p></div><Link className="button small" href="/signup">Doe mee ↗</Link></div>}
    <div className="feed-filter-card"><nav className="feed-type-tabs" aria-label="Soort bijdrage">{feedTypes.map(t => <Link key={t.value} href={feedHref(t.value,popular,topic,1,search)} className={type === t.value ? "active" : ""} aria-current={type === t.value ? "page" : undefined}><SocialIcon name={tabIcons[t.value]}/>{t.label}</Link>)}</nav>
      <div className="feed-controls"><nav className="feed-sort" aria-label="Tijdlijn sorteren"><Link href={feedHref(type,true,topic,1,search)} className={popular ? "active" : ""} aria-current={popular ? "page" : undefined}>Populair</Link><Link href={feedHref(type,false,topic,1,search)} className={!popular ? "active" : ""} aria-current={!popular ? "page" : undefined}>Nieuwste</Link></nav><span>{result.error ? "" : `${result.count ?? 0} ${(result.count ?? 0) === 1 ? "bijdrage" : "bijdragen"}`}</span></div>
      <nav className="feed-topics" aria-label="Onderwerp filteren"><Link href={feedHref(type,popular,"",1,search)} className={!topic ? "active" : ""} aria-current={!topic ? "page" : undefined}>Alles ontdekken</Link>{topics.map(t => <Link key={t} href={feedHref(type,popular,t,1,search)} className={topic === t ? "active" : ""} aria-current={topic === t ? "page" : undefined}>{t[0].toUpperCase()+t.slice(1)}</Link>)}</nav>
      <p className="feed-ranking">{popular ? "Likes − dislikes bepalen de volgorde. Populariteit is geen bewijs." : "Nieuwste eerst. Geen persoonlijke selectie of betaalde voorrang."} <Link href="/over">Uitleg</Link></p>
    </div>
    {type === "list" ? <div className="list-feed-intro"><div><strong>Personen, dossiers en context.</strong><p>Deel een lijst met een titel, samenvatting en Wikipedia-links.</p></div><Link className="button small ghost" href={viewerId ? "/feed?schrijven=lijst#nieuw" : "/login?next=%2Ffeed%3Fschrijven%3Dlijst%23nieuw"}>+ Lijst maken</Link></div> : null}
    {search ? <div className="search-summary"><p>Resultaten voor <strong>“{search}”</strong></p><Link href={feedHref(type,popular,topic)}>Wis zoekopdracht ×</Link></div> : null}
    <FeedLive key={`${query}:${page}:${fingerprint}`} fingerprint={fingerprint} query={query} enabled={page === 1}/>
    <section className="timeline-posts" aria-label="Berichten">{result.error ? <div className="social-empty" role="alert"><h2>Berichten laden lukt nu niet.</h2><p>Probeer de feed hierboven te verversen.</p></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} viewerId={viewerId}/>) : <div className="social-empty"><span className="empty-feed-mark" aria-hidden="true"><SocialIcon name={search ? "search" : tabIcons[type]}/></span><h2>{search ? "Nog niets gevonden." : type === "photo" ? "Een ander perspectief?" : type === "announcement" ? "Ruimte voor een update." : "Begin een nieuw gesprek."}</h2><p>{search ? "Probeer een andere zoekterm of wis je filters." : topic ? "Voor dit onderwerp zijn nog geen bijdragen geplaatst." : "De eerste bijdrage kan van jou zijn."}</p><Link className="button small ghost" href={search ? "/feed" : viewerId ? "#nieuw" : "/signup"}>{search ? "Bekijk alle berichten" : viewerId ? "Deel een bijdrage" : "Maak een account"}</Link>{topic && !search ? <Link className="empty-reset" href={feedHref(type,popular)}>Toon alle onderwerpen</Link> : null}</div>}</section>
    <nav className="social-pagination" aria-label="Berichtpagina’s">{page > 1 ? <Link href={feedHref(type,popular,topic,page-1,search)}>← Vorige</Link> : <span/>}{(result.count ?? 0) > page*30 ? <Link href={feedHref(type,popular,topic,page+1,search)}>Volgende →</Link> : null}</nav>
  </SocialShell>;
}
