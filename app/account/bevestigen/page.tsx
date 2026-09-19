import Link from "next/link";
import { redirect } from "next/navigation";
import { requestEmailCheck } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function EmailCheckPage({ searchParams }: Props) {
  const supabase = await createClient();
  const [{ data: { user }, error }, params] = await Promise.all([
    supabase.auth.getUser(),
    searchParams,
  ]);
  if (error || !user) redirect("/login");

  return (
    <main className="account-page">
      <div className="auth-card">
        <p className="eyebrow">Je bent ingelogd</p>
        <h1>Je account is klaar.</h1>
        <p>Je kunt Vardena meteen gebruiken. Je e-mailadres controleren is optioneel: vraag een link aan of kies ‘Doe later’.</p>
        <p className="account-email">{user.email}</p>
        {params.error ? <p className="notice error" role="alert">{params.error} Je kunt met ‘Doe later’ gewoon verder.</p> : null}
        {params.sent === "1" ? (
          <p className="notice success" role="status">De e-maillink is aangevraagd. Controleer ook je spammap en open de link in deze browser. Je hoeft hier niet op te wachten.</p>
        ) : null}
        <form action={requestEmailCheck}>
          <button className="button full" type="submit">{params.sent === "1" ? "E-maillink opnieuw aanvragen" : "Stuur mij een e-maillink"}</button>
        </form>
        <Link className="button ghost full defer-email" href="/feed">Doe later</Link>
        <p className="account-hint">Je vindt deze optie later terug via ‘Account’ bovenaan de website.</p>
      </div>
    </main>
  );
}
