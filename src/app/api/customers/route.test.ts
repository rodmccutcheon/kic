import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(q?: string) {
  const url = q
    ? `http://localhost/api/customers?q=${encodeURIComponent(q)}`
    : "http://localhost/api/customers";
  return new NextRequest(url);
}

describe("GET /api/customers", () => {
  describe("validation", () => {
    it("returns 400 when q is missing", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({error: "Missing query parameter: q"});
    });

    it("returns 400 when q is blank", async () => {
      const res = await GET(makeRequest("   "));
      expect(res.status).toBe(400);
    });
  });
});