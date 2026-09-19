import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid, messageFields, type ChatMessage } from "@/lib/social-types";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
import { MessagePanel } from "@/components/message-panel";
export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string }> }) {
  const { id } = await params, search = await searchParams;
  if (!isUuid(id)) notFound();
  const page = Math.min(10000, Math.max(1, Math.floor(Number(search.pagina) || 1)));
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/inbox/${id}`);
  if (id === user.id) redirect("/inbox");
  const [{ data: peer, error: peerError }, { data: ownMember, error: ownError }] = await Promise.all([
    supabase.from("vardena_members").select("id,username,display_name").eq("id", id).maybeSingle(),
    supabase.from("vardena_members").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (peerError || ownError) throw new Error("Dit gesprek kan nu niet worden geladen.");
  if (!peer) notFound();
  if (!ownMember) return <SocialShell active="inbox" signedIn><div className="social-empty"><h1>Stel je profiel in.</h1><p>Kies een publieke naam om met {peer.display_name} te praten.</p><Link className="button" href="/account/profiel">Profiel instellen</Link></div></SocialShell>;
  const { data, error, count } = await supabase.from("vardena_messages").select(messageFields, { count: "exact" }).or(`and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Dit gesprek kan nu niet worden geladen.");
  return <SocialShell active="inbox" signedIn><header className="chat-heading"><Link className="back-link" href="/inbox" aria-label="Terug naar inbox">←</Link><Avatar name={peer.display_name}/><Link href={`/profiel/${peer.username}`}><h1>{peer.display_name}</h1><span className="muted">@{peer.username}</span></Link><span className="chat-private">Privégesprek</span></header><div className="social-pagination">{(count ?? 0) > page * 50 ? <Link href={`?pagina=${page + 1}`}>← Oudere berichten</Link> : <span/>}{page > 1 ? <Link href={`?pagina=${page - 1}`}>Nieuwere berichten →</Link> : null}</div><MessagePanel key={`${id}:${page}`} initial={((data ?? []) as ChatMessage[]).reverse()} viewerId={user.id} peerId={id} page={page}/></SocialShell>;
}
