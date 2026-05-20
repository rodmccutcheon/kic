import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

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
});