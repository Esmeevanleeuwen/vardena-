"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/return-path";
import { publishPost } from "@/lib/publish-post";
import type { ActionState } from "@/lib/organization-types";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const confirmationMessage = "Log in met je e-mailadres en wachtwoord. Heb je al een account? Gebruik dan je bestaande wachtwoord. Als voor dit account nog een bevestiging nodig is, kun je hieronder een nieuwe mail aanvragen.";
const confirmationUrl = () => new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString();

function emailError(error: { code?: string; status?: number }) {
  console.error("[auth] Email request failed", { code: error.code, status: error.status });
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "Er zijn te veel e-mails aangevraagd. Probeer het later opnieuw.";
  }
  if (error.code === "email_address_not_authorized") {
    return "De e-maildienst kan dit adres nog niet bereiken. De beheerder moet de mailinstellingen controleren.";
  }
  if (error.code === "weak_password") return "Kies een sterker wachtwoord van minimaal 8 tekens.";
  return "De aanvraag is niet gelukt. Probeer het later opnieuw. Blijft dit gebeuren, meld het dan bij de beheerder.";
}

export async function signUp(data: FormData) {
  const organization = field(data,"accountType") === "organization";
  const next = organization ? "/organisaties/nieuw" : safeReturnPath(field(data,"next"));
  const signupError = `/signup?type=${organization ? "organisatie" : "persoon"}&next=${encodeURIComponent(next)}&error=`;
  const email=field(data,"email"), password=String(data.get("password") ?? ""), displayName=field(data,"displayName");
  const username=field(data,"username").toLowerCase().replace(/[^a-z0-9_]/g,"");
  if(!validEmail(email)||password.length<8||!displayName||displayName.length>80||username.length<3||username.length>30) redirect(signupError+"Vul+alle+velden+goed+in.");
  const supabase=await createClient();
  const { data: auth, error }=await supabase.auth.signUp({email,password,options:{
    emailRedirectTo:confirmationUrl(),
    data:{display_name:displayName,username}
  }});
  // Keep the public response neutral: Supabase can conceal existing accounts.
  if(error?.code === "user_already_exists" || error?.code === "email_exists") {
    redirect("/login?next="+encodeURIComponent(next)+"&message="+encodeURIComponent(confirmationMessage));
  }
  if(error) redirect(signupError+encodeURIComponent(emailError(error)));
  if(auth.session) {
    const { error: profileError } = await supabase.from("vardena_members").upsert({ id: auth.session.user.id, username, display_name: displayName, bio: "" }, { onConflict: "id" });
    if(profileError) redirect("/account/profiel");
    revalidatePath("/","layout");
    redirect(next !== "/feed" ? next : "/account/bevestigen");
  }
  if(!auth.user) redirect("/signup?error=Registratie+kon+niet+worden+afgerond.+Probeer+het+opnieuw.");
  console.info("[auth] Signup without session", {
    hasIdentity: (auth.user.identities?.length ?? 0) > 0,
    confirmationRequested: Boolean(auth.user.confirmation_sent_at),
  });
  redirect("/login?next="+encodeURIComponent(next)+"&message="+encodeURIComponent(confirmationMessage));
}

export async function requestEmailCheck() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) redirect("/login?error=Log+eerst+in.");

  // With auto-confirm enabled, signup resends do not verify ownership.
  // A magic link lets the signed-in user check their own email optionally.
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false, emailRedirectTo: confirmationUrl() },
  });
  if (error) redirect("/account/bevestigen?error=" + encodeURIComponent(emailError(error)));
  redirect("/account/bevestigen?sent=1");
}

export async function resendConfirmation(data: FormData) {
  const email=field(data,"email");
  if(!validEmail(email)) redirect("/login?error=Vul+een+geldig+e-mailadres+in.");
  const supabase=await createClient();
  const { error }=await supabase.auth.resend({
    type:"signup", email, options:{emailRedirectTo:confirmationUrl()}
  });
  if(error) redirect("/login?error="+encodeURIComponent(emailError(error)));
  redirect("/login?message="+encodeURIComponent("Als dit adres een account heeft dat nog bevestigd moet worden, is opnieuw een bevestigingsmail aangevraagd. Controleer ook je spammap en open de link in dezelfde browser. Is je account al bevestigd? Log dan in met je bestaande wachtwoord."));
}

export async function login(data: FormData) {
  const requestedNext = field(data,"next");
  const next = safeReturnPath(requestedNext);
  const errorUrl = "/login?next=" + encodeURIComponent(next) + "&error=";
  const supabase=await createClient();
  const { error }=await supabase.auth.signInWithPassword({email:field(data,"email"),password:String(data.get("password") ?? "")});
  if(error?.code === "email_not_confirmed") redirect(errorUrl+encodeURIComponent("Bevestig eerst je e-mailadres. Onder het formulier kun je de bevestigingsmail opnieuw aanvragen."));
  if(error) redirect(errorUrl+encodeURIComponent("E-mailadres of wachtwoord is onjuist."));
  revalidatePath("/","layout");
  redirect(next);
}

export async function logout() {
  const supabase=await createClient();
  await supabase.auth.signOut();
  revalidatePath("/","layout");
  redirect("/");
}

export async function createPost(_state: ActionState, data: FormData): Promise<ActionState> {
  const supabase=await createClient();
  const { data: auth, error: authError }=await supabase.auth.getUser();
  const userId=authError ? undefined : auth.user?.id;
  if(!userId) return { error: "Je sessie is verlopen. Log opnieuw in om te publiceren." };
  const result = await publishPost(supabase, userId, data, field(data,"organizationId") || null);
  if (result.error) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath("/organisaties", "layout");
  redirect(`/feed?sort=nieuw&geplaatst=${result.id}&message=Je+bericht+is+geplaatst.`);
}
