"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/app/discovery-actions";
export function CommentForm({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const draftId = useRef<string | null>(null);
  const router = useRouter();
  return <form className="comment-form" onSubmit={event => {
    event.preventDefault(); setError(""); setSuccess("");
    draftId.current ??= crypto.randomUUID();
    const id = draftId.current;
    startTransition(async () => {
      try {
        const result = await addComment(postId, id, body);
        if (result.error) { setError(result.error); return; }
        setBody(""); draftId.current = null; setSuccess("Je reactie is geplaatst.");
        router.replace(`/bericht/${postId}#reacties`, { scroll: false }); router.refresh();
      } catch { setError("Geen verbinding. Je tekst is bewaard; probeer opnieuw."); }
    });
  }}><label htmlFor="comment-body">Jouw reactie<textarea id="comment-body" name="body" placeholder="Voeg iets toe aan het gesprek…" rows={3} minLength={2} maxLength={1200} required disabled={pending} value={body} onChange={e => { setBody(e.target.value); draftId.current = null; }}/></label><div className="comment-form-foot"><small>{body.length}/1200 · Openbaar</small><button type="submit" className="button small" disabled={pending || body.trim().length < 2}>{pending ? "Plaatsen…" : "Plaats reactie"}</button></div>{error ? <p role="alert" className="inline-error">{error}</p> : null}<span role="status" className="share-status">{success}</span></form>;
}
export function DeleteCommentButton({ postId, commentId }: { postId: string; commentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return <div className="comment-delete"><button type="button" disabled={pending} onClick={() => {
    if (!window.confirm("Je eigen reactie definitief verwijderen?")) return;
    setError(""); startTransition(async () => {
      try { const result = await deleteComment(postId, commentId); if (result.error) setError(result.error); else router.refresh(); }
      catch { setError("Verwijderen lukt nu niet."); }
    });
  }}>{pending ? "Verwijderen…" : "Verwijder"}</button>{error ? <span role="alert">{error}</span> : null}</div>;
}
