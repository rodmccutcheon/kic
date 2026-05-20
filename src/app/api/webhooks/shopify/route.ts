import { NextRequest, NextResponse } from "next/server";
import { RawSignal, ShopifyOrderPayload } from "@/types";
import { ingestEvent } from "@/lib/ingest";
import { toE164 } from "@/lib/util/phone";

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

  const signals: RawSignal[] = [
    { type: "shopify_customer_id", value: body.shopify_customer_id },
  ];
  if (body.email) signals.push({ type: "email", value: body.email.trim().toLowerCase() });
  const phone = body.phone ? toE164(body.phone) : null;
  if (phone) signals.push({ type: "phone", value: phone });
  if (body.device_id) signals.push({ type: "device_id", value: body.device_id });

  try {
    await ingestEvent(signals, {
      externalId: body.id,
      source: "shopify",
      type: "order.created",
      payload: body,
      occurredAt: new Date(body.created_at),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
