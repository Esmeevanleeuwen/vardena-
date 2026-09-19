"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setReaction } from "@/app/social-actions";
import { SocialIcon } from "./social-icon";

type Props = { postId: string; title: string; likes: number; dislikes: number; vote: number; comments: number; commentsAvailable: boolean; signedIn: boolean; available: boolean; messageTo?: string; shareUrl: string };
export function PostActions(props: Props) {
  const [state, setState] = useState({ likes: props.likes, dislikes: props.dislikes, vote: props.vote });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [showLink, setShowLink] = useState(false);
  function react(value: number) {
    const previous = state;
    const next = state.vote === value ? 0 : value;
    setError("");
    setState({ vote: next, likes: state.likes - Number(state.vote === 1) + Number(next === 1), dislikes: state.dislikes - Number(state.vote === -1) + Number(next === -1) });
    startTransition(async () => {
      try {
        const result = await setReaction(props.postId, next);
        if ("error" in result) { setState(previous); setError(result.error); }
        else setState({ likes: result.likes, dislikes: result.dislikes, vote: result.value });
      } catch { setState(previous); setError("Geen verbinding. Probeer het opnieuw."); }
    });
  }
  async function share() {
    setShareStatus("");
    if (navigator.share) {
      try { await navigator.share({ title: props.title, url: props.shareUrl }); return; }
      catch (err) { if (err instanceof DOMException && err.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(props.shareUrl); setShareStatus("Link gekopieerd."); }
    catch { setShowLink(true); setShareStatus("Kopieer deze link om het bericht te delen."); }
  }
  return <div className="post-interactions">
    <div className="post-toolbar">
      {([1, -1] as const).map(value => props.signedIn ? <button key={value} type="button" className={`reaction-button ${state.vote === value ? "selected" : ""}`} aria-pressed={state.vote === value} aria-label={`${value === 1 ? "Like" : "Dislike"}: ${value === 1 ? state.likes : state.dislikes}`} disabled={pending || !props.available} onClick={() => react(value)}><SocialIcon name={value === 1 ? "like" : "dislike"}/><span>{value === 1 ? "Like" : "Dislike"}</span><b>{props.available ? (value === 1 ? state.likes : state.dislikes) : "–"}</b></button> : <Link key={value} className="reaction-button" href={`/login?next=/bericht/${props.postId}`} aria-label={`Log in om een ${value === 1 ? "like" : "dislike"} te geven`}><SocialIcon name={value === 1 ? "like" : "dislike"}/><span>{value === 1 ? "Like" : "Dislike"}</span><b>{props.available ? (value === 1 ? state.likes : state.dislikes) : "–"}</b></Link>)}
      <Link className="reaction-button" href={`/bericht/${props.postId}#reacties`} aria-label={props.commentsAvailable ? `${props.comments} reacties bekijken` : "Reacties bekijken"}><SocialIcon name="comment"/><span>Reacties</span><b>{props.commentsAvailable ? props.comments : "–"}</b></Link>
      <button type="button" className="reaction-button" aria-label="Bericht delen" onClick={share}><SocialIcon name="share"/><span>Delen</span></button>
      {props.messageTo ? <Link className="reaction-button message-author" href={`/inbox/${props.messageTo}`} aria-label="Stuur de auteur een privébericht"><SocialIcon name="mail"/><span>Privébericht</span></Link> : null}
    </div>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    {!props.available ? <p className="muted small-copy">Likes kunnen nu niet worden geladen.</p> : null}
    <span className="share-status" role="status">{shareStatus}</span>
    {showLink ? <label className="share-link">Link naar dit bericht<input readOnly value={props.shareUrl} onFocus={event => event.target.select()}/></label> : null}
  </div>;
}
