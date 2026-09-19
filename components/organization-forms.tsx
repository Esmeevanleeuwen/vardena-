"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { saveOrganization } from "@/app/organization-actions";
import type { ActionState, Organization } from "@/lib/organization-types";

export function ActionForm({ action, children, label, pendingLabel = "Opslaan…", confirm, reset = false, compact = false }: { action: (state: ActionState, data: FormData) => Promise<ActionState>; children?: React.ReactNode; label: string; pendingLabel?: string; confirm?: string; reset?: boolean; compact?: boolean }) {
  const [state, submit, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (reset && state.success) form.current?.reset(); }, [state,reset]);
  return <form ref={form} action={submit} className={compact ? "org-inline-form" : "org-form"} onSubmit={event => { event.preventDefault(); if (pending || (confirm && !window.confirm(confirm))) return; const data=new FormData(event.currentTarget); startTransition(()=>submit(data)); }}>
    <fieldset disabled={pending}>{children}<button className={`button small ${compact ? "ghost" : ""}`} type="submit" disabled={pending}>{pending ? pendingLabel : label}</button></fieldset>
    {state.error ? <p className="inline-error" role="alert">{state.error}</p> : null}
    {state.success ? <p className="inline-success" role="status">{state.success}</p> : null}
  </form>;
}
export function OrganizationForm({ organization }: { organization?: Organization }) {
  return <ActionForm action={saveOrganization.bind(null, organization?.id ?? null)} label={organization ? "Wijzigingen opslaan" : "Organisatie aanmaken"}>
    <label>Naam van de organisatie<input name="name" defaultValue={organization?.name} required minLength={2} maxLength={80} placeholder="Naam van jullie collectief"/></label>
    {!organization ? <label>Naam in de link<input name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9][a-z0-9-]{2,49}" placeholder="bijvoorbeeld-nuncius"/><small>vardena.vercel.app/organisaties/jullie-naam · blijft vast</small></label> : null}
    <label>Korte introductie<textarea name="summary" defaultValue={organization?.summary} required minLength={10} maxLength={280} rows={2} placeholder="Wie zijn jullie?"/></label>
    <label>Missie<textarea name="mission" defaultValue={organization?.mission} required minLength={20} maxLength={3000} rows={3} placeholder="Wat willen jullie bereiken?"/></label>
    <label>Standpunten<textarea name="positions" defaultValue={organization?.positions} required minLength={20} maxLength={6000} rows={5} placeholder="Waar staan jullie voor? Benoem jullie uitgangspunten en overtuigingen."/></label>
    <label>Werkwijze<textarea name="approach" defaultValue={organization?.approach} required minLength={20} maxLength={3000} rows={4} placeholder="Hoe controleren jullie bronnen en behandelen jullie correcties?"/></label>
    <label>Manifest of uitgebreide toelichting <span className="muted">(optioneel)</span><textarea name="manifesto" defaultValue={organization?.manifesto} maxLength={15000} rows={8} placeholder="Jullie verhaal, in jullie eigen woorden."/></label>
    <p className="small-copy muted">Deze informatie is openbaar. Leden, groepsgesprekken en persoonlijke opdrachten blijven binnen de groep. Je beheert de organisatie vanuit je eigen account.</p>
  </ActionForm>;
}
