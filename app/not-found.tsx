import Link from "next/link";
export default function NotFound() { return <main className="social-empty"><h1>Niet gevonden.</h1><p>Dit bericht, profiel of gesprek is niet beschikbaar.</p><Link className="button" href="/feed">Naar de tijdlijn</Link></main>; }
