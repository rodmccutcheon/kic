import { describe, expect, it, vi, beforeEach } from "vitest";
import { ingestEvent } from "./ingest";
import { EventDescriptor, RawSignal } from "@/types";

const { mockFindUnique, mockCreate, mockUpsert } = vi.hoisted(() => {
  const mockFindUnique = vi.fn().mockResolvedValue(null);
  const mockCreate = vi.fn().mockResolvedValue({ id: "evt_001" });
  const mockUpsert = vi.fn().mockResolvedValue({});
  return { mockFindUnique, mockCreate, mockUpsert };
});

vi.mock("./identity", () => ({
  resolveIdentity: vi.fn().mockResolvedValue("cust_001"),
}));

vi.mock("./db", () => ({
  prisma: {
    $transaction: vi.fn().mockImplementation(
      (cb: (tx: {
        event: { findUnique: typeof mockFindUnique; create: typeof mockCreate };
        customerEvent: { upsert: typeof mockUpsert };
      }) => Promise<void>) =>
        cb({ event: { findUnique: mockFindUnique, create: mockCreate }, customerEvent: { upsert: mockUpsert } }),
    ),
  },
}));

const signals: RawSignal[] = [{ type: "email", value: "jane@example.com" }];
const descriptor: EventDescriptor = {
  externalId: "mb_booking_001",
  source: "mindbody",
  type: "booking.created",
  payload: {},
  occurredAt: new Date("2024-11-05T08:00:00Z"),
};

describe("ingestEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the event with correct fields", async () => {
    await ingestEvent(signals, descriptor);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "mindbody",
        type: "booking.created",
        externalId: "mb_booking_001",
        occurredAt: new Date("2024-11-05T08:00:00Z"),
      }),
    });
  });

  it("associates the event to a customer", async () => {
    await ingestEvent(signals, descriptor);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { customerId_eventId: { customerId: "cust_001", eventId: "evt_001" } },
      create: { customerId: "cust_001", eventId: "evt_001" },
      update: {},
    });
  });

  it("no-op if the event already exists", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "evt_001" });

    await ingestEvent(signals, descriptor);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
