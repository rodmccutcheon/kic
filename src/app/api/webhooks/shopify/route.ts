import { NextRequest, NextResponse } from "next/server";
import { ShopifyOrderPayload } from "@/types";
import { ingestEvent } from "@/lib/ingest";

export async function POST(req: NextRequest) {
  let body: ShopifyOrderPayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !body.shopify_customer_id || !body.created_at) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await ingestEvent([], {
      externalId: body.id,
      source: "mindbody",
      type: "booking.created",
      payload: body,
      occurredAt: new Date(body.created_at),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
