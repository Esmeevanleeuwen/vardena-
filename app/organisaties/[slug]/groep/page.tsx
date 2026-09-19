import Link from "next/link";
import { redirect } from "next/navigation";
import { SocialShell } from "@/components/social-shell";
import { OrganizationNav,organizationModules } from "@/components/organization-nav";
import { OrganizationChat } from "@/components/organization-chat";
import { GroupOverview,GroupMembers,GroupAssignments,GroupPublish,GroupSettings } from "@/components/organization-sections";
import { requireGroup,readGroupMessages } from "@/lib/organizations";
import { isManager,pageNumber,roleLabels } from "@/lib/organization-types";
export default async function GroupPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{tab?:string;pagina?:string;zoek?:string;lid?:string;opgeslagen?:string}>}){
  const {slug}=await params,query=await searchParams,context=await requireGroup(slug),{supabase,org,membership,user}=context;
  const tab=organizationModules.find(m=>m.id===query.tab)?.id??"overzicht",page=pageNumber(query.pagina);
  if(organizationModules.find(m=>m.id===tab)?.manager&&!isManager(membership.role))redirect(`/organisaties/${slug}/groep`);
  const pending=isManager(membership.role)?await supabase.from("vardena_org_members").select("user_id",{count:"exact",head:true}).eq("org_id",org.id).eq("status","pending"):{count:0,error:null};
  if(pending.error)throw new Error("Aanmeldingen laden lukt niet.");
  const chat=tab==="chat"?await readGroupMessages(supabase,org.id,page):null;
  if(chat?.error)throw new Error("Groepschat laden lukt niet.");
  return <SocialShell active="organizations" signedIn><header className="timeline-heading org-workspace-heading"><Link className="text-link" href="/organisaties">← Mijn organisaties</Link><p className="eyebrow">Besloten groep · {roleLabels[membership.role]}</p><h1>{org.name}</h1><Link className="text-link" href={`/organisaties/${slug}`}>Bekijk openbaar profiel ↗</Link></header><OrganizationNav slug={slug} active={tab} role={membership.role} pending={pending.count??0}/>{query.opgeslagen==="1"?<p className="social-notice success" role="status">Het organisatieprofiel is opgeslagen.</p>:null}
    {tab==="overzicht"?<GroupOverview {...context} pending={pending.count??0}/>:null}
    {tab==="leden"||tab==="aanmeldingen"?<GroupMembers {...context} page={page} requests={tab==="aanmeldingen"} search={query.zoek}/>:null}
    {tab==="opdrachten"?<GroupAssignments {...context} page={page} memberSearch={query.lid}/>:null}
    {tab==="publiceren"?<GroupPublish org={org}/>:null}
    {tab==="instellingen"?<GroupSettings org={org}/>:null}
    {chat?<><OrganizationChat key={`${org.id}:${page}`} orgId={org.id} slug={slug} viewerId={user.id} initial={chat.messages} page={page}/><nav className="social-pagination" aria-label="Groepschatpagina’s">{page>1?<Link href={`/organisaties/${slug}/groep?tab=chat&pagina=${page-1}`}>← Nieuwer</Link>:<span/>}{chat.count>page*50?<Link href={`/organisaties/${slug}/groep?tab=chat&pagina=${page+1}`}>Oudere berichten →</Link>:null}</nav></>:null}
  </SocialShell>;
}
