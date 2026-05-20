import {describe, expect, it, vi} from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ingestEvent } from "@/lib/ingest";

vi.mock("@/lib/ingest", () => ({
  ingestEvent: vi.fn(),
}));

const validPayload = {
  id: "shopify_order_001",
  shopify_customer_id: "cust_shopify_001",
  email: "jane.doe@example.com",
  phone: "+61412345678",
  device_id: "device_abc123",
  created_at: "2024-11-01T10:00:00Z",
  total_price: "89.00",
  line_items: [{ title: "KIC Resistance Band", quantity: 1 }],
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/shopify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/webhooks/mindbody", () => {
  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/mindbody", {
      method: "POST",
      body: "not-json",
      headers: {"Content-Type": "application/json"},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({error: "Invalid JSON"});
  });

  it("returns 400 when id is missing", async () => {
    const { id: _, ...noId } = validPayload;
    const res = await POST(makeRequest(noId));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing required fields" });
  });

  it("returns 400 when shopify_customer_id is missing", async () => {
    const { shopify_customer_id: _, ...noCustomerId } = validPayload;
    const res = await POST(makeRequest(noCustomerId));
    expect(res.status).toBe(400);
  });

  it("returns 400 when created_at is missing", async () => {
    const { shopify_customer_id: _, ...noDate } = validPayload;
    const res = await POST(makeRequest(noDate));
    expect(res.status).toBe(400);
  });

  it("returns 500 when ingestEvent throws", async () => {
    vi.mocked(ingestEvent).mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });

  it("returns 200 and received:true for a valid payload", async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("passes all four signals to ingestEvent", async () => {
    await POST(makeRequest(validPayload));
    expect(ingestEvent).toHaveBeenCalledWith(
      [
        { type: "shopify_customer_id", value: "cust_shopify_001" },
        { type: "email", value: "jane.doe@example.com" },
        { type: "phone", value: "+61412345678" },
        { type: "device_id", value: "device_abc123" },
      ],
      expect.objectContaining({ externalId: "shopify_order_001", source: "shopify" }),
    );
  });

  it("omits email signal when client_email is absent", async () => {
    const { email: _, ...noEmail } = validPayload;
    await POST(makeRequest(noEmail));
    expect(ingestEvent).toHaveBeenCalledWith(
      [
        { type: "shopify_customer_id", value: "cust_shopify_001" },
        { type: "phone", value: "+61412345678" },
        { type: "device_id", value: "device_abc123" },
      ],
      expect.objectContaining({ externalId: "shopify_order_001", source: "shopify" }),
    );
  });

  it("omits phone signal when phone is absent", async () => {
    const { phone: _, ...noPhone } = validPayload;
    await POST(makeRequest(noPhone));
    expect(ingestEvent).toHaveBeenCalledWith(
      [
        { type: "shopify_customer_id", value: "cust_shopify_001" },
        { type: "email", value: "jane.doe@example.com" },
        { type: "device_id", value: "device_abc123" },
      ],
      expect.objectContaining({ externalId: "shopify_order_001", source: "shopify" }),
    );
  });

  it("omits device_id signal when device_id is absent", async () => {
    const { device_id: _, ...noDeviceId } = validPayload;
    await POST(makeRequest(noDeviceId));
    expect(ingestEvent).toHaveBeenCalledWith(
      [
        { type: "shopify_customer_id", value: "cust_shopify_001" },
        { type: "email", value: "jane.doe@example.com" },
        { type: "phone", value: "+61412345678" },
      ],
      expect.objectContaining({ externalId: "shopify_order_001", source: "shopify" }),
    );
  });
});