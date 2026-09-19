"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBookmark } from "@/app/discovery-actions";
import { SocialIcon } from "./social-icon";
export function BookmarkButton({ postId, saved, signedIn, available }: { postId: string; saved: boolean; signedIn: boolean; available: boolean }) {
  const [bookmarked, setBookmarked] = useState(saved);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!signedIn) return <Link className="bookmark-button" href={`/login?next=/bericht/${postId}`} aria-label="Log in om dit bericht te bewaren" title="Bewaren"><SocialIcon name="bookmark"/></Link>;
  function toggle() {
    const next = !bookmarked;
    setBookmarked(next); setError("");
    startTransition(async () => {
      try {
        const result = await setBookmark(postId, next);
        if (result.error) { setBookmarked(!next); setError(result.error); }
        else router.refresh();
      } catch { setBookmarked(!next); setError("Geen verbinding. Probeer opnieuw."); }
    });
  }
  return <span className="bookmark-control"><button type="button" className={`bookmark-button ${bookmarked ? "selected" : ""}`} aria-label={bookmarked ? "Bericht uit opgeslagen verwijderen" : "Bericht bewaren"} title={bookmarked ? "Opgeslagen" : "Bewaren"} aria-pressed={bookmarked} disabled={pending || !available} onClick={toggle}><SocialIcon name="bookmark"/></button>{error ? <span className="bookmark-error" role="alert">{error}</span> : null}</span>;
}
