import { NextRequest, NextResponse } from "next/server";
import {MindbodyBookingPayload, RawSignal} from "@/types";
import {resolveIdentity} from "@/lib/identity";

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
  if (body.client_email) signals.push({ type: "email", value: body.client_email });
  if (body.phone) signals.push({ type: "phone", value: body.phone });

  try {
    await resolveIdentity(signals);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
