"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export async function signUp(data: FormData) {
  const email=field(data,"email"), password=field(data,"password"), displayName=field(data,"displayName");
  const username=field(data,"username").toLowerCase().replace(/[^a-z0-9_]/g,"");
  if(!email||password.length<8||!displayName||username.length<3) redirect("/signup?error=Vul+alle+velden+goed+in.");
  const supabase=await createClient();
  const { error }=await supabase.auth.signUp({email,password,options:{
    emailRedirectTo:(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")+"/auth/callback",
    data:{display_name:displayName,username}
  }});
  if(error) redirect("/signup?error="+encodeURIComponent(error.message));
  redirect("/login?message=Controleer+je+e-mail+om+je+account+te+bevestigen.");
}

export async function login(data: FormData) {
  const supabase=await createClient();
  const { error }=await supabase.auth.signInWithPassword({email:field(data,"email"),password:field(data,"password")});
  if(error) redirect("/login?error=E-mailadres+of+wachtwoord+is+onjuist.");
  revalidatePath("/","layout");
  redirect("/feed");
}

export async function logout() {
  const supabase=await createClient();
  await supabase.auth.signOut();
  revalidatePath("/","layout");
  redirect("/");
}

export async function createPost(data: FormData) {
  const supabase=await createClient();
  const { data: auth }=await supabase.auth.getClaims();
  const userId=auth?.claims?.sub;
  if(!userId) redirect("/login?error=Log+eerst+in.");
  const subject_name=field(data,"subjectName"),title=field(data,"title"),body=field(data,"body");
  const category=field(data,"category"),source_url=field(data,"sourceUrl");
  if(subject_name.length<2||title.length<5||body.length<20||!source_url.startsWith("https://")) redirect("/feed?error=Vul+alle+velden+en+een+geldige+https-bron+in.#nieuw");
  const { error }=await supabase.from("posts").insert({author_id:userId,subject_name,title,body,category,source_url});
  if(error) redirect("/feed?error="+encodeURIComponent(error.message)+"#nieuw");
  revalidatePath("/");
  revalidatePath("/feed");
  redirect("/feed?message=Je+bericht+is+geplaatst.");
}
