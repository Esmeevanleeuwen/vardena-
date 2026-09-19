import Link from "next/link";
import { isManager } from "@/lib/organization-types";
// Modules share the same organization context and permissions.
// Future dossiers/research modules can register a tab here without a second shell.
export const organizationModules = [
  { id:"overzicht",label:"Overzicht",manager:false },
  { id:"chat",label:"Groepschat",manager:false },
  { id:"leden",label:"Leden",manager:false },
  { id:"opdrachten",label:"Opdrachten",manager:false },
  { id:"aanmeldingen",label:"Aanmeldingen",manager:true },
  { id:"publiceren",label:"Publiceren",manager:true },
  { id:"instellingen",label:"Profiel beheren",manager:true },
];
export function OrganizationNav({ slug,active,role,pending }: {slug:string;active:string;role:string;pending:number}) {
  return <nav className="org-tabs" aria-label="Organisatieonderdelen">{organizationModules.filter(m=>!m.manager||isManager(role)).map(m=><Link key={m.id} href={`/organisaties/${slug}/groep?tab=${m.id}`} className={active===m.id?"active":""} aria-current={active===m.id?"page":undefined}>{m.label}{m.id==="aanmeldingen"&&pending>0?<span className="unread-badge">{pending}</span>:null}</Link>)}</nav>;
}
