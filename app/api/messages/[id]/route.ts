import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid, messageFields } from "@/lib/social-types";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ongeldig gesprek." }, { status: 400, headers });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401, headers });
  const { data, error } = await supabase.from("vardena_messages").select(messageFields).or(`and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Berichten laden lukt niet." }, { status: 503, headers });
  return NextResponse.json({ messages: (data ?? []).reverse() }, { headers });
}
