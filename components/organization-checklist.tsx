"use client";
import { useState, useTransition } from "react";
import { toggleAssignmentStep } from "@/app/organization-actions";
import type { ChecklistItem } from "@/lib/organization-types";
export function OrganizationChecklist({ items, editable }: { items: ChecklistItem[]; editable: boolean }) {
  const [steps,setSteps]=useState(items), [error,setError]=useState("");
  const [pending,startTransition]=useTransition();
  const done=steps.filter(s=>s.completed).length;
  return <div className="org-checklist"><div className="checklist-progress"><progress aria-label={`${done} van ${steps.length} stappen afgerond`} value={done} max={steps.length || 1}/><span>{done}/{steps.length} afgerond</span></div>
    {[...steps].sort((a,b)=>a.position-b.position).map(step=><label className={step.completed?"checked":""} key={step.id}><input type="checkbox" checked={step.completed} disabled={!editable||pending} onChange={event=>{
      const value=event.target.checked;setError("");setSteps(previous=>previous.map(s=>s.id===step.id?{...s,completed:value}:s));
      startTransition(async()=>{try{const result=await toggleAssignmentStep(step.id,value);if(result.error){setError(result.error);setSteps(previous=>previous.map(s=>s.id===step.id?{...s,completed:!value}:s));}}catch{setError("Opslaan lukt niet. Probeer het opnieuw.");setSteps(previous=>previous.map(s=>s.id===step.id?{...s,completed:!value}:s));}});
    }}/><span>{step.label}</span></label>)}
    {error?<p className="inline-error" role="alert">{error}</p>:null}
  </div>;
}
