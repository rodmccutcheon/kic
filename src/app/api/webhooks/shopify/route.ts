import { NextRequest, NextResponse } from "next/server";
import {ShopifyOrderPayload} from "@/types";

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

  return NextResponse.json({ received: true });
}
