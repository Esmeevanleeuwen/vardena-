"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/social-types";
import { isManager, type ActionState, type OrgMessage } from "@/lib/organization-types";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const failure = (error: { code?: string } | null, fallback: string): ActionState => ({ error: error?.code === "23505" ? "Deze naam in de link is al bezet. Kies een andere." : fallback });
async function actor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}
function refresh() { revalidatePath("/organisaties", "layout"); revalidatePath("/feed"); }

export async function saveOrganization(orgId: string | null, _state: ActionState, data: FormData): Promise<ActionState> {
  const values = { name: field(data,"name"), summary: field(data,"summary"), mission: field(data,"mission"), positions: field(data,"positions"), approach: field(data,"approach"), manifesto: field(data,"manifesto") };
  const slug = field(data,"slug").toLowerCase();
  if (values.name.length < 2 || values.name.length > 80 || values.summary.length < 10 || values.summary.length > 280 || values.mission.length < 20 || values.mission.length > 3000 || values.positions.length < 20 || values.positions.length > 6000 || values.approach.length < 20 || values.approach.length > 3000 || values.manifesto.length > 15000) return { error: "Vul naam, introductie, missie, standpunten en werkwijze volledig in." };
  if (orgId ? !isUuid(orgId) : (!/^[a-z0-9][a-z0-9-]{2,49}$/.test(slug) || ["nieuw","groep"].includes(slug))) return { error: "Gebruik 3–50 kleine letters, cijfers of streepjes voor de link." };
  const { supabase, user } = await actor();
  if (!user) return { error: "Log opnieuw in om je organisatie op te slaan." };
  const result = orgId
    ? await supabase.from("vardena_organizations").update(values).eq("id", orgId).select("slug").maybeSingle()
    : await supabase.from("vardena_organizations").insert({ ...values, slug, created_by: user.id }).select("slug").single();
  if (result.error || !result.data) return failure(result.error, "Opslaan lukt niet. Je hebt hiervoor beheerdersrechten nodig.");
  refresh();
  redirect(`/organisaties/${result.data.slug}/groep?tab=overzicht&opgeslagen=1`);
}

export async function applyToOrganization(orgId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const name = field(data,"displayName");
  if (!isUuid(orgId) || !name || name.length > 80) return { error: "Vul de naam in die de groep mag zien." };
  const { supabase, user } = await actor();
  if (!user) return { error: "Log eerst in om je aan te melden." };
  const { error } = await supabase.from("vardena_org_members").insert({ org_id: orgId, user_id: user.id, display_name: name });
  if (error) return { error: error.code === "23505" ? "Je hebt je al aangemeld bij deze organisatie." : "Aanmelden lukt nu niet. Probeer het opnieuw." };
  refresh(); return { success: "Je aanmelding is verstuurd. Een beheerder beoordeelt je aanvraag." };
}

export async function manageMembership(orgId: string, memberId: string, operation: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  if (!isUuid(orgId) || !isUuid(memberId) || !["approve","reject","promote","demote","remove","leave"].includes(operation)) return { error: "Ongeldige wijziging." };
  const { supabase, user } = await actor();
  if (!user) return { error: "Log opnieuw in." };
  const { data: target } = await supabase.from("vardena_org_members").select("role,status").eq("org_id",orgId).eq("user_id",memberId).maybeSingle();
  if (!target || target.role === "owner" || (operation === "leave" && user.id !== memberId)) return { error: "Je kunt dit lidmaatschap niet wijzigen." };
  if (["promote","demote"].includes(operation) && target.status !== "active") return { error: "Keur het lid eerst goed." };
  const result = ["remove","leave"].includes(operation)
    ? await supabase.from("vardena_org_members").delete().eq("org_id",orgId).eq("user_id",memberId).select("user_id")
    : await supabase.from("vardena_org_members").update(operation === "approve" ? { status:"active" } : operation === "reject" ? { status:"rejected",role:"member" } : { role: operation === "promote" ? "admin" : "member" }).eq("org_id",orgId).eq("user_id",memberId).select("user_id");
  if (result.error || !result.data?.length) return { error: "Wijzigen lukt niet. Controleer je beheerdersrechten." };
  refresh(); return { success: "Lidmaatschap bijgewerkt." };
}

export async function setOrganizationLike(orgId: string, liked: boolean): Promise<{ error: string } | { likes: number; liked: boolean }> {
  if (!isUuid(orgId) || typeof liked !== "boolean") return { error: "Ongeldige organisatie." };
  const { supabase, user } = await actor();
  if (!user) return { error: "Log in om een like te geven." };
  const result = liked ? await supabase.from("vardena_org_likes").upsert({ org_id:orgId,user_id:user.id }, { onConflict:"org_id,user_id",ignoreDuplicates:true }) : await supabase.from("vardena_org_likes").delete().eq("org_id",orgId).eq("user_id",user.id);
  if (result.error) return { error: "Je like kon niet worden opgeslagen." };
  const stats = await supabase.from("vardena_org_like_stats").select("likes").eq("org_id",orgId).maybeSingle();
  if (stats.error) return { error: "Je like is verwerkt, maar de teller kon niet worden geladen. Vernieuw de pagina." };
  return { likes:stats.data?.likes ?? 0,liked };
}

