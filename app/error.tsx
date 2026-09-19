"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="social-empty"><h1>Deze pagina laden lukt even niet.</h1><p>Je kunt het opnieuw proberen.</p><button className="button" onClick={reset}>Opnieuw proberen</button><p><Link href="/feed">Terug naar de tijdlijn</Link></p></main>;
}
