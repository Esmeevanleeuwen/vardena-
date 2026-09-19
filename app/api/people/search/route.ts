import { NextRequest, NextResponse } from "next/server";
import { searchWikipediaPeople } from "@/lib/wikipedia";
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.replace(/^@/, "").trim() ?? "";
  if (q.length < 2 || q.length > 100) return NextResponse.json({ people: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try { return NextResponse.json({ people: await searchWikipediaPeople(q) }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }); }
  catch { return NextResponse.json({ error: "Wikipedia zoeken lukt nu niet. Probeer het opnieuw; je lijst blijft staan." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
