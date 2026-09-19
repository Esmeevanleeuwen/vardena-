import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SocialShell } from "@/components/social-shell";
import { ProfileForm } from "@/components/profile-form";
export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/account/profiel");
  const { data: member, error: memberError } = await supabase.from("vardena_members").select("username,display_name,bio").eq("id", user.id).maybeSingle();
  if (memberError) throw new Error("Je profiel kan nu niet worden geladen.");
  const name = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
  const username = typeof user.user_metadata.username === "string" ? user.user_metadata.username : "";
  return <SocialShell active="profile" signedIn><header className="timeline-heading"><p className="eyebrow">Jouw plek op Vardena</p><h1>Mijn profiel</h1><p>Zo zien anderen je bij berichten en in hun inbox.</p></header><section className="social-panel"><ProfileForm name={member?.display_name ?? name} username={member?.username ?? username} bio={member?.bio ?? ""}/><div className="profile-settings-links">{member ? <Link href={`/profiel/${member.username}`}>Bekijk je publieke profiel →</Link> : null}<Link href="/account/bevestigen">E-mailadres controleren (optioneel) →</Link></div></section></SocialShell>;
}
