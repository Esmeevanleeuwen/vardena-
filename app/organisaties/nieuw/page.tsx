import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SocialShell } from "@/components/social-shell";
import { OrganizationForm } from "@/components/organization-forms";
export default async function NewOrganizationPage(){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  return <SocialShell active="organizations" signedIn={Boolean(user)}><header className="timeline-heading"><p className="eyebrow">Geef jullie samenwerking een plek</p><h1>Organisatie aanmelden</h1><p>Een openbaar profiel en een eigen groep, beheerd vanuit je persoonlijke account.</p></header><section className="social-panel">{user?<OrganizationForm/>:<><h2>Begin met je eigen account.</h2><p>Daarna vul je jullie missie, standpunten en werkwijze in. Je wordt automatisch eigenaar van de organisatie en kunt beheerders aanwijzen.</p><div className="org-actions"><Link className="button small" href="/signup?type=organisatie">Account maken voor organisatie</Link><Link className="button small ghost" href="/login?next=/organisaties/nieuw">Ik heb al een account</Link></div></>}</section></SocialShell>;
}
