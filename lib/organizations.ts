import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { orgFields, orgMemberFields, type Organization, type OrgMember, type OrgMessage } from "./organization-types";

export async function organizationContext(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,49}$/.test(slug)) notFound();
  const supabase = await createClient();
  const [{ data: { user } }, org] = await Promise.all([
    supabase.auth.getUser(), supabase.from("vardena_organizations").select(orgFields).eq("slug", slug).maybeSingle(),
  ]);
  if (org.error) throw new Error("Organisatie laden lukt niet.");
  if (!org.data) notFound();
  const membership = user ? await supabase.from("vardena_org_members").select(orgMemberFields).eq("org_id", org.data.id).eq("user_id", user.id).maybeSingle() : { data: null, error: null };
  if (membership.error) throw new Error("Lidmaatschap laden lukt niet.");
  return { supabase, user, org: org.data as Organization, membership: membership.data as OrgMember | null };
}
export async function requireGroup(slug: string) {
  const context = await organizationContext(slug);
  if (!context.user) redirect(`/login?next=/organisaties/${slug}/groep`);
  if (context.membership?.status !== "active") redirect(`/organisaties/${slug}`);
  return { ...context, user: context.user, membership: context.membership };
}
export async function readGroupMessages(supabase: SupabaseClient, orgId: string, page = 1) {
  const result = await supabase.from("vardena_org_messages").select("id,sender_id,body,created_at", { count: "exact" }).eq("org_id", orgId).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (result.error) return { messages: [] as OrgMessage[], count: 0, error: result.error };
  const ids = [...new Set((result.data ?? []).map(m => m.sender_id))];
  const names = ids.length ? await supabase.from("vardena_org_members").select("user_id,display_name").eq("org_id", orgId).in("user_id", ids) : { data: [], error: null };
  if (names.error) return { messages: [] as OrgMessage[], count: 0, error: names.error };
  const byId = new Map((names.data ?? []).map(m => [m.user_id, m.display_name]));
  return { messages: (result.data ?? []).reverse().map(m => ({ ...m, name: byId.get(m.sender_id) ?? "Voormalig lid" })) as OrgMessage[], count: result.count ?? 0, error: null };
}

