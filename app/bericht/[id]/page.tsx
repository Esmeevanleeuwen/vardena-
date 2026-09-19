import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/social-types";
import { enrichPosts, postFields, type RawPost } from "@/lib/posts";
import { PostCard } from "@/components/post-card";
import { SocialShell } from "@/components/social-shell";
import { Comments } from "@/components/comments";
import { cache, Suspense } from "react";
const readPublicPost = cache(async (id: string) => {
  const client = await createClient();
  return client.from("posts").select(postFields).eq("id", id).eq("status", "published").maybeSingle();
});
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const { data } = await readPublicPost(id);
  if (!data) return { title: "Bericht — Vardena" };
  const title = `${data.title} — Vardena`, summary = data.body.replace(/\s+/g, " ").trim();
  const description = summary.length > 160 ? `${summary.slice(0, 157)}…` : summary;
  const url = new URL(`/bericht/${id}`, process.env.NEXT_PUBLIC_SITE_URL ?? "https://vardena.vercel.app").toString();
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article", publishedTime: data.created_at }, twitter: { card: "summary", title, description } };
}
export default async function PostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reactiesPagina?: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const [{ data: auth }, { data, error }] = await Promise.all([supabase.auth.getClaims(), readPublicPost(id)]);
  if (error) throw new Error("Het bericht kan nu niet worden geladen.");
  if (!data) notFound();
  const viewerId = auth?.claims?.sub;
  const [post] = await enrichPosts(supabase, [data as unknown as RawPost], viewerId);
  const page = Math.min(10000, Math.max(1, Math.floor(Number((await searchParams).reactiesPagina) || 1)));
  return <SocialShell signedIn={Boolean(viewerId)}><header className="timeline-heading"><Link className="back-link" href="/feed">← Terug naar de tijdlijn</Link><h1>Bericht</h1></header><PostCard post={post} viewerId={viewerId} full/><Suspense fallback={<p className="saved-note">Reacties laden…</p>}><Comments postId={id} viewerId={viewerId} page={page}/></Suspense></SocialShell>;
}
