import { AuthForm } from "@/components/auth-form";
type Props={searchParams:Promise<{error?:string;message?:string}>};
export default async function LoginPage({searchParams}:Props){const params=await searchParams;return <main className="auth-page"><div className="auth-aside"><span>V</span><blockquote>“Openbaarheid begint waar invloed een spoor achterlaat.”</blockquote></div><AuthForm mode="login" error={params.error} message={params.message}/></main>;}
