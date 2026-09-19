import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/app/actions";
import { PostCard } from "@/components/post-card";
import { SocialShell } from "@/components/social-shell";
import { enrichPosts, readTimeline, type RawPost } from "@/lib/posts";
type Props = { searchParams: Promise<{ error?: string; message?: string; pagina?: string; sort?: string }> };
export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams, supabase = await createClient();
  const popular = params.sort !== "nieuw";
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const [{ data: auth }, result] = await Promise.all([
    supabase.auth.getClaims(),
    readTimeline(supabase, page, popular),
  ]);
  const viewerId = auth?.claims?.sub;
  const [posts, member] = await Promise.all([
    enrichPosts(supabase, (result.data ?? []) as unknown as RawPost[], viewerId),
    viewerId ? supabase.from("vardena_members").select("id").eq("id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (result.error) console.error("[posts] Feed read failed", { code: result.error.code });
  return <SocialShell signedIn={Boolean(viewerId)}><header className="timeline-heading"><p className="eyebrow">Vardena sociaal</p><h1>Tijdlijn</h1><p>Openbare bronnen. Zichtbare standpunten. Ruimte om zelf te oordelen.</p><Link className="text-link" href="/over">Onze belofte: transparantie →</Link></header><nav className="timeline-tabs" aria-label="Tijdlijn sorteren"><Link href="/feed?sort=populair" className={popular ? "active" : ""} aria-current={popular ? "page" : undefined}>Populair</Link><Link href="/feed?sort=nieuw" className={!popular ? "active" : ""} aria-current={!popular ? "page" : undefined}>Nieuwste</Link></nav><p className="ranking-note">{popular ? "Gerangschikt op likes min dislikes. Bij gelijke score tellen likes, daarna de nieuwste datum. Populariteit is geen bewijs." : "Nieuwste berichten eerst, zonder persoonlijke selectie."}</p>
    {params.error ? <p className="social-notice error" role="alert">{params.error}</p> : null}{params.message ? <p className="social-notice success" role="status">{params.message}</p> : null}
    {viewerId ? <><details className="post-composer" id="nieuw" open={Boolean(params.error)}><summary>Wat wil je delen?</summary><form action={createPost}><div className="form-row"><label>Over wie?<input name="subjectName" required minLength={2} maxLength={120} placeholder="Naam van de publieke persoon"/></label><label>Categorie<select name="category" defaultValue="politiek"><option value="politiek">Politiek</option><option value="media">Media</option><option value="bedrijfsleven">Bedrijfsleven</option><option value="overig">Overig</option></select></label></div><label>Titel<input name="title" required minLength={5} maxLength={140} placeholder="Geef je bericht een titel"/></label><label>Je bericht<textarea name="body" required minLength={20} maxLength={3000} rows={3} placeholder="Deel je informatie en geef context…"/></label><label>Openbare bron<input name="sourceUrl" type="url" required maxLength={2048} placeholder="https://…"/></label><div className="composer-foot"><small>Een bron is verplicht.</small><button className="button small">Publiceren</button></div></form></details>{!member.data ? <div className="profile-prompt"><strong>Laat mensen weten wie je bent.</strong><p>Kies je publieke Vardena-profiel om elkaar privéberichten te sturen.</p><Link href="/account/profiel">Profiel instellen →</Link></div> : null}</> : <div className="profile-prompt"><strong>Praat mee op Vardena.</strong><p>Lees vrij mee. Met een account kun je publiceren, likes geven en aansluiten bij een organisatie.</p><Link href="/signup">Account maken →</Link></div>}
    <section className="timeline-posts" aria-label="Berichten">{result.error ? <div className="social-empty" role="alert"><h2>Berichten laden lukt nu niet.</h2><p>Probeer het later opnieuw.</p></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} viewerId={viewerId}/>) : <div className="social-empty"><h2>Nog geen berichten.</h2><p>Deel het eerste bericht met een openbare bron.</p></div>}</section>
    <div className="social-pagination">{page > 1 ? <Link href={`/feed?sort=${popular ? "populair" : "nieuw"}&pagina=${page - 1}`}>← Vorige</Link> : <span/>}{(result.count ?? 0) > page * 30 ? <Link href={`/feed?sort=${popular ? "populair" : "nieuw"}&pagina=${page + 1}`}>Volgende →</Link> : null}</div>
  </SocialShell>;
}
