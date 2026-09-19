import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import "./globals.css";
import "./organizations.css";

export const metadata:Metadata={title:"Vardena — Publieke macht zichtbaar",description:"Een openbaar platform voor controleerbare dossiers over macht en invloed."};

export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 const supabase=await createClient();
 const {data}=await supabase.auth.getClaims();
 const signedIn=Boolean(data?.claims?.sub);
 const unread = signedIn ? await supabase.from("vardena_messages").select("id", {count:"exact",head:true}).eq("recipient_id",data!.claims.sub).is("read_at",null) : {count:0};
 return <html lang="nl"><body><header className="site-header"><Link className="brand" href="/">VARDENA<span>.</span></Link><nav><Link href="/">Home</Link><Link href="/feed">Tijdlijn</Link><Link href="/organisaties">Organisaties</Link></nav><div className="header-actions">{signedIn?<><Link className="account-link inbox-header-link" href="/inbox">Inbox{unread.count?<span className="unread-badge">{unread.count>99?"99+":unread.count}</span>:null}</Link><Link className="account-link" href="/account/profiel">Account</Link><form action={logout}><button className="button small ghost">Uitloggen</button></form></>:<><Link className="plain-link" href="/login">Inloggen</Link><Link className="button small" href="/signup">Account maken</Link></>}</div></header>{children}<footer><Link className="brand" href="/">VARDENA<span>.</span></Link><p>Publieke macht, controleerbaar gemaakt.</p><div><Link href="/over">Transparantie</Link><a href="mailto:correcties@vardena.nl">Correcties</a></div></footer></body></html>;
}
