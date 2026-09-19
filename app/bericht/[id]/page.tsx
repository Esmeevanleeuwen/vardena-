import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/social-types";
import { enrichPosts, postFields, type RawPost } from "@/lib/posts";
import { PostCard } from "@/components/post-card";
import { SocialShell } from "@/components/social-shell";
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const [{ data: auth }, { data, error }] = await Promise.all([supabase.auth.getClaims(), supabase.from("posts").select(postFields).eq("id", id).eq("status", "published").maybeSingle()]);
  if (error) throw new Error("Het bericht kan nu niet worden geladen.");
  if (!data) notFound();
  const viewerId = auth?.claims?.sub;
  const [post] = await enrichPosts(supabase, [data as unknown as RawPost], viewerId);
  return <SocialShell signedIn={Boolean(viewerId)}><header className="timeline-heading"><Link className="back-link" href="/feed">← Terug naar de tijdlijn</Link><h1>Bericht</h1></header><PostCard post={post} viewerId={viewerId} full/></SocialShell>;
}
