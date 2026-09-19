import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import "./globals.css";

export const metadata:Metadata={title:"Vardena — Publieke macht zichtbaar",description:"Een openbaar platform voor controleerbare dossiers over macht en invloed."};

export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 const supabase=await createClient();
 const {data}=await supabase.auth.getClaims();
 const signedIn=Boolean(data?.claims?.sub);
 return <html lang="nl"><body><header className="site-header"><Link className="brand" href="/">VARDENA<span>.</span></Link><nav><Link href="/#onderzoek">Onderzoek</Link><Link href="/feed">Berichten</Link><Link href="/#werkwijze">Werkwijze</Link></nav><div className="header-actions">{signedIn?<><Link className="plain-link" href="/feed#nieuw">Plaats bericht</Link><form action={logout}><button className="button small ghost">Uitloggen</button></form></>:<><Link className="plain-link" href="/login">Inloggen</Link><Link className="button small" href="/signup">Account maken</Link></>}</div></header>{children}<footer><Link className="brand" href="/">VARDENA<span>.</span></Link><p>Publieke macht, controleerbaar gemaakt.</p><div><Link href="/#werkwijze">Redactionele regels</Link><a href="mailto:correcties@vardena.nl">Correcties</a></div></footer></body></html>;
}
