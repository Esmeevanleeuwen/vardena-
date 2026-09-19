import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
import { pageNumber,roleLabels,type OrgRole } from "@/lib/organization-types";
export default async function OrganizationsPage({searchParams}:{searchParams:Promise<{zoek?:string;pagina?:string}>}) {
  const params=await searchParams,page=pageNumber(params.pagina),query=(params.zoek??"").trim().slice(0,80);
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getClaims(),viewerId=auth?.claims?.sub;
  let request=supabase.from("vardena_organizations").select("id,slug,name,summary",{count:"exact"});
  const safeQuery=query.replace(/[^\p{L}\p{N} -]/gu,"");
  if(safeQuery)request=request.ilike("name",`%${safeQuery}%`);
  const [orgs,memberships]=await Promise.all([
    request.order("created_at",{ascending:false}).order("id").range((page-1)*20,page*20-1),
    viewerId?supabase.from("vardena_org_members").select("role,status,vardena_organizations(id,slug,name)").eq("user_id",viewerId).order("created_at",{ascending:false}).limit(100):Promise.resolve({data:[],error:null}),
  ]);
  const base=`/organisaties?zoek=${encodeURIComponent(query)}&pagina=`;
  return <SocialShell active="organizations" signedIn={Boolean(viewerId)}><header className="timeline-heading"><p className="eyebrow">Samen onderzoeken</p><h1>Organisaties</h1><p>Ontdek wie ergens voor staat en sluit je aan.</p><Link className="button small" href="/organisaties/nieuw">Organisatie aanmelden</Link></header>
    {memberships.error?<p className="social-notice error">Je groepen kunnen nu niet worden geladen.</p>:memberships.data?.length?<section className="social-panel org-my-groups"><h2>Mijn organisaties</h2><div className="org-group-links">{memberships.data.map((item)=>{const org=item.vardena_organizations as unknown as {id:string;slug:string;name:string}|null;return org?<Link key={org.id} href={`/organisaties/${org.slug}${item.status==="active"?"/groep":""}`}><strong>{org.name}</strong><span>{item.status==="active"?roleLabels[item.role as OrgRole]:item.status==="pending"?"Aanmelding in behandeling":"Aanmelding afgewezen"}</span></Link>:null;})}</div></section>:null}
    <form className="people-search" action="/organisaties"><label className="sr-only" htmlFor="org-search">Zoek een organisatie</label><input id="org-search" name="zoek" defaultValue={query} maxLength={80} placeholder="Zoek een organisatie"/><button className="button small">Zoeken</button></form>
    {orgs.error?<div className="social-empty" role="alert">Organisaties laden lukt niet. Probeer later opnieuw.</div>:orgs.data?.length?<div>{orgs.data.map(org=><article className="org-directory-card" key={org.id}><Avatar name={org.name}/><div><Link href={`/organisaties/${org.slug}`}><h2>{org.name}</h2></Link><p>{org.summary}</p><Link className="text-link" href={`/organisaties/${org.slug}`}>Bekijk standpunten →</Link></div></article>)}</div>:<div className="social-empty"><h2>Geen organisaties gevonden.</h2><p>Probeer een andere naam of meld je eigen organisatie aan.</p></div>}
    <nav className="social-pagination" aria-label="Organisatiepagina’s">{page>1?<Link href={`${base}${page-1}`}>← Vorige</Link>:<span/>}{(orgs.count??0)>page*20?<Link href={`${base}${page+1}`}>Volgende →</Link>:null}</nav>
  </SocialShell>;
}
