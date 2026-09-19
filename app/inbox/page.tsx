import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
import { InboxRefresh } from "@/components/inbox-refresh";
import type { Member } from "@/lib/social-types";
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const params = await searchParams;
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=/inbox");
  const [{ data: ownMember }, conversations] = await Promise.all([
    supabase.from("vardena_members").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("vardena_conversations").select("peer_id,body,created_at,sender_id,unread_count", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * 30, page * 30 - 1),
  ]);
  const ids = (conversations.data ?? []).map(c => c.peer_id);
  const { data: members } = ids.length ? await supabase.from("vardena_members").select("id,display_name,username,bio").in("id", ids) : { data: [] };
  const memberMap = new Map((members as Member[] ?? []).map(m => [m.id, m]));
  return <SocialShell active="inbox" signedIn><InboxRefresh/><header className="timeline-heading"><p className="eyebrow">Privégesprekken</p><div className="heading-actions"><h1>Inbox</h1><Link className="button small" href="/mensen">Nieuw gesprek</Link></div><p>Je gesprekken, op één plek.</p></header>{!ownMember ? <div className="profile-prompt"><strong>Stel eerst je Vardena-profiel in.</strong><p>Met je publieke naam en gebruikersnaam kunnen jullie elkaar vinden.</p><Link href="/account/profiel">Profiel instellen →</Link></div> : null}
  {conversations.error ? <div className="social-empty" role="alert">Je inbox kan nu niet worden geladen. Probeer het opnieuw.</div> : conversations.data?.length ? conversations.data.map(conversation => { const member = memberMap.get(conversation.peer_id); return <Link key={conversation.peer_id} className={`conversation-row ${conversation.unread_count ? "unread" : ""}`} href={`/inbox/${conversation.peer_id}`}><Avatar name={member?.display_name ?? "Vardena-lid"}/><div className="conversation-preview"><strong>{member?.display_name ?? "Vardena-lid"}</strong><p>{conversation.sender_id === user.id ? "Jij: " : ""}{conversation.body}</p></div><div className="conversation-tail"><time dateTime={conversation.created_at}>{new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" }).format(new Date(conversation.created_at))}</time>{conversation.unread_count ? <span className="unread-badge" aria-label={`${conversation.unread_count} ongelezen berichten`}>{conversation.unread_count}</span> : null}</div></Link>; }) : <div className="social-empty"><h2>Je inbox is nog leeg.</h2><p>Zoek iemand via Mensen of stuur de auteur van een bericht een privébericht.</p><Link className="text-link" href="/mensen">Ontdek mensen →</Link></div>}
  <div className="social-pagination">{page > 1 ? <Link href={`?pagina=${page - 1}`}>← Vorige</Link> : <span/>}{(conversations.count ?? 0) > page * 30 ? <Link href={`?pagina=${page + 1}`}>Volgende →</Link> : null}</div></SocialShell>;
}
