import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFeedStatus } from "@/lib/posts";
import { feedFingerprint, feedTopic, feedType, feedSearch } from "@/lib/feed-types";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams, supabase = await createClient();
  const result = await readFeedStatus(supabase, 1, params.get("sort") !== "nieuw", feedType(params.get("type") ?? undefined), feedTopic(params.get("onderwerp") ?? undefined), feedSearch(params.get("q") ?? undefined));
  const headers = { "Cache-Control": "private, no-store" };
  if (result.error) return NextResponse.json({ error: "De feed kan nu niet worden bijgewerkt." }, { status: 503, headers });
  return NextResponse.json({ fingerprint: feedFingerprint(result.data ?? [], result.count) }, { headers });
}
