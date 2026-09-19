import Link from "next/link";
import { SocialIcon, type IconName } from "./social-icon";
export function SocialShell({ children, active = "feed", signedIn = false, context, discovery = false }: { children: React.ReactNode; active?: string; signedIn?: boolean; context?: React.ReactNode; discovery?: boolean }) {
  const links: { href: string; label: string; icon: IconName; key: string }[] = [
    { href: "/feed", label: "Home", icon: "home", key: "feed" },
    { href: "/organisaties", label: "Organisaties", icon: "building", key: "organizations" },
    { href: "/mensen", label: "Mensen", icon: "users", key: "people" },
    { href: "/inbox", label: "Inbox", icon: "mail", key: "inbox" },
    { href: "/opgeslagen", label: "Opgeslagen", icon: "bookmark", key: "saved" },
    { href: "/account/profiel", label: "Mijn profiel", icon: "person", key: "profile" },
  ];
  return <main className={`social-shell${discovery ? " discovery-shell" : ""}`}><aside className="social-sidebar"><p className="sidebar-label">Jouw plek voor inzicht</p><nav aria-label="Sociale navigatie" className="social-nav">{links.map(link => <Link key={link.key} href={link.href} className={active === link.key ? "active" : ""} aria-current={active === link.key ? "page" : undefined}><SocialIcon name={link.icon}/><span>{link.label}</span></Link>)}</nav><Link className="button social-compose-link" href={signedIn ? "/feed#nieuw" : "/signup"}>{signedIn ? "+ Plaats bericht" : "Doe mee"}</Link><p className="sidebar-footnote">Open bronnen.<br/>Echte gesprekken.</p></aside><div className="social-main">{children}</div><aside className="social-context">{context ?? <><div className="context-card"><p className="eyebrow">Vardena</p><h2>Transparantie begint bij de bron.</h2><p>Lees openbare bijdragen en bekijk de standpunten van organisaties. De volgorde van de tijdlijn is voor iedereen gelijk.</p><Link className="text-link" href="/over">Hoe werkt Vardena? →</Link></div><div className="context-card quiet"><h3>Samen onderzoeken</h3><p>Sluit je aan bij een organisatie of geef je eigen collectief een plek.</p><Link className="text-link" href="/organisaties">Ontdek organisaties →</Link></div></>}</aside></main>;
}
