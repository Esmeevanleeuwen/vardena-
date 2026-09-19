import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/social-types";
import { readGroupMessages } from "@/lib/organizations";
import { pageNumber } from "@/lib/organization-types";
const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!isUuid(id))return Response.json({error:"Ongeldige groep."},{status:400,headers});
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return Response.json({error:"Log opnieuw in."},{status:401,headers});
  const member=await supabase.from("vardena_org_members").select("status").eq("org_id",id).eq("user_id",user.id).maybeSingle();
  if(member.error)return Response.json({error:"Groep laden lukt niet."},{status:503,headers});
  if(member.data?.status!=="active")return Response.json({error:"Geen toegang."},{status:403,headers});
  const result=await readGroupMessages(supabase,id,pageNumber(new URL(request.url).searchParams.get("pagina")??undefined));
  if(result.error)return Response.json({error:"Berichten laden lukt niet."},{status:503,headers});
  return Response.json({messages:result.messages},{headers});
}
