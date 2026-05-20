import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  return NextResponse.json({ customers: [] });
}
