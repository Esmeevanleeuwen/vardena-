"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { setOrganizationLike } from "@/app/organization-actions";
import { SocialIcon } from "./social-icon";
export function OrganizationLike({ orgId, slug, count, initialLiked, signedIn }: { orgId: string; slug: string; count: number; initialLiked: boolean; signedIn: boolean }) {
  const [likes,setLikes]=useState(count), [liked,setLiked]=useState(initialLiked), [error,setError]=useState("");
  const [pending,startTransition]=useTransition();
  if (!signedIn) return <Link className="button small ghost" href={`/login?next=/organisaties/${slug}`}><SocialIcon name="like"/> {count} likes</Link>;
  return <div><button className={`button small ${liked ? "" : "ghost"}`} aria-pressed={liked} disabled={pending} onClick={() => startTransition(async () => {
    setError("");
    try { const result=await setOrganizationLike(orgId,!liked); if("error" in result) setError(result.error); else {setLikes(result.likes);setLiked(result.liked);} }
    catch {setError("Geen verbinding. Probeer opnieuw.");}
  })}><SocialIcon name="like"/> {likes} likes</button>{error ? <p role="alert" className="inline-error">{error}</p>:null}</div>;
}
