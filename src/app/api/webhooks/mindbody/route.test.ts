import { describe, it, expect, vi } from "vitest";
import {NextRequest} from "next/server";
import {POST} from "./route";
import { resolveIdentity } from "@/lib/identity";

vi.mock("@/lib/identity", () => ({
  resolveIdentity: vi.fn().mockResolvedValue("customer_123"),
}));

const validPayload = {
  id: "mb_booking_001",
  mindbody_client_id: "mb_client_001",
  client_email: "jane.doe@gmail.com",
  phone: "+61412345678",
  class_name: "Reformer Pilates",
  scheduled_at: "2024-11-05T08:00:00Z",
  studio: "KIC South Yarra",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/mindbody", {
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
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON" });
  });

  it("returns 400 when id is missing", async () => {
    const { id: _, ...noId } = validPayload;
    const res = await POST(makeRequest(noId));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing required fields" });
  });

  it("returns 400 when mindbody_client_id is missing", async () => {
    const { mindbody_client_id: _, ...noClientId } = validPayload;
    const res = await POST(makeRequest(noClientId));
    expect(res.status).toBe(400);
  });

  it("returns 400 when scheduled_at is missing", async () => {
    const { scheduled_at: _, ...noDate } = validPayload;
    const res = await POST(makeRequest(noDate));
    expect(res.status).toBe(400);
  });

  it("returns 200 and received:true for a valid payload", async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("passes all three signals to resolveIdentity", async () => {
    await POST(makeRequest(validPayload));
    expect(resolveIdentity).toHaveBeenCalledWith([
      { type: "mindbody_client_id", value: "mb_client_001" },
      { type: "email", value: "jane.doe@gmail.com" },
      { type: "phone", value: "+61412345678" },
    ]);
  });
});