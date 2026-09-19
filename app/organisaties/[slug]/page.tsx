import Link from "next/link";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
import { ActionForm } from "@/components/organization-forms";
import { OrganizationLike } from "@/components/organization-like";
import { Manifesto } from "@/components/manifesto";
import { PostCard } from "@/components/post-card";
import { applyToOrganization,manageMembership } from "@/app/organization-actions";
import { organizationContext } from "@/lib/organizations";
import { enrichPosts,postFields,type RawPost } from "@/lib/posts";
import { pageNumber } from "@/lib/organization-types";
export default async function OrganizationPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{pagina?:string}>}){
  const {slug}=await params;const {supabase,user,org,membership}=await organizationContext(slug);
  const page=pageNumber((await searchParams).pagina);
  const [stats,like,postsResult]=await Promise.all([
    supabase.from("vardena_org_like_stats").select("likes").eq("org_id",org.id).maybeSingle(),
    user?supabase.from("vardena_org_likes").select("org_id").eq("org_id",org.id).eq("user_id",user.id).maybeSingle():Promise.resolve({data:null,error:null}),
    supabase.from("posts").select(postFields,{count:"exact"}).eq("organization_id",org.id).eq("status","published").order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*20,page*20-1),
  ]);
  const posts=await enrichPosts(supabase,(postsResult.data??[]) as unknown as RawPost[],user?.id);
  const defaultName=typeof user?.user_metadata.display_name==="string"?user.user_metadata.display_name:"";
  return <SocialShell active="organizations" signedIn={Boolean(user)}><header className="timeline-heading org-public-heading"><Link className="text-link" href="/organisaties">← Organisaties</Link><div className="org-identity"><Avatar name={org.name} large/><div><p className="eyebrow">Organisatie</p><h1>{org.name}</h1></div></div><p className="org-summary">{org.summary}</p><div className="org-actions">{stats.error||like.error?<span>Likes zijn tijdelijk niet beschikbaar.</span>:<OrganizationLike key={`${stats.data?.likes}:${Boolean(like.data)}`} orgId={org.id} slug={slug} count={stats.data?.likes??0} initialLiked={Boolean(like.data)} signedIn={Boolean(user)}/>}{membership?.status==="active"?<Link className="button small" href={`/organisaties/${slug}/groep`}>Open mijn groep →</Link>:<a className="button small" href="#aansluiten">Aansluiten</a>}</div></header>
    <section className="social-panel org-public-details"><h2>Waar we voor staan</h2><h3>Missie</h3><p>{org.mission}</p><h3>Standpunten</h3><p>{org.positions}</p><h3>Werkwijze</h3><p>{org.approach}</p><p className="org-disclosure">Ingevuld door de organisatie. Een profiel of like is geen onafhankelijke bevestiging van een claim. <Link href="/over">Zo werkt transparantie op Vardena →</Link></p>{org.manifesto?<details className="manifesto-details"><summary>Lees het volledige manifest</summary><Manifesto text={org.manifesto}/></details>:null}</section>
    <section className="social-panel org-join-panel" id="aansluiten"><h2>{membership?.status==="active"?"Je bent lid":"Sluit je aan"}</h2>{membership?.status==="active"?<p>De groepschat, leden en jouw opdrachten vind je in <Link href={`/organisaties/${slug}/groep`}>de groep</Link>.</p>:membership?.status==="pending"?<><p>Je aanmelding wordt beoordeeld. Je krijgt toegang zodra een beheerder je toelaat.</p><ActionForm compact action={manageMembership.bind(null,org.id,membership.user_id,"leave")} label="Aanmelding intrekken"/></>:membership?.status==="rejected"?<><p>Je aanmelding is afgewezen. Je kunt de aanvraag verwijderen en later opnieuw aanmelden.</p><ActionForm compact action={manageMembership.bind(null,org.id,membership.user_id,"leave")} label="Aanvraag verwijderen"/></>:user?<ActionForm action={applyToOrganization.bind(null,org.id)} label="Aanmelding versturen" pendingLabel="Versturen…"><label>Naam binnen de groep<input name="displayName" required maxLength={80} defaultValue={defaultName} placeholder="Hoe mogen leden je noemen?"/></label><p className="small-copy muted">Na goedkeuring kun je eerdere groepsberichten lezen, leden bekijken en persoonlijke opdrachten ontvangen. Je lidmaatschap is alleen binnen de groep zichtbaar.</p></ActionForm>:<p><Link href={`/login?next=/organisaties/${slug}`}>Log in om je aan te melden</Link>, of <Link href={`/signup?next=/organisaties/${slug}`}>maak een account</Link>.</p>}</section>
    <div className="social-section-heading"><h2>Berichten van {org.name}</h2></div>{postsResult.error?<p className="social-notice error">Berichten kunnen nu niet worden geladen.</p>:posts.length?posts.map(post=><PostCard key={post.id} post={post} viewerId={user?.id}/>):<div className="social-empty"><h3>Nog geen publicaties.</h3><p>Nieuwe berichten van de organisatie verschijnen hier en op de openbare tijdlijn.</p></div>}
    <nav className="social-pagination" aria-label="Publicaties">{page>1?<Link href={`/organisaties/${slug}?pagina=${page-1}`}>← Vorige</Link>:<span/>}{(postsResult.count??0)>page*20?<Link href={`/organisaties/${slug}?pagina=${page+1}`}>Volgende →</Link>:null}</nav>
  </SocialShell>;
}