export async function sendGroupMessage(orgId: string, text: string): Promise<{ error: string } | { message: OrgMessage }> {
  const body = typeof text === "string" ? text.trim() : "";
  if (!isUuid(orgId) || !body || body.length > 3000) return { error:"Gebruik 1–3000 tekens." };
  const { supabase, user } = await actor();
  if (!user) return { error:"Log opnieuw in." };
  const member = await supabase.from("vardena_org_members").select("display_name").eq("org_id",orgId).eq("user_id",user.id).eq("status","active").maybeSingle();
  if (!member.data) return { error:"Alleen toegelaten leden kunnen berichten sturen." };
  const result = await supabase.from("vardena_org_messages").insert({ org_id:orgId,sender_id:user.id,body }).select("id,sender_id,body,created_at").single();
  if (result.error) return { error:"Het bericht is niet verstuurd. Probeer het opnieuw." };
  return { message:{...result.data,name:member.data.display_name} };
}

export async function createAssignment(orgId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const assignee = field(data,"assignee"), title = field(data,"title"), description = field(data,"description"), kind = field(data,"kind"), due = field(data,"dueDate");
  const steps = field(data,"steps").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!isUuid(orgId) || !isUuid(assignee) || title.length < 3 || title.length > 140 || description.length > 2000 || !["task","challenge"].includes(kind) || steps.length < 1 || steps.length > 20 || steps.some(s => s.length > 200)) return { error:"Vul een titel, lid en 1–20 stappen in. Gebruik maximaal 200 tekens per stap." };
  if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(Date.parse(due)))) return { error:"Kies een geldige datum." };
  const { supabase, user } = await actor();
  if (!user) return { error:"Log opnieuw in." };
  const { error } = await supabase.rpc("vardena_create_assignment", { p_org:orgId,p_assignee:assignee,p_title:title,p_description:description,p_kind:kind,p_due:due || null,p_steps:steps });
  if (error) return { error:"Toewijzen lukt niet. Je moet beheerder zijn en het gekozen lid moet actief zijn." };
  refresh(); return { success:"De opdracht staat nu bij het lid, met een eigen checklist." };
}

export async function toggleAssignmentStep(itemId: string, completed: boolean): Promise<ActionState> {
  if (!isUuid(itemId) || typeof completed !== "boolean") return { error:"Ongeldige stap." };
  const { supabase, user } = await actor();
  if (!user) return { error:"Log opnieuw in." };
  const result = await supabase.from("vardena_org_checklist").update({completed}).eq("id",itemId).select("id").maybeSingle();
  if (result.error || !result.data) return { error:"Je kunt alleen je eigen opdracht afvinken als je nog lid bent." };
  refresh(); return { success:"Opgeslagen." };
}

export async function removeAssignment(assignmentId: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  if (!isUuid(assignmentId)) return { error:"Ongeldige opdracht." };
  const { supabase, user } = await actor();
  if (!user) return { error:"Log opnieuw in." };
  const result = await supabase.from("vardena_org_assignments").delete().eq("id",assignmentId).select("id").maybeSingle();
  if (result.error || !result.data) return { error:"Alleen een beheerder kan deze opdracht verwijderen." };
  refresh(); return { success:"Opdracht verwijderd." };
}

export async function createOrganizationPost(orgId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const title=field(data,"title"), body=field(data,"body"), subject_name=field(data,"subjectName"), category=field(data,"category"), source_url=field(data,"sourceUrl");
  let source: URL;
  try { source = new URL(source_url); } catch { return { error:"Voeg een geldige openbare https-bron toe." }; }
  if (!isUuid(orgId) || title.length < 5 || title.length > 140 || body.length < 20 || body.length > 3000 || subject_name.length < 2 || subject_name.length > 120 || !["politiek","media","bedrijfsleven","overig"].includes(category) || source.protocol !== "https:" || source.username || source.password || /\s/.test(source_url) || source.href.length > 2048) return { error:"Controleer de velden en je openbare https-bron." };
  const { supabase, user } = await actor();
  if (!user) return { error:"Log opnieuw in." };
  const { data: membership } = await supabase.from("vardena_org_members").select("role").eq("org_id",orgId).eq("user_id",user.id).eq("status","active").maybeSingle();
  if (!isManager(membership?.role)) return { error:"Alleen beheerders publiceren namens de organisatie." };
  const result = await supabase.from("posts").insert({ author_id:user.id,organization_id:orgId,title,body,subject_name,category,source_url:source.href }).select("id").single();
  if (result.error) return { error:"Publiceren lukt nu niet. Je tekst blijft staan." };
  refresh(); redirect(`/bericht/${result.data.id}`);
}
