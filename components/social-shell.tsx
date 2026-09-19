import Link from "next/link";
import { SocialIcon, type IconName } from "./social-icon";
export function SocialShell({ children, active = "feed", signedIn = false }: { children: React.ReactNode; active?: string; signedIn?: boolean }) {
  const links: { href: string; label: string; icon: IconName; key: string }[] = [
    { href: "/feed", label: "Tijdlijn", icon: "home", key: "feed" },
    { href: "/mensen", label: "Mensen", icon: "users", key: "people" },
    { href: "/inbox", label: "Inbox", icon: "mail", key: "inbox" },
    { href: "/account/profiel", label: "Mijn profiel", icon: "person", key: "profile" },
  ];
  return <main className="social-shell"><aside className="social-sidebar"><nav aria-label="Sociale navigatie" className="social-nav">{links.map(link => <Link key={link.key} href={link.href} className={active === link.key ? "active" : ""} aria-current={active === link.key ? "page" : undefined}><SocialIcon name={link.icon}/><span>{link.label}</span></Link>)}</nav><Link className="button social-compose-link" href={signedIn ? "/feed#nieuw" : "/signup"}>{signedIn ? "Plaats bericht" : "Doe mee"}</Link></aside><div className="social-main">{children}</div><aside className="social-context"><div className="context-card"><p className="eyebrow">Vardena</p><h2>Een gesprek begint bij een bron.</h2><p>Ontdek bijdragen, geef je mening en zoek elkaar op.</p><Link className="text-link" href="/mensen">Ontdek mensen →</Link></div><div className="context-card quiet"><h3>Jouw inbox</h3><p>Stuur iemand een privébericht. Alleen jullie twee kunnen het gesprek bekijken.</p><Link className="text-link" href="/inbox">Open inbox →</Link></div></aside></main>;
}
