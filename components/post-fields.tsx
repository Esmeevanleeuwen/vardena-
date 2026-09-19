"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MAX_PHOTO_BYTES, type PostKind } from "@/lib/feed-types";
export function PostFields() {
  const [kind, setKind] = useState<PostKind>("post");
  const [preview, setPreview] = useState("");
  const previewRef = useRef("");
  function changePhoto(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : "";
    setPreview(previewRef.current);
  }
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  return <>
    <label>Wat wil je plaatsen?<select name="kind" value={kind} onChange={e => { setKind(e.target.value as PostKind); changePhoto(null); }}><option value="post">Post met bron</option><option value="announcement">Mededeling</option><option value="photo">Foto</option></select></label>
    <div className="form-row"><label>Over wie of wat?<input name="subjectName" required minLength={2} maxLength={120} placeholder="Persoon, organisatie of onderwerp"/></label><label>Onderwerp<select name="category" defaultValue="overig"><option value="politiek">Politiek</option><option value="media">Media</option><option value="bedrijfsleven">Bedrijfsleven</option><option value="overig">Overig</option></select></label></div>
    <label>Titel<input name="title" required minLength={5} maxLength={140} placeholder="Geef je bijdrage een titel"/></label>
    <label>{kind === "photo" ? "Bijschrift en context" : "Je bericht"}<textarea name="body" required minLength={20} maxLength={3000} rows={3} placeholder="Wat wil je delen? Geef genoeg context…"/></label>
    {kind === "photo" ? <div className="photo-upload"><label>Foto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => {
      const selected = event.target.files?.[0] ?? null;
      const valid = !selected || (selected.size <= MAX_PHOTO_BYTES && ["image/jpeg","image/png","image/webp"].includes(selected.type));
      event.target.setCustomValidity(valid ? "" : "Kies een JPG, PNG of WebP van maximaal 3 MB.");
      event.target.reportValidity(); changePhoto(valid ? selected : null);
    }}/><small>JPG, PNG of WebP · maximaal 3 MB · wordt openbaar bij publicatie.</small></label>
    {preview ? <Image unoptimized className="photo-preview" src={preview} width={640} height={400} alt="Voorbeeld van je gekozen foto"/> : null}
    <label>Beschrijving van de foto<input name="photoAlt" required minLength={5} maxLength={300} placeholder="Beschrijf wat zichtbaar is, ook voor schermlezers"/></label><small>Plaats alleen foto’s die je mag delen. Deel geen privégegevens.</small></div> : null}
    <label>Openbare bron {kind !== "post" ? "(optioneel)" : ""}<input name="sourceUrl" type="url" required={kind === "post"} maxLength={2048} placeholder="https://…"/></label>
    <p className="composer-guidance">{kind === "post" ? "Een bron maakt je claim controleerbaar, niet automatisch waar." : "Een eigen mededeling of foto kan zonder bron. Doe je een feitelijke claim over iemand? Voeg dan een openbare bron toe."}</p>
  </>;
}
