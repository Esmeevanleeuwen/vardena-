import { AuthForm } from "@/components/auth-form";
type Props={searchParams:Promise<{error?:string;type?:string;next?:string}>};
export default async function SignupPage({searchParams}:Props){const params=await searchParams;return <main className="auth-page"><div className="auth-aside"><span>V</span><blockquote>“Een archief wordt sterker wanneer iedere bewering terug naar haar bron leidt.”</blockquote></div><AuthForm mode="signup" error={params.error} organization={params.type==="organisatie"} next={params.next}/></main>;}
