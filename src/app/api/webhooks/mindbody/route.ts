import { NextRequest, NextResponse } from "next/server";
import { MindbodyBookingPayload, RawSignal } from "@/types";
import { ingestEvent } from "@/lib/ingest";
import { toE164 } from "@/lib/util/phone";

export async function POST(req: NextRequest) {
  let body: MindbodyBookingPayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !body.mindbody_client_id || !body.scheduled_at) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const signals: RawSignal[] = [
    { type: "mindbody_client_id", value: body.mindbody_client_id },
  ];
  if (body.client_email) signals.push({ type: "email", value: body.client_email.trim().toLowerCase() });
  const phone = body.phone ? toE164(body.phone) : null;
  if (phone) signals.push({ type: "phone", value: phone });

  try {
    await ingestEvent(signals, {
      externalId: body.id,
      source: "mindbody",
      type: "booking.created",
      payload: body,
      occurredAt: new Date(body.scheduled_at),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
