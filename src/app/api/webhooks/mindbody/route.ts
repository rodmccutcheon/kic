import { NextRequest, NextResponse } from "next/server";
import {MindbodyBookingPayload} from "@/types";

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

  return NextResponse.json({ received: true });
}
