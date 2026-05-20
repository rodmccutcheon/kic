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

const mockCustomer = {
  id: "customer_123",
  createdAt: new Date("2024-11-01T10:00:00Z"),
  updatedAt: new Date("2024-11-01T10:00:00Z"),
  customerSignals: [
    {
      signalId: "sig_1",
      customerId: "customer_123",
      signal: { id: "sig_1", type: "email", value: "jane@example.com", createdAt: new Date() },
    },
    {
      signalId: "sig_2",
      customerId: "customer_123",
      signal: { id: "sig_2", type: "phone", value: "+61412345678", createdAt: new Date() },
    },
  ],
  events: [
    {
      eventId: "evt_1",
      customerId: "customer_123",
      event: { id: "evt_1", source: "shopify", type: "orders/created", externalId: "order_001", payload: "{}", occurredAt: new Date("2024-11-10T00:00:00Z"), createdAt: new Date() },
    },
    {
      eventId: "evt_2",
      customerId: "customer_123",
      event: { id: "evt_2", source: "mindbody", type: "booking.created", externalId: "mb_001", payload: "{}", occurredAt: new Date("2024-11-05T00:00:00Z"), createdAt: new Date() },
    },
  ],
  mergesAsCanonical: [],
};

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

  describe("happy path", () => {
    beforeEach(() => {
      vi.mocked(prisma.identitySignal.findFirst).mockResolvedValue(mockSignal);
      vi.mocked(prisma.customerSignal.findFirst).mockResolvedValue(mockCustomerSignal);
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never);
    });

    it("returns 200 with the customer", async () => {
      const res = await GET(makeRequest("jane@example.com"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe("customer_123");
    });

    it("looks up the signal by the trimmed query value", async () => {
      await GET(makeRequest("  jane@example.com  "));
      expect(prisma.identitySignal.findFirst).toHaveBeenCalledWith({
        where: { value: "jane@example.com" },
        select: { id: true },
      });
    });

    it("looks up the customer link by signal id", async () => {
      await GET(makeRequest("jane@example.com"));
      expect(prisma.customerSignal.findFirst).toHaveBeenCalledWith({
        where: { signalId: "signal_123" },
        select: { customerId: true },
      });
    });

    it("fetches the customer with signals, events, and merges included", async () => {
      await GET(makeRequest("jane@example.com"));
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: "customer_123" },
        include: {
          customerSignals: { include: { signal: true } },
          events: { include: { event: true } },
          mergesAsCanonical: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    it("flattens signals in the response", async () => {
      const res = await GET(makeRequest("jane@example.com"));
      const body = await res.json();
      expect(body.signals).toHaveLength(2);
      expect(body.signals[0]).toMatchObject({ type: "email", value: "jane@example.com" });
    });

    it("flattens and sorts events by occurredAt descending", async () => {
      const res = await GET(makeRequest("jane@example.com"));
      const body = await res.json();
      expect(body.events).toHaveLength(2);
      expect(body.events[0].source).toBe("shopify"); // 2024-11-10 comes before 2024-11-05
    });

    it("works for a phone number query", async () => {
      await GET(makeRequest("+61412345678"));
      expect(prisma.identitySignal.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({ where: { value: "+61412345678" } })
      );
    });
  });
});