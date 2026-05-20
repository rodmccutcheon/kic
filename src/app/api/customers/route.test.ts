import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    identitySignal: {
      findFirst: vi.fn(),
    },
    customerSignal: {
      findFirst: vi.fn(),
    },
    mergeRecord: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    customer: {
      findUnique: vi.fn(),
    },
  },
}));

const mockSignal = { id: "signal_123" } as never;
const mockCustomerSignal = { customerId: "customer_123" } as never;

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

  describe("not found", () => {
    it("returns 404 when no signal matches the query", async () => {
      vi.mocked(prisma.identitySignal.findFirst).mockResolvedValue(null);
      const res = await GET(makeRequest("unknown@example.com"));
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ error: "No customer found" });
    });

    it("returns 404 when signal exists but no customer is linked", async () => {
      vi.mocked(prisma.identitySignal.findFirst).mockResolvedValue(mockSignal);
      vi.mocked(prisma.customerSignal.findFirst).mockResolvedValue(null);
      const res = await GET(makeRequest("jane@example.com"));
      expect(res.status).toBe(404);
    });

    it("returns 404 when customer record is missing", async () => {
      vi.mocked(prisma.identitySignal.findFirst).mockResolvedValue(mockSignal);
      vi.mocked(prisma.customerSignal.findFirst).mockResolvedValue(mockCustomerSignal);
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);
      const res = await GET(makeRequest("jane@example.com"));
      expect(res.status).toBe(404);
    });
  });
});