import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SocialShell } from "@/components/social-shell";
import { Avatar } from "@/components/social-icon";
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const params = await searchParams, supabase = await createClient();
  const q = String(params.q ?? "").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60);
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  let query = supabase.from("vardena_members").select("id,username,display_name,bio", { count: "exact" }).order("username");
  if (q) query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  const [{ data: auth }, { data: members, error, count }] = await Promise.all([supabase.auth.getClaims(), query.range((page - 1) * 30, page * 30 - 1)]);
  const viewerId = auth?.claims?.sub;
  return <SocialShell active="people" signedIn={Boolean(viewerId)}><header className="timeline-heading"><p className="eyebrow">Vind elkaar</p><h1>Mensen</h1><p>Ontdek publieke Vardena-profielen en begin een gesprek.</p></header><form action="/mensen" className="member-search"><label className="sr-only" htmlFor="member-query">Zoek op naam of gebruikersnaam</label><input id="member-query" name="q" defaultValue={q} placeholder="Zoek op naam of @gebruikersnaam" maxLength={60}/><button className="button small">Zoeken</button></form>
  {error ? <div className="social-empty" role="alert">Profielen kunnen nu niet worden geladen.</div> : members?.length ? members.map(member => <article className="member-row" key={member.id}><Avatar name={member.display_name}/><div><Link href={`/profiel/${member.username}`}><strong>{member.display_name}</strong><span className="muted">@{member.username}</span></Link>{member.bio ? <p>{member.bio}</p> : null}</div>{member.id !== viewerId ? <Link className="button small ghost" href={`/inbox/${member.id}`}>Bericht</Link> : <Link className="small-copy" href="/account/profiel">Bewerken</Link>}</article>) : <div className="social-empty"><h2>{q ? "Geen profielen gevonden." : "Wie ontmoet jij hier?"}</h2><p>{q ? "Probeer een andere naam." : "Stel je profiel in zodat anderen je kunnen vinden."}</p><Link href="/account/profiel">Mijn profiel instellen →</Link></div>}
  <div className="social-pagination">{page > 1 ? <Link href={`/mensen?q=${encodeURIComponent(q)}&pagina=${page - 1}`}>← Vorige</Link> : <span/>}{(count ?? 0) > page * 30 ? <Link href={`/mensen?q=${encodeURIComponent(q)}&pagina=${page + 1}`}>Volgende →</Link> : null}</div></SocialShell>;
}
