"use client";
import { useActionState } from "react";
import { saveSocialProfile } from "@/app/social-actions";
import type { FormState } from "@/lib/social-types";
export function ProfileForm({ name, username, bio }: { name: string; username: string; bio: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSocialProfile, {});
  return <form action={action} className="social-form">{state.error ? <p className="inline-error" role="alert">{state.error}</p> : null}<label>Publieke naam<input name="displayName" defaultValue={name} required maxLength={80} autoComplete="nickname"/></label><label>Gebruikersnaam<input name="username" defaultValue={username} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" autoComplete="username" placeholder="jouw_naam"/></label><label>Over jezelf<textarea name="bio" defaultValue={bio} rows={3} maxLength={280} placeholder="Een paar woorden over jou…"/></label><p className="muted small-copy">Je naam, gebruikersnaam en beschrijving zijn openbaar op Vardena. Je e-mailadres blijft privé.</p><button className="button" disabled={pending}>{pending ? "Opslaan…" : "Profiel opslaan"}</button></form>;
}
