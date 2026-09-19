import Link from "next/link";
import { login,resendConfirmation,signUp } from "@/app/actions";
import { safeReturnPath } from "@/lib/return-path";
export function AuthForm({mode,error,message,next,organization=false}:{mode:"login"|"signup";error?:string;message?:string;next?:string;organization?:boolean}){
  const signup=mode==="signup",returnPath=organization?"/organisaties/nieuw":safeReturnPath(next);
  return <div className="auth-card"><p className="eyebrow">{signup?"Word deelnemer":"Welkom terug"}</p><h1>{signup?"Maak je account.":"Log in bij Vardena."}</h1><p>{signup?"Maak een account en ga direct verder. Je kunt e-mailbevestiging later doen.":"Ga verder met onderzoeken, bronnen en bijdragen."}</p>
    {error?<p className="notice error" role="alert">{error}</p>:null}{message?<p className="notice success" role="status">{message}</p>:null}
    <form action={signup?signUp:login}><input name="next" type="hidden" value={signup?safeReturnPath(next):returnPath}/>
      {signup?<><fieldset className="account-type"><legend>Hoe wil je beginnen?</legend><label><input type="radio" name="accountType" value="personal" defaultChecked={!organization}/><span>Als persoon</span></label><label><input type="radio" name="accountType" value="organization" defaultChecked={organization}/><span>Met een organisatie</span></label></fieldset><p className="small-copy muted">Een organisatie beheer je met je eigen account. Na registratie vul je het organisatieprofiel in.</p><label>Naam<input name="displayName" autoComplete="name" required maxLength={80} placeholder="Je publieke naam"/></label><label>Gebruikersnaam<input name="username" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" placeholder="gebruikersnaam"/></label></>:null}
      <label>E-mailadres<input name="email" type="email" autoComplete="email" required placeholder="naam@voorbeeld.nl"/></label><label>Wachtwoord<input name="password" type="password" autoComplete={signup?"new-password":"current-password"} required minLength={8} placeholder="Minimaal 8 tekens"/></label><button className="button full" type="submit">{signup?"Account maken":"Inloggen"}</button>
    </form>
    <p className="auth-switch">{signup?"Heb je al een account?":"Nog geen account?"} <Link href={`${signup?"/login":"/signup"}?next=${encodeURIComponent(returnPath)}`}>{signup?"Inloggen":"Account maken"}</Link></p>
    {!signup?<details><summary className="text-link">Geen bevestigingsmail ontvangen?</summary><p>Nieuwe accounts kunnen direct inloggen. Heb je een ouder account waarvoor nog bevestiging nodig is? Vraag de mail hieronder opnieuw aan.</p><form action={resendConfirmation}><label>E-mailadres voor bevestiging<input name="email" type="email" autoComplete="email" required placeholder="naam@voorbeeld.nl"/></label><button className="button ghost full" type="submit">Bevestigingsmail opnieuw aanvragen</button></form></details>:null}
  </div>;
}
